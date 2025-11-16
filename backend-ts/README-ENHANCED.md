# Learno Enhanced Serverless Backend v4.0

Complete enterprise-grade serverless architecture for the Learno language learning platform, featuring TypeScript, LangChain v1, Aurora Serverless v2 (PostgreSQL), Milvus vector database, AWS Cognito, and Redis caching.

## 🏗️ Enhanced Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Node.js 18.x + TypeScript 5.3 | Lambda functions |
| **AI Framework** | LangChain v1 | Conversation, memory, RAG |
| **Relational DB** | Aurora Serverless v2 (PostgreSQL) | User data, progress, conversations |
| **Vector DB** | Milvus on ECS Fargate | Document embeddings, similarity search |
| **Key-Value DB** | DynamoDB | Sessions, high-speed operations |
| **Cache** | ElastiCache Redis | LangChain memory, session caching |
| **Auth** | AWS Cognito | User authentication & authorization |
| **API** | API Gateway + Cognito Authorizer | Secure REST API |
| **Async Processing** | SQS + Lambda | Background jobs |
| **Events** | EventBridge | Event-driven workflows |
| **Workflows** | Step Functions | Document processing pipelines |
| **Infrastructure** | AWS CDK 2.0 | Infrastructure as Code |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├─ Authentication Flow
                     │  ┌────────────────────────────────────┐
                     └──┤  AWS Cognito User Pool             │
                        │  - Email/Username signin           │
                        │  - OAuth 2.0                       │
                        │  - Custom attributes               │
                        └────────────────────────────────────┘
                     │
                     ├─ API Calls (JWT Token)
                     ▼
         ┌───────────────────────────────────────┐
         │    API Gateway (REST)                 │
         │    - Cognito Authorizer               │
         │    - CORS enabled                     │
         │    - Request validation               │
         └────┬──────────────────────────────────┘
              │
              ├─────────────────┬────────────────┬────────────────┐
              ▼                 ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐
    │ Conversation    │ │ User        │ │ Vocabulary   │ │ Document    │
    │ Handler         │ │ Handler     │ │ Handler      │ │ Handler     │
    │ (Lambda)        │ │ (Lambda)    │ │ (Lambda)     │ │ (Lambda)    │
    └────┬────────────┘ └──────┬──────┘ └──────┬───────┘ └──────┬──────┘
         │                     │                │                │
         ├────── LangChain ────┤                │                │
         │      Memory         │                │                │
         ▼                     ▼                ▼                ▼
┌────────────────────────────────────────────────────────────────────┐
│                        Data Layer (VPC)                             │
├─────────────────────┬───────────────────┬──────────────────────────┤
│ Aurora Serverless v2│  ElastiCache      │   Milvus (ECS Fargate)  │
│ (PostgreSQL)        │  (Redis)          │   + etcd + MinIO         │
│                     │                   │                          │
│ - Users             │ - Chat history    │ - Document embeddings    │
│ - Progress          │ - Session cache   │ - Similarity search      │
│ - Conversations     │ - Memory patterns │ - 1536-dim vectors       │
│ - Vocabulary        │                   │ - OpenAI embeddings      │
│ - Documents         │                   │                          │
│                     │                   │                          │
│ Managed by Prisma   │ Managed by        │ Managed by               │
│ ORM                 │ ioredis           │ @zilliz/milvus2-sdk      │
└─────────────────────┴───────────────────┴──────────────────────────┘
         │                     │                      │
         └─────────────────────┴──────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │      DynamoDB Tables        │
                │  - Sessions (TTL)           │
                │  - Chat History (TTL)       │
                └─────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │  Event-Driven Processing    │
                │                             │
                │  SQS Queues:                │
                │  - Processing Queue         │
                │  - Reminder Queue           │
                │  - Dead Letter Queue        │
                │                             │
                │  EventBridge:               │
                │  - Daily reminders          │
                │  - Streak notifications     │
                │                             │
                │  Step Functions:            │
                │  - Document processing      │
                │  - Embedding generation     │
                └─────────────────────────────┘
