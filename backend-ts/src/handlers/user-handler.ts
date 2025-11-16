import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../services/dynamodb-service';
import { User, UserProgress } from '../models/types';

const db = new DynamoDBService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  try {
    const method = event.httpMethod;

    if (method === 'POST') {
      return await createOrGetUser(event, headers);
    } else if (method === 'GET') {
      return await getUser(event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('User handler error:', error);
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

async function createOrGetUser(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { username, email } = body;

  if (!username) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Username is required' }),
    };
  }

  // Check if user exists
  let user = await db.getUserByUsername(username);

  if (user) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user, exists: true }),
    };
  }

  // Create new user
  user = {
    userId: uuidv4(),
    username,
    email: email || undefined,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };

  await db.createUser(user);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ user, exists: false }),
  };
}

async function getUser(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const username = event.queryStringParameters?.username;
  const userId = event.queryStringParameters?.userId;

  if (!username && !userId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Username or userId is required' }),
    };
  }

  let user: User | null = null;

  if (userId) {
    user = await db.getUserById(userId);
  } else if (username) {
    user = await db.getUserByUsername(username);
  }

  if (!user) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'User not found' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ user }),
  };
}
