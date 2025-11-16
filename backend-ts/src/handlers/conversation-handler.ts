import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../services/dynamodb-service';
import { LangChainService } from '../services/langchain-service';
import {
  Session,
  ShortTermMemory,
  LongTermPattern,
  ConversationMessage,
  LangChainContext,
} from '../models/types';

const db = new DynamoDBService();
const langchain = new LangChainService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { action, sessionId, userId, language, message, difficulty } = body;

    switch (action) {
      case 'start_session':
        return await startSession(userId, language, difficulty || 'beginner');

      case 'send_message':
        return await processMessage(sessionId, userId, language, message);

      case 'end_session':
        return await endSession(sessionId);

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('Handler error:', error);
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

async function startSession(
  userId: string,
  language: string,
  difficulty: string
): Promise<APIGatewayProxyResult> {
  const sessionId = uuidv4();

  // Get user progress to determine actual difficulty
  const progress = await db.getUserProgress(userId, language);
  const currentLevel = progress?.currentLevel || 'beginner';

  // Create session
  const session: Session = {
    sessionId,
    userId,
    language,
    difficulty: currentLevel,
    messageCount: 0,
    perfectMessages: 0,
    corrections: 0,
    duration: 0,
    accuracyRate: 0,
    createdAt: new Date().toISOString(),
  };

  await db.createSession(session);

  // Generate welcome message using LangChain
  const context: LangChainContext = {
    language,
    difficulty: currentLevel,
    userLevel: currentLevel,
    recentTopics: [],
    commonErrors: [],
    preferences: {},
  };

  const welcomePrompt = `Welcome a ${language} learner (${currentLevel} level) to start conversation practice. Be warm and encouraging. Ask them what they'd like to talk about.`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      sessionId,
      currentLevel,
      message: 'Session started successfully',
    }),
  };
}

async function processMessage(
  sessionId: string,
  userId: string,
  language: string,
  userMessage: string
): Promise<APIGatewayProxyResult> {
  // Get session
  const session = await db.getSession(sessionId);
  if (!session) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Session not found' }),
    };
  }

  // Get user progress and context
  const progress = await db.getUserProgress(userId, language);

  // Get short-term memory for session context
  const shortTermMemories = await db.getShortTermMemories(userId, language, 10);

  // Get long-term patterns
  const topicPrefs = await db.getLongTermPatterns(userId, language, 'topic_preference');
  const errorPatterns = await db.getLongTermPatterns(userId, language, 'error_patterns');

  // Build LangChain context
  const context: LangChainContext = {
    language,
    difficulty: session.difficulty,
    userLevel: progress?.currentLevel || 'beginner',
    recentTopics: shortTermMemories
      .filter(m => m.memoryType === 'topic_interest')
      .map(m => m.content)
      .slice(0, 5),
    commonErrors: errorPatterns.length > 0
      ? Object.keys(errorPatterns[0].patternData).slice(0, 5)
      : [],
    preferences: topicPrefs.length > 0 ? topicPrefs[0].patternData : {},
  };

  // Build conversation history
  const conversationHistory: ConversationMessage[] = shortTermMemories
    .filter(m => m.memoryType === 'conversation')
    .map(m => ({
      role: m.context.role as 'user' | 'assistant',
      content: m.content,
      timestamp: m.createdAt,
    }))
    .reverse();

  // Generate AI response using LangChain
  const result = await langchain.generatePracticeResponse(userMessage, context, conversationHistory);

  // Store user message in short-term memory
  const userMemory: ShortTermMemory = {
    memoryId: uuidv4(),
    userId,
    sessionId,
    language,
    memoryType: 'conversation',
    content: userMessage,
    context: { role: 'user' },
    importanceScore: 0.5,
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  await db.createShortTermMemory(userMemory);

  // Store AI response in short-term memory
  const aiMemory: ShortTermMemory = {
    memoryId: uuidv4(),
    userId,
    sessionId,
    language,
    memoryType: 'conversation',
    content: result.response,
    context: { role: 'assistant' },
    importanceScore: 0.5,
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  await db.createShortTermMemory(aiMemory);

  // Store corrections if any
  if (result.corrections.length > 0) {
    const correctionMemory: ShortTermMemory = {
      memoryId: uuidv4(),
      userId,
      sessionId,
      language,
      memoryType: 'correction',
      content: JSON.stringify(result.corrections),
      context: { correctionCount: result.corrections.length },
      importanceScore: 0.8,
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };

    await db.createShortTermMemory(correctionMemory);

    // Update error patterns in long-term memory
    const errorTypes = result.corrections.map(c => c.explanation);
    if (errorPatterns.length > 0) {
      const pattern = errorPatterns[0];
      const patternData = { ...pattern.patternData };

      errorTypes.forEach(errorType => {
        patternData[errorType] = (patternData[errorType] || 0) + 1;
      });

      pattern.patternData = patternData;
      pattern.accessCount += 1;
      pattern.lastAccessed = new Date().toISOString();
      pattern.updatedAt = new Date().toISOString();

      await db.upsertLongTermPattern(pattern);
    } else {
      // Create new error pattern
      const newPattern: LongTermPattern = {
        patternId: uuidv4(),
        userId,
        language,
        patternType: 'error_patterns',
        patternData: errorTypes.reduce((acc, err) => ({ ...acc, [err]: 1 }), {}),
        confidenceScore: 0.5,
        accessCount: 1,
        lastAccessed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.upsertLongTermPattern(newPattern);
    }
  }

  // Update session stats
  session.messageCount += 1;
  if (result.corrections.length === 0) {
    session.perfectMessages += 1;
  } else {
    session.corrections += result.corrections.length;
  }
  session.accuracyRate = session.messageCount > 0
    ? (session.perfectMessages / session.messageCount) * 100
    : 0;

  await db.createSession(session);

  // Update user progress
  if (progress) {
    progress.totalMessages += 1;
    if (result.corrections.length === 0) {
      progress.perfectMessages += 1;
    }
    progress.totalCorrections += result.corrections.length;
    progress.lastPracticed = new Date().toISOString();
    progress.updatedAt = new Date().toISOString();

    // Award XP
    const xpGained = result.corrections.length === 0 ? 10 : 5;
    progress.totalXP += xpGained;

    await db.updateUserProgress(progress);
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      response: result.response,
      corrections: result.corrections,
      feedback: result.feedback,
      newVocabulary: result.newVocabulary,
      stats: {
        messages: session.messageCount,
        perfectMessages: session.perfectMessages,
        corrections: session.corrections,
        accuracy: Math.round(session.accuracyRate),
      },
    }),
  };
}

async function endSession(sessionId: string): Promise<APIGatewayProxyResult> {
  const session = await db.getSession(sessionId);

  if (!session) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Session not found' }),
    };
  }

  session.endedAt = new Date().toISOString();

  // Calculate duration (simplified - in real app would track start time)
  session.duration = session.messageCount * 60; // Assume 1 minute per message

  await db.createSession(session);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      message: 'Session ended',
      summary: {
        messageCount: session.messageCount,
        perfectMessages: session.perfectMessages,
        corrections: session.corrections,
        accuracyRate: Math.round(session.accuracyRate),
        duration: session.duration,
      },
    }),
  };
}