```

## 📦 Project Structure

```
backend-ts/
├── infrastructure/
│   ├── app.ts                           # CDK app entry point
│   ├── learno-enhanced-stack.ts         # 🆕 Enhanced stack (RDS, Milvus, Cognito)
│   └── learno-stack.ts                  # Original DynamoDB-only stack
├── src/
│   ├── handlers/
│   │   ├── conversation-handler.ts      # LangChain conversations
│   │   ├── user-handler.ts              # User CRUD operations
│   │   ├── user-handler-enhanced.ts     # 🆕 With Cognito & Prisma
│   │   ├── memory-handler.ts            # Memory insights
│   │   ├── vocabulary-handler.ts        # Spaced repetition
│   │   ├── vocabulary-handler-enhanced.ts # 🆕 With PostgreSQL
│   │   ├── document-handler.ts          # S3 uploads
│   │   ├── document-handler-enhanced.ts # 🆕 With Milvus embeddings
│   │   └── queue-processor.ts           # 🆕 SQS queue processor
│   ├── services/
│   │   ├── dynamodb-service.ts          # DynamoDB operations
│   │   ├── langchain-service.ts         # LangChain GPT-4 integration
│   │   ├── langchain-memory-service.ts  # 🆕 RunnableWithMessageHistory
│   │   └── milvus-service.ts            # 🆕 Vector database operations
│   └── models/
│       └── types.ts                     # TypeScript interfaces
├── prisma/
│   └── schema.prisma                    # 🆕 PostgreSQL schema
├── package.json                         # Dependencies
├── tsconfig.json                        # TypeScript configuration
├── README.md                            # Original documentation
└── README-ENHANCED.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+** installed
2. **AWS Account** with appropriate permissions
3. **AWS CLI** configured (`aws configure`)
4. **AWS CDK** installed globally:
   ```bash
   npm install -g aws-cdk
   ```
5. **OpenAI API Key** for LangChain
6. **Docker** (for Milvus local testing)

### Installation

1. **Install dependencies**:
   ```bash
   cd backend-ts
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npm run prisma:generate
   ```

3. **Set environment variables**:
   ```bash
   export OPENAI_API_KEY='your-openai-api-key'
   export AWS_REGION='us-east-1'
   export CDK_DEFAULT_ACCOUNT='your-aws-account-id'
   export CDK_DEFAULT_REGION='us-east-1'
   ```

4. **Build TypeScript**:
   ```bash
   npm run build
   ```

## 🔧 Deployment

### First-Time Setup

1. **Bootstrap CDK** (one-time per AWS account/region):
   ```bash
   cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1
   ```

2. **Review the stack**:
   ```bash
   npm run synth
   ```

   This generates CloudFormation template. Review `cdk.out/` directory.

3. **Deploy to AWS**:
   ```bash
   npm run deploy
   ```

   This will create:
   - ✅ VPC with public/private/database subnets
   - ✅ Aurora Serverless v2 PostgreSQL cluster (writer + reader)
   - ✅ Milvus vector database on ECS Fargate
   - ✅ ElastiCache Redis cluster
   - ✅ AWS Cognito User Pool & Identity Pool
   - ✅ DynamoDB tables for sessions
   - ✅ 5 Lambda functions in VPC
   - ✅ API Gateway with Cognito authorizer
   - ✅ SQS queues for async processing
   - ✅ EventBridge rules for scheduled tasks
   - ✅ Step Functions for document workflows
   - ✅ S3 bucket for documents
   - ✅ IAM roles and security groups

4. **Note the outputs** from deployment:
   ```
   Outputs:
   LearnoEnhancedStack.ApiEndpoint = https://xyz.execute-api.us-east-1.amazonaws.com/prod/
   LearnoEnhancedStack.UserPoolId = us-east-1_XXXXX
   LearnoEnhancedStack.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxx
   LearnoEnhancedStack.DBClusterEndpoint = learno-cluster.cluster-xxx.us-east-1.rds.amazonaws.com
   LearnoEnhancedStack.RedisEndpoint = learno-redis.xxxxx.0001.use1.cache.amazonaws.com
   LearnoEnhancedStack.MilvusEndpoint = learno-milvus-alb-xxxxx.us-east-1.elb.amazonaws.com
   ```

5. **Run database migrations**:
   ```bash
   # Set DATABASE_URL from deployment outputs
   export DATABASE_URL="postgresql://learno_admin:PASSWORD@ENDPOINT:5432/learno"

   # Run Prisma migrations
   npm run prisma:migrate
   ```

6. **Initialize Milvus collection**:
   ```bash
   # Run initialization Lambda or use AWS Console
   aws lambda invoke \
     --function-name LearnoEnhancedStack-DocumentHandler-XXX \
     --payload '{"action": "init_milvus"}' \
     response.json
   ```

### Update Deployment

```bash
# Build and deploy changes
npm run build && npm run deploy
```

### Destroy Infrastructure

```bash
cdk destroy
```

**⚠️ Warning**: This will delete all data in databases, buckets, and caches!

## 🔌 API Endpoints

All endpoints require **JWT token** from Cognito in `Authorization` header.

### Base URL
```
https://{api-id}.execute-api.{region}.amazonaws.com/prod
```

### Authentication Flow

1. **Sign Up**:
   ```bash
   aws cognito-idp sign-up \
     --client-id YOUR_CLIENT_ID \
     --username john@example.com \
     --password SecurePass123! \
     --user-attributes Name=email,Value=john@example.com
   ```

