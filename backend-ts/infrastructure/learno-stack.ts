import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class LearnoServerlessStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== DynamoDB Tables ====================

    // Users table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'UsernameIndex',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
    });

    // User Progress table
    const progressTable = new dynamodb.Table(this, 'UserProgressTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'language', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Sessions table
    const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    sessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserSessionsIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Short-term Memory table
    const shortTermMemoryTable = new dynamodb.Table(this, 'ShortTermMemoryTable', {
      partitionKey: { name: 'memoryId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'expiresAt',
    });

    shortTermMemoryTable.addGlobalSecondaryIndex({
      indexName: 'UserMemoryIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // Long-term Memory table
    const longTermMemoryTable = new dynamodb.Table(this, 'LongTermMemoryTable', {
      partitionKey: { name: 'patternId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    longTermMemoryTable.addGlobalSecondaryIndex({
      indexName: 'UserPatternsIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'patternType', type: dynamodb.AttributeType.STRING },
    });

    // Q-Learning table
    const qTableDDB = new dynamodb.Table(this, 'QLearningTable', {
      partitionKey: { name: 'stateActionKey', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    qTableDDB.addGlobalSecondaryIndex({
      indexName: 'UserQValuesIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'language', type: dynamodb.AttributeType.STRING },
    });

    // Vocabulary table
    const vocabularyTable = new dynamodb.Table(this, 'VocabularyTable', {
      partitionKey: { name: 'exerciseId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    vocabularyTable.addGlobalSecondaryIndex({
      indexName: 'UserVocabIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nextReview', type: dynamodb.AttributeType.STRING },
    });

    // ==================== S3 Buckets ====================

    // Documents bucket for RAG system
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(365),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // ==================== Lambda Layer ====================

    // Shared dependencies layer
    const dependenciesLayer = new lambda.LayerVersion(this, 'DependenciesLayer', {
      code: lambda.Code.fromAsset('lambda-layers/dependencies'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'LangChain and AWS SDK dependencies',
    });

    // ==================== Lambda Functions ====================

    // Common environment variables
    const commonEnv = {
      USERS_TABLE: usersTable.tableName,
      PROGRESS_TABLE: progressTable.tableName,
      SESSIONS_TABLE: sessionsTable.tableName,
      SHORT_TERM_MEMORY_TABLE: shortTermMemoryTable.tableName,
      LONG_TERM_MEMORY_TABLE: longTermMemoryTable.tableName,
      Q_TABLE: qTableDDB.tableName,
      VOCABULARY_TABLE: vocabularyTable.tableName,
      DOCUMENTS_BUCKET: documentsBucket.bucketName,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    };

    // User Management Lambda
    const userHandler = new NodejsFunction(this, 'UserHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/user-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    // Conversation Handler with LangChain
    const conversationHandler = new NodejsFunction(this, 'ConversationHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/conversation-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    // RL Memory Handler
    const memoryHandler = new NodejsFunction(this, 'MemoryHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/memory-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    // Vocabulary Handler
    const vocabularyHandler = new NodejsFunction(this, 'VocabularyHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/vocabulary-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    // Document Upload Handler
    const documentHandler = new NodejsFunction(this, 'DocumentHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: 'src/handlers/document-handler.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: commonEnv,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
      },
    });

    // Grant permissions
    [userHandler, conversationHandler, memoryHandler, vocabularyHandler, documentHandler].forEach(fn => {
      usersTable.grantReadWriteData(fn);
      progressTable.grantReadWriteData(fn);
      sessionsTable.grantReadWriteData(fn);
      shortTermMemoryTable.grantReadWriteData(fn);
      longTermMemoryTable.grantReadWriteData(fn);
      qTableDDB.grantReadWriteData(fn);
      vocabularyTable.grantReadWriteData(fn);
      documentsBucket.grantReadWrite(fn);
    });

    // ==================== API Gateway ====================

    const api = new apigateway.RestApi(this, 'LearnoAPI', {
      restApiName: 'Learno Language Learning API',
      description: 'Serverless API for Learno platform with LangChain',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
      deployOptions: {
        stageName: 'prod',
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // API Resources and Methods
    const users = api.root.addResource('users');
    users.addMethod('POST', new apigateway.LambdaIntegration(userHandler));
    users.addMethod('GET', new apigateway.LambdaIntegration(userHandler));

    const conversation = api.root.addResource('conversation');
    conversation.addMethod('POST', new apigateway.LambdaIntegration(conversationHandler));

    const memory = api.root.addResource('memory');
    memory.addMethod('GET', new apigateway.LambdaIntegration(memoryHandler));
    memory.addMethod('POST', new apigateway.LambdaIntegration(memoryHandler));

    const vocabulary = api.root.addResource('vocabulary');
    vocabulary.addMethod('GET', new apigateway.LambdaIntegration(vocabularyHandler));
    vocabulary.addMethod('POST', new apigateway.LambdaIntegration(vocabularyHandler));

    const documents = api.root.addResource('documents');
    documents.addMethod('POST', new apigateway.LambdaIntegration(documentHandler));

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'DocumentsBucketName', {
      value: documentsBucket.bucketName,
      description: 'S3 bucket for documents',
    });
  }
}
