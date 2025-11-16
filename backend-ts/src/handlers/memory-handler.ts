import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../services/dynamodb-service';
import { LangChainService } from '../services/langchain-service';
import { ShortTermMemory, LongTermPattern } from '../models/types';

const db = new DynamoDBService();
const langchain = new LangChainService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  try {
    const method = event.httpMethod;
    const path = event.path;

    if (method === 'GET' && path.includes('/memory/short-term')) {
      return await getShortTermMemories(event, headers);
    } else if (method === 'GET' && path.includes('/memory/long-term')) {
      return await getLongTermPatterns(event, headers);
    } else if (method === 'GET' && path.includes('/memory/recommendations')) {
      return await getRecommendations(event, headers);
    } else if (method === 'POST') {
      return await createMemory(event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('Memory handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

async function getShortTermMemories(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const userId = event.queryStringParameters?.userId;
  const language = event.queryStringParameters?.language;

  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId is required' }),
    };
  }

  const memories = await db.getShortTermMemories(userId, language);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ memories }),
  };
}

async function getLongTermPatterns(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const userId = event.queryStringParameters?.userId;
  const language = event.queryStringParameters?.language;
  const patternType = event.queryStringParameters?.patternType;

  if (!userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId is required' }),
    };
  }

  const patterns = await db.getLongTermPatterns(userId, language, patternType);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ patterns }),
  };
}

async function getRecommendations(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const userId = event.queryStringParameters?.userId;
  const language = event.queryStringParameters?.language;

  if (!userId || !language) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId and language are required' }),
    };
  }

  const progress = await db.getUserProgress(userId, language);
  const patterns = await db.getLongTermPatterns(userId, language);

  const learningPatterns = patterns.reduce((acc, p) => {
    acc[p.patternType] = p.patternData;
    return acc;
  }, {} as Record<string, any>);

  const context = {
    language,
    difficulty: progress?.currentLevel || 'beginner',
    userLevel: progress?.currentLevel || 'beginner',
    recentTopics: [],
    commonErrors: [],
    preferences: {},
  };

  const recommendations = await langchain.generateRecommendations(context, learningPatterns);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ recommendations }),
  };
}

async function createMemory(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { userId, sessionId, language, memoryType, content, context, importanceScore } = body;

  if (!userId || !language || !memoryType || !content) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'userId, language, memoryType, and content are required',
      }),
    };
  }

  const memory: ShortTermMemory = {
    memoryId: uuidv4(),
    userId,
    sessionId,
    language,
    memoryType,
    content,
    context: context || {},
    importanceScore: importanceScore || 0.5,
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  await db.createShortTermMemory(memory);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ memoryId: memory.memoryId }),
  };
}