2. **Confirm Sign Up** (check email for code):
   ```bash
   aws cognito-idp confirm-sign-up \
     --client-id YOUR_CLIENT_ID \
     --username john@example.com \
     --confirmation-code 123456
   ```

3. **Sign In** (get JWT token):
   ```bash
   aws cognito-idp initiate-auth \
     --client-id YOUR_CLIENT_ID \
     --auth-flow USER_PASSWORD_AUTH \
     --auth-parameters USERNAME=john@example.com,PASSWORD=SecurePass123!
   ```

4. **Use token in API calls**:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api-endpoint/prod/conversation
   ```

### Conversation Endpoints

#### Start Conversation
```http
POST /conversation
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "action": "start_session",
  "language": "Spanish",
  "difficulty": "intermediate"
}

Response:
{
  "sessionId": "uuid",
  "message": "Session started"
}
```

#### Send Message (with LangChain Memory)
```http
POST /conversation
Authorization: Bearer {jwt-token}

{
  "action": "send_message",
  "sessionId": "uuid",
  "message": "Hola, ¿cómo estás?"
}

Response:
{
  "response": "¡Hola! Estoy bien, gracias. ¿Y tú?",
  "corrections": [],
  "feedback": "Excellent pronunciation!",
  "newVocabulary": ["estar - to be"],
  "conversationSummary": "Brief summary of last 10 messages"
}
```

### Document Endpoints (RAG with Milvus)

#### Upload Document
```http
POST /documents
Authorization: Bearer {jwt-token}

{
  "action": "upload_text",
  "language": "Spanish",
  "title": "Spanish Grammar Guide",
  "content": "Long text content here..."
}

Response:
{
  "documentId": "uuid",
  "status": "processing",
  "message": "Document is being processed and embedded into Milvus"
}
```

#### Search Documents (Vector Similarity)
```http
POST /documents
Authorization: Bearer {jwt-token}

{
  "action": "search",
  "query": "How do I conjugate ser vs estar?",
  "language": "Spanish",
  "topK": 5
}

Response:
{
  "results": [
    {
      "documentId": "uuid",
      "content": "Ser and estar both mean 'to be'...",
      "score": 0.95,
      "chunkIndex": 3
    }
  ]
}
```

## 🧠 LangChain v1 Memory System

### Overview

The enhanced architecture uses LangChain's latest memory patterns:

1. **RunnableWithMessageHistory**: Wraps conversation chains with automatic message persistence
2. **DynamoDBChatMessageHistory**: Stores chat history in DynamoDB with TTL
3. **Redis Caching**: Caches recent conversations for fast retrieval
4. **Buffer Memory**: Keeps all messages in context
5. **Summary Memory**: Summarizes old messages to save tokens

### Memory Types

#### Short-Term Memory (24 hours)
- Stored in **DynamoDB** with TTL
- Cached in **Redis** for 1 hour
- Used for recent conversation context
- Automatically expires after 24 hours

####Long-Term Memory (Persistent)
- Stored in **PostgreSQL** via Prisma
- Learning patterns, error corrections, preferences
- Q-learning reinforcement learning values
- Never expires, grows with user

### Usage Example

```typescript
import { LangChainMemoryService } from './services/langchain-memory-service';

const memoryService = new LangChainMemoryService();

// Create conversation chain with persistent history
const chain = await memoryService.createConversationChain(
  sessionId,
  'You are a Spanish language tutor...',
  {
    useCache: true,
    memoryType: 'buffer', // or 'summary' for long conversations
    maxTokens: 1000,
  }
);

// Invoke with automatic history management
const response = await memoryService.invokeConversation(
  chain,
  'Hola, ¿cómo estás?',
  sessionId
);

