# Learno Serverless Backend (TypeScript + LangChain v1 + AWS)

Modern serverless architecture for the Learno language learning platform, built with TypeScript, LangChain v1, and AWS services.

## 🏗️ Architecture

### Technology Stack
- **Runtime**: Node.js 18.x with TypeScript 5.3
- **AI Framework**: LangChain v1 (latest) with OpenAI GPT-4
- **Cloud Platform**: AWS Serverless
- **Infrastructure as Code**: AWS CDK 2.0
- **Database**: DynamoDB (NoSQL)
- **Storage**: S3 (documents/RAG)
- **API**: API Gateway REST API
- **Compute**: AWS Lambda

### AWS Services Used

| Service | Purpose |
|---------|---------|
| **Lambda** | Serverless compute for all API endpoints |
| **DynamoDB** | NoSQL database for user data, sessions, memory |
| **S3** | Document storage for RAG system |
| **API Gateway** | REST API endpoint management |
| **CloudWatch** | Logging and monitoring |
| **IAM** | Security and permissions |

### DynamoDB Tables

```
UsersTable
├── PK: userId
└── GSI: UsernameIndex (username)

UserProgressTable
├── PK: userId
└── SK: language

SessionsTable
├── PK: sessionId
├── GSI: UserSessionsIndex (userId, createdAt)
└── TTL: 30 days

ShortTermMemoryTable
├── PK: memoryId
├── GSI: UserMemoryIndex (userId, createdAt)
└── TTL: 24 hours

LongTermMemoryTable
├── PK: patternId
└── GSI: UserPatternsIndex (userId, patternType)

QLearningTable
├── PK: stateActionKey
└── GSI: UserQValuesIndex (userId, language)

VocabularyTable
├── PK: exerciseId
└── GSI: UserVocabIndex (userId, nextReview)
```

## 📦 Project Structure

```
backend-ts/
├── src/
│   ├── handlers/           # Lambda function handlers
│   │   ├── conversation-handler.ts
│   │   ├── user-handler.ts
│   │   ├── memory-handler.ts
│   │   ├── vocabulary-handler.ts
│   │   └── document-handler.ts
│   ├── services/           # Business logic services
│   │   ├── dynamodb-service.ts
│   │   └── langchain-service.ts
│   └── models/             # TypeScript interfaces
│       └── types.ts
├── infrastructure/         # AWS CDK infrastructure
│   ├── learno-stack.ts    # Main CDK stack definition
│   └── app.ts             # CDK app entry point
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

1. **Node.js 18+** installed
2. **AWS Account** with appropriate permissions
3. **AWS CLI** configured
4. **AWS CDK** installed globally:
   ```bash
   npm install -g aws-cdk
   ```
5. **OpenAI API Key** for LangChain

### Installation

1. **Install dependencies**:
   ```bash
   cd backend-ts
   npm install
   ```

2. **Set environment variables**:
   ```bash
   export OPENAI_API_KEY='your-openai-api-key'
   export AWS_REGION='us-east-1'
   ```

3. **Build TypeScript**:
   ```bash
   npm run build
   ```

### Development

```bash
# Watch mode (auto-compile on changes)
npm run watch

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 🔧 Deployment

### First-Time Setup

1. **Bootstrap CDK** (one-time per AWS account/region):
   ```bash
   cdk bootstrap aws://ACCOUNT-NUMBER/REGION
   ```

2. **Synthesize CloudFormation template**:
   ```bash
   npm run synth
   ```

3. **Deploy to AWS**:
   ```bash
   npm run deploy
   ```

   This will:
   - Create all DynamoDB tables
   - Deploy Lambda functions
   - Set up API Gateway
   - Create S3 bucket
   - Configure IAM roles and permissions

4. **Note the API endpoint** from deployment output:
   ```
   Outputs:
   LearnoServerlessStack.ApiEndpoint = https://abc123.execute-api.us-east-1.amazonaws.com/prod/
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

**⚠️ Warning**: This will delete all data in DynamoDB tables and S3 bucket!

## 🔌 API Endpoints

### Base URL
```
https://{api-id}.execute-api.{region}.amazonaws.com/prod
```

### Endpoints

#### Users
```http
POST /users
Body: { "username": "john", "email": "john@example.com" }
Response: { "user": {...}, "exists": false }

GET /users?username=john
Response: { "user": {...} }
```

#### Conversation (with LangChain)
```http
POST /conversation
Body: {
  "action": "start_session",
  "userId": "uuid",
  "language": "Spanish",
  "difficulty": "beginner"
}
Response: { "sessionId": "uuid", "currentLevel": "beginner" }

