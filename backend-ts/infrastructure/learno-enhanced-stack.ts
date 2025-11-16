import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as eventsTargets from 'aws-cdk-lib/aws-events-targets';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class LearnoEnhancedStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== VPC for RDS, Redis, Milvus ====================

    const vpc = new ec2.Vpc(this, 'LearnoVPC', {
      maxAzs: 2,
      natGateways: 1, // Cost optimization - use 1 NAT gateway
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // ==================== AWS Cognito for Authentication ====================

    const userPool = new cognito.UserPool(this, 'LearnoUserPool', {
      userPoolName: 'learno-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: false,
          mutable: true,
        },
        familyName: {
          required: false,
          mutable: true,
        },
      },
      customAttributes: {
        preferredLanguage: new cognito.StringAttribute({ minLen: 2, maxLen: 50, mutable: true }),
        learningLevel: new cognito.StringAttribute({ minLen: 1, maxLen: 20, mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'LearnoUserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
    });

    const identityPool = new cognito.CfnIdentityPool(this, 'LearnoIdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClient.userPoolClientId,
        providerName: userPool.userPoolProviderName,
      }],
    });

    // ==================== Aurora Serverless v2 (PostgreSQL) ====================

    // Database credentials secret
    const dbSecret = new secretsmanager.Secret(this, 'DBCredentials', {
      secretName: 'learno/db/credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'learno_admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        includeSpace: false,
        passwordLength: 32,
      },
    });

    // Aurora Serverless v2 cluster
    const dbCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromSecret(dbSecret),
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        publiclyAccessible: false,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('Reader', {
          scaleWithWriter: true,
        }),
      ],
      serverlessV2MinCapacity: 0.5, // Min ACUs
      serverlessV2MaxCapacity: 2,   // Max ACUs for cost control
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      defaultDatabaseName: 'learno',
      backup: {
        retention: cdk.Duration.days(7),
        preferredWindow: '03:00-04:00',
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      storageEncrypted: true,
    });

    // ==================== ElastiCache (Redis) for Caching & LangChain Memory ====================

    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for ElastiCache Redis',
      allowAllOutbound: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for ElastiCache Redis',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: 'cache.t3.micro', // Cost-effective for development
      engine: 'redis',
      numCacheNodes: 1,
      engineVersion: '7.0',
      cacheSubnetGroupName: redisSubnetGroup.ref,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      preferredMaintenanceWindow: 'sun:05:00-sun:06:00',
    });

    // ==================== Milvus Vector Database on ECS Fargate ====================

    const milvusCluster = new ecs.Cluster(this, 'MilvusCluster', {
      vpc,
      containerInsights: true,
    });

    // Milvus requires etcd and MinIO for metadata and object storage
    const milvusTaskDef = new ecs.FargateTaskDefinition(this, 'MilvusTaskDef', {
      memoryLimitMiB: 4096,
      cpu: 2048,
    });

    // Milvus standalone container
    const milvusContainer = milvusTaskDef.addContainer('Milvus', {
      image: ecs.ContainerImage.fromRegistry('milvusdb/milvus:v2.3.4'),
      environment: {
        ETCD_ENDPOINTS: 'localhost:2379',
        MINIO_ADDRESS: 'localhost:9000',
      },
      portMappings: [{
        containerPort: 19530,
        protocol: ecs.Protocol.TCP,
      }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'milvus' }),
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:9091/healthz || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
      },
    });

    // etcd container (required for Milvus metadata)
    milvusTaskDef.addContainer('Etcd', {
      image: ecs.ContainerImage.fromRegistry('quay.io/coreos/etcd:v3.5.5'),
      environment: {
        ETCD_AUTO_COMPACTION_MODE: 'revision',
        ETCD_AUTO_COMPACTION_RETENTION: '1000',
        ETCD_QUOTA_BACKEND_BYTES: '4294967296',
      },
      command: ['etcd', '-advertise-client-urls=http://127.0.0.1:2379', '-listen-client-urls=http://0.0.0.0:2379'],
      portMappings: [{
        containerPort: 2379,
        protocol: ecs.Protocol.TCP,
      }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'etcd' }),
    });

    // MinIO container (S3-compatible storage for Milvus)
    milvusTaskDef.addContainer('MinIO', {
      image: ecs.ContainerImage.fromRegistry('minio/minio:RELEASE.2023-03-20T20-16-18Z'),
      environment: {
        MINIO_ACCESS_KEY: 'minioadmin',
        MINIO_SECRET_KEY: 'minioadmin',
      },
      command: ['minio', 'server', '/minio_data'],
      portMappings: [{
        containerPort: 9000,
        protocol: ecs.Protocol.TCP,
      }],
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'minio' }),
    });

    // Milvus Fargate service with ALB
    const milvusService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'MilvusService', {
      cluster: milvusCluster,
      taskDefinition: milvusTaskDef,
      publicLoadBalancer: false, // Internal only
      desiredCount: 1,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
    });

    // ==================== DynamoDB Tables (for high-speed operations) ====================

    // Sessions table (DynamoDB for low-latency access)
    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserSessionsIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Chat Message History table (for LangChain RunnableWithMessageHistory)
    const chatHistoryTable = new dynamodb.Table(this, 'ChatHistoryTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'messageIndex', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
    });

    // ==================== S3 Buckets ====================

    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [{
        expiration: cdk.Duration.days(365),
        noncurrentVersionExpiration: cdk.Duration.days(30),
      }],
    });

    // ==================== SQS Queues ====================

    // Dead Letter Queue
    const dlq = new sqs.Queue(this, 'LearnoDeadLetterQueue', {
      queueName: 'learno-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Async processing queue for heavy operations
    const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
      queueName: 'learno-processing',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // Vocabulary review reminder queue
    const reminderQueue = new sqs.Queue(this, 'ReminderQueue', {
      queueName: 'learno-reminders',
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    // ==================== EventBridge ====================

    const eventBus = new events.EventBus(this, 'LearnoEventBus', {
      eventBusName: 'learno-events',
    });

    // Rule for daily vocabulary reminders
    const dailyReminderRule = new events.Rule(this, 'DailyReminderRule', {
      eventBus,
      schedule: events.Schedule.cron({ hour: '9', minute: '0' }),
      description: 'Trigger daily vocabulary review reminders',
    });

    dailyReminderRule.addTarget(new eventsTargets.SqsQueue(reminderQueue));

    // ==================== Lambda Functions ====================

    const commonEnv = {
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      DB_SECRET_ARN: dbSecret.secretArn,
      DB_CLUSTER_ARN: dbCluster.clusterArn,
      DB_NAME: 'learno',
      REDIS_ENDPOINT: redisCluster.attrRedisEndpointAddress,
      REDIS_PORT: redisCluster.attrRedisEndpointPort,
      MILVUS_ENDPOINT: milvusService.loadBalancer.loadBalancerDnsName,
      MILVUS_PORT: '19530',
      SESSIONS_TABLE: sessionsTable.tableName,
      CHAT_HISTORY_TABLE: chatHistoryTable.tableName,
      DOCUMENTS_BUCKET: documentsBucket.bucketName,
      PROCESSING_QUEUE_URL: processingQueue.queueUrl,
      EVENT_BUS_NAME: eventBus.eventBusName,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    };

    // Conversation Handler with LangChain Memory
    const conversationHandler = new NodejsFunction(this, 'ConversationHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/conversation-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnv,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        externalModules: ['@aws-sdk/*'], // Use AWS SDK v3 from Lambda runtime
      },
    });

    // User Handler
    const userHandler = new NodejsFunction(this, 'UserHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/user-handler-enhanced.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Document Processing Handler
    const documentHandler = new NodejsFunction(this, 'DocumentHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/document-handler-enhanced.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(300), // 5 minutes for embedding generation
      memorySize: 2048,
      environment: commonEnv,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Vocabulary Handler
    const vocabularyHandler = new NodejsFunction(this, 'VocabularyHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/vocabulary-handler-enhanced.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Async Queue Processor
    const queueProcessor = new NodejsFunction(this, 'QueueProcessor', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/queue-processor.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(300),
      memorySize: 1024,
      environment: commonEnv,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Grant permissions
    [conversationHandler, userHandler, documentHandler, vocabularyHandler, queueProcessor].forEach(fn => {
      dbSecret.grantRead(fn);
      dbCluster.grantDataApiAccess(fn);
      sessionsTable.grantReadWriteData(fn);
      chatHistoryTable.grantReadWriteData(fn);
      documentsBucket.grantReadWrite(fn);
      processingQueue.grantSendMessages(fn);
      eventBus.grantPutEventsTo(fn);
      redisSecurityGroup.addIngressRule(fn.connections.securityGroups[0], ec2.Port.tcp(6379));
      milvusService.service.connections.allowFrom(fn, ec2.Port.tcp(19530));
    });

    processingQueue.grantConsumeMessages(queueProcessor);

    // ==================== Step Functions Workflow ====================

    // Document processing workflow
    const processDocumentTask = new sfnTasks.LambdaInvoke(this, 'ProcessDocument', {
      lambdaFunction: documentHandler,
      payload: sfn.TaskInput.fromObject({
        'action': 'process',
        'documentId.$': '$.documentId',
        'userId.$': '$.userId',
      }),
    });

    const generateEmbeddingsTask = new sfnTasks.LambdaInvoke(this, 'GenerateEmbeddings', {
      lambdaFunction: documentHandler,
      payload: sfn.TaskInput.fromObject({
        'action': 'generate_embeddings',
        'documentId.$': '$.documentId',
      }),
    });

    const storeInMilvusTask = new sfnTasks.LambdaInvoke(this, 'StoreInMilvus', {
      lambdaFunction: documentHandler,
      payload: sfn.TaskInput.fromObject({
        'action': 'store_vectors',
        'documentId.$': '$.documentId',
        'embeddings.$': '$.Payload.embeddings',
      }),
    });

    const documentWorkflow = new sfn.StateMachine(this, 'DocumentProcessingWorkflow', {
      definition: processDocumentTask
        .next(generateEmbeddingsTask)
        .next(storeInMilvusTask),
      timeout: cdk.Duration.minutes(15),
    });

    // ==================== API Gateway with Cognito Authorizer ====================

    const api = new apigateway.RestApi(this, 'LearnoAPI', {
      restApiName: 'Learno Enhanced API',
      description: 'Enhanced serverless API with Cognito, RDS, and Milvus',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    // API Resources (all protected with Cognito)
    const conversation = api.root.addResource('conversation');
    conversation.addMethod('POST', new apigateway.LambdaIntegration(conversationHandler), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const users = api.root.addResource('users');
    users.addMethod('GET', new apigateway.LambdaIntegration(userHandler), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const vocabulary = api.root.addResource('vocabulary');
    vocabulary.addMethod('GET', new apigateway.LambdaIntegration(vocabularyHandler), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    vocabulary.addMethod('POST', new apigateway.LambdaIntegration(vocabularyHandler), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const documents = api.root.addResource('documents');
    documents.addMethod('POST', new apigateway.LambdaIntegration(documentHandler), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'DBClusterEndpoint', {
      value: dbCluster.clusterEndpoint.hostname,
      description: 'Aurora Serverless v2 endpoint',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redisCluster.attrRedisEndpointAddress,
      description: 'ElastiCache Redis endpoint',
    });

    new cdk.CfnOutput(this, 'MilvusEndpoint', {
      value: milvusService.loadBalancer.loadBalancerDnsName,
      description: 'Milvus vector database endpoint',
    });
  }
}