// Get conversation summary
const summary = await memoryService.getConversationSummary(sessionId);
```

## 🗄️ Database Architecture

### PostgreSQL (Aurora Serverless v2)

**Primary database** for relational data:

- **Users** - User profiles with Cognito integration
- **UserProgress** - Learning progress per language
- **Conversations** - All conversation threads
- **ConversationMessages** - Individual messages with AI analysis
- **VocabularyItems** - Spaced repetition vocabulary (SM-2 algorithm)
- **Documents** - Uploaded learning materials
- **DocumentChunks** - Chunked content with Milvus vector IDs
- **LearningGoals** - User-defined learning objectives
- **StudySessions** - Session tracking
- **Achievements** - Gamification system
- **MemoryPatterns** - Long-term learning patterns

**Managed by**: Prisma ORM

### Milvus (Vector Database)

**Vector embeddings** for semantic search:

- Document chunks embedded with OpenAI `text-embedding-3-small` (1536 dimensions)
- IVF_FLAT index with L2 distance metric
- Filters by userId, language, documentId
- Similarity search for RAG retrieval

**Managed by**: `@zilliz/milvus2-sdk-node`

### DynamoDB

**High-speed operations**:

- **Sessions** - Active session tracking (TTL: 30 days)
- **ChatHistory** - Recent message history (TTL: 30 days)

### Redis (ElastiCache)

**Caching layer**:

- Chat history cache (1 hour TTL)
- Memory patterns cache (24 hour TTL)
- Session data cache

## 💰 Cost Estimation (Enhanced Architecture)

### Monthly Costs (assuming 1,000 active users)

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| **Aurora Serverless v2** | 0.5-2 ACUs, 20GB storage | ~$50-150 |
| **Milvus on ECS Fargate** | 2 vCPU, 4GB RAM, 24/7 | ~$60 |
| **ElastiCache Redis** | cache.t3.micro | ~$15 |
| **Lambda** | 2M requests, 1GB, 30s avg | ~$30 |
| **DynamoDB** | Pay-per-request, 10M reads | ~$15 |
| **API Gateway** | 2M requests | ~$7 |
| **S3** | 50GB storage, 100K requests | ~$2 |
| **NAT Gateway** | 1 gateway, 100GB transfer | ~$50 |
| **SQS** | 1M requests | ~$1 |
| **CloudWatch** | Logs & monitoring | ~$10 |
| **Cognito** | 50K MAUs | Free (under 50K) |
| **OpenAI API** | 10M tokens | ~$20 |
| **Total** | | **~$260-360/month** |

### Cost Optimization Tips

1. **Aurora**: Start with 0.5 min ACUs, scale to 1-2 max
2. **Milvus**: Use Fargate Spot for 70% savings
3. **Redis**: Use cache.t4g.micro for better price/performance
4. **NAT Gateway**: Use VPC endpoints for AWS services
5. **Lambda**: Enable SnapStart for faster cold starts
6. **Enable AWS Budget alerts** to monitor spending

## 🔒 Security Features

### Implemented

✅ **Cognito Authentication** - JWT-based auth with MFA support
✅ **API Gateway Authorizer** - Validates JWT tokens
✅ **VPC Isolation** - RDS, Redis, Milvus in private subnets
✅ **Security Groups** - Least privilege network access
✅ **IAM Roles** - Minimal Lambda permissions
✅ **Encryption at Rest** - RDS, DynamoDB, S3
✅ **Encryption in Transit** - TLS 1.2+
✅ **Secrets Manager** - DB credentials
✅ **CloudWatch Logging** - Full audit trail

### Recommended Additions

🔲 **AWS WAF** - Protect API Gateway from attacks
🔲 **API Keys** - Rate limiting per client
🔲 **X-Ray Tracing** - Request flow visualization
🔲 **GuardDuty** - Threat detection
🔲 **Security Hub** - Compliance monitoring

## 📊 Monitoring & Observability

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/LearnoEnhancedStack-ConversationHandler --follow

# View RDS logs
aws logs tail /aws/rds/cluster/learno-cluster/postgresql --follow

# View ECS logs (Milvus)
aws logs tail /aws/ecs/learno-milvus --follow
```

### Metrics Dashboard

Key metrics to monitor:

- Lambda invocations, duration, errors, throttles
- Aurora ACU utilization, connections, transactions
- Milvus vector count, search latency
- Redis cache hit ratio, evictions
- API Gateway 4xx, 5xx errors
- SQS queue depth, age of oldest message

### Alarms

Set up CloudWatch alarms for:

- Lambda error rate > 1%
- Aurora ACU > 80%
- Redis CPU > 75%
- API Gateway latency > 2s
- SQS DLQ messages > 0

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests (requires deployed stack)
npm run test:integration

# Load testing
npm run test:load

# Test Prisma queries
npm run prisma:studio
```

## 🚧 Troubleshooting

### Common Issues

**Issue**: Lambda timeout connecting to RDS
**Solution**: Ensure Lambda is in VPC with access to database subnet. Check security groups.

**Issue**: Milvus container health check failing
**Solution**: Increase health check grace period in ECS task definition.

**Issue**: Redis connection refused
**Solution**: Verify Lambda security group can access Redis security group on port 6379.

**Issue**: Cognito token validation failed
**Solution**: Ensure User Pool ID and Client ID are correct in environment variables.

**Issue**: Prisma migration failed
**Solution**: Run migrations from a machine with VPC access, or use AWS Cloud9.

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [LangChain.js Documentation](https://js.langchain.com/)
- [Aurora Serverless v2 Guide](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [Milvus Documentation](https://milvus.io/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [AWS Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

---

**Built with ❤️ using TypeScript, LangChain v1, Aurora Serverless v2, Milvus, and AWS**