POST /conversation
Body: {
  "action": "send_message",
  "sessionId": "uuid",
  "userId": "uuid",
  "language": "Spanish",
  "message": "Hola, como estas?"
}
Response: {
  "response": "¡Hola! Estoy bien, gracias. ¿Y tú?",
  "corrections": [],
  "feedback": "Excellent!",
  "newVocabulary": [...],
  "stats": {...}
}
```

#### Memory (RL System)
```http
GET /memory/short-term?userId=uuid&language=Spanish
Response: { "memories": [...] }

GET /memory/long-term?userId=uuid&language=Spanish
Response: { "patterns": [...] }

GET /memory/recommendations?userId=uuid&language=Spanish
Response: {
  "recommendations": {
    "topics": ["food", "travel"],
    "difficulty": "intermediate",
    "contentTypes": ["conversation"],
    "focusAreas": ["past_tense"]
  }
}
```

#### Vocabulary
```http
POST /vocabulary
Body: {
  "action": "create",
  "userId": "uuid",
  "language": "Spanish",
  "word": "casa",
  "translation": "house"
}

GET /vocabulary?userId=uuid&language=Spanish&dueOnly=true
Response: { "exercises": [...] }
```

## 🧠 LangChain Integration

### Features

- **GPT-4 Turbo** for natural conversation
- **Context-aware responses** using user memory
- **Automatic error correction** with explanations
- **Personalized feedback** based on user level
- **Vocabulary extraction** from AI responses
- **Adaptive difficulty** based on performance

### LangChain v1 Components

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
```

### Example Usage

```typescript
const langchain = new LangChainService();

const result = await langchain.generatePracticeResponse(
  userMessage,
  context,
  conversationHistory
);
// Returns: { response, corrections, feedback, newVocabulary }
```

## 📊 Monitoring & Logs

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/LearnoServerlessStack-ConversationHandler --follow

# View API Gateway logs
aws logs tail /aws/apigateway/LearnoAPI --follow
```

### Metrics

Monitor in AWS CloudWatch:
- Lambda invocations
- Lambda duration
- API Gateway requests
- DynamoDB read/write capacity
- Error rates

## 💰 Cost Optimization

### Estimated Monthly Costs (for 1000 users)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 1M requests, 512MB, 30s avg | ~$20 |
| DynamoDB | Pay-per-request | ~$15 |
| API Gateway | 1M requests | ~$3.50 |
| S3 | 10GB storage | ~$0.23 |
| CloudWatch | Logs & monitoring | ~$5 |
| **Total** | | **~$44/month** |

### Cost Saving Tips

1. **Use DynamoDB On-Demand** - Only pay for what you use
2. **Enable Lambda versioning** - Reuse warm instances
3. **Set CloudWatch log retention** - Auto-delete old logs
4. **Use S3 lifecycle policies** - Move old data to Glacier
5. **Monitor with AWS Budgets** - Set spending alerts

## 🔒 Security Best Practices

### Implemented

✅ **IAM least privilege** - Lambda functions have minimal permissions
✅ **API Gateway CORS** - Configured for specific origins
✅ **DynamoDB encryption** - At-rest encryption enabled
✅ **S3 block public access** - No public buckets
✅ **Environment variables** - Secrets stored securely
✅ **CloudWatch logging** - Full audit trail

### Recommended Additions

🔲 Add **AWS WAF** for API protection
🔲 Implement **Cognito** for user authentication
🔲 Add **API keys** for rate limiting
🔲 Enable **X-Ray** for request tracing
🔲 Add **Secrets Manager** for API keys

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Test specific handler
npm test -- conversation-handler.test.ts
```

## 🚧 Troubleshooting

### Common Issues

**Issue**: `cdk: command not found`
**Solution**: Install AWS CDK globally: `npm install -g aws-cdk`

**Issue**: Lambda timeout errors
**Solution**: Increase timeout in `learno-stack.ts`:
```typescript
timeout: cdk.Duration.seconds(60)
```

**Issue**: DynamoDB throttling
**Solution**: Check CloudWatch metrics and increase capacity or use on-demand billing

**Issue**: CORS errors
**Solution**: Verify CORS configuration in API Gateway and ensure proper headers

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [LangChain Documentation](https://js.langchain.com/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## 📝 License

MIT License - See LICENSE file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

---

**Built with ❤️ using TypeScript, LangChain v1, and AWS Serverless**
