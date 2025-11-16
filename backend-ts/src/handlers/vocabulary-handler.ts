import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../services/dynamodb-service';
import { VocabularyExercise } from '../models/types';

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
      return await handleVocabularyAction(event, headers);
    } else if (method === 'GET') {
      return await getVocabularyExercises(event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('Vocabulary handler error:', error);
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

async function handleVocabularyAction(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { action, userId, language } = body;

  switch (action) {
    case 'create':
      return await createVocabularyExercise(body, headers);
    case 'review':
      return await reviewVocabularyExercise(body, headers);
    case 'stats':
      return await getVocabularyStats(userId, language, headers);
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
  }
}

async function createVocabularyExercise(
  data: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const { userId, language, word, translation, context, difficulty, exerciseType } = data;

  if (!userId || !language || !word || !translation) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'userId, language, word, and translation are required',
      }),
    };
  }

  const exercise: VocabularyExercise = {
    exerciseId: uuidv4(),
    userId,
    language,
    word,
    translation,
    context: context || undefined,
    difficulty: difficulty || 'beginner',
    exerciseType: exerciseType || 'translation',
    repetitionLevel: 0,
    correctCount: 0,
    incorrectCount: 0,
    lastReviewed: undefined,
    nextReview: new Date().toISOString(),
    easeFactor: 2.5,
    interval: 0,
    createdAt: new Date().toISOString(),
  };

  await db.createVocabularyExercise(exercise);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ exercise }),
  };
}

async function reviewVocabularyExercise(
  data: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const { exerciseId, correct, timeSpentSeconds } = data;

  if (!exerciseId || correct === undefined) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'exerciseId and correct are required',
      }),
    };
  }

  const exercise = await db.getVocabularyExercise(exerciseId);

  if (!exercise) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Exercise not found' }),
    };
  }

  // Update exercise based on spaced repetition algorithm (SM-2)
  const updatedExercise = calculateNextReview(exercise, correct, timeSpentSeconds);

  await db.updateVocabularyExercise(updatedExercise);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      exercise: updatedExercise,
      message: correct ? 'Great job!' : 'Keep practicing!',
    }),
  };
}

async function getVocabularyExercises(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const userId = event.queryStringParameters?.userId;
  const language = event.queryStringParameters?.language;
  const dueOnly = event.queryStringParameters?.dueOnly === 'true';

  if (!userId || !language) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId and language are required' }),
    };
  }

  let exercises = await db.getVocabularyExercises(userId, language);

  if (dueOnly) {
    const now = new Date().toISOString();
    exercises = exercises.filter((ex) => ex.nextReview <= now);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ exercises, count: exercises.length }),
  };
}

async function getVocabularyStats(
  userId: string,
  language: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  if (!userId || !language) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId and language are required' }),
    };
  }

  const exercises = await db.getVocabularyExercises(userId, language);

  const stats = {
    totalWords: exercises.length,
    mastered: exercises.filter((ex) => ex.repetitionLevel >= 5).length,
    learning: exercises.filter((ex) => ex.repetitionLevel > 0 && ex.repetitionLevel < 5).length,
    new: exercises.filter((ex) => ex.repetitionLevel === 0).length,
    dueToday: exercises.filter((ex) => ex.nextReview <= new Date().toISOString()).length,
    averageEaseFactor: exercises.reduce((sum, ex) => sum + ex.easeFactor, 0) / exercises.length || 0,
    totalCorrect: exercises.reduce((sum, ex) => sum + ex.correctCount, 0),
    totalIncorrect: exercises.reduce((sum, ex) => sum + ex.incorrectCount, 0),
    accuracy:
      exercises.reduce((sum, ex) => sum + ex.correctCount, 0) /
        (exercises.reduce((sum, ex) => sum + ex.correctCount + ex.incorrectCount, 0) || 1) *
      100,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ stats }),
  };
}

/**
 * Calculate next review date using SM-2 spaced repetition algorithm
 * https://en.wikipedia.org/wiki/SuperMemo#SM-2_algorithm
 */
function calculateNextReview(
  exercise: VocabularyExercise,
  correct: boolean,
  timeSpentSeconds?: number
): VocabularyExercise {
  const updated = { ...exercise };
  updated.lastReviewed = new Date().toISOString();

  if (correct) {
    updated.correctCount += 1;
    updated.repetitionLevel += 1;

    // Calculate new ease factor (quality = 4 for correct answer)
    const quality = 4;
    const newEaseFactor = Math.max(
      1.3,
      updated.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );
    updated.easeFactor = newEaseFactor;

    // Calculate interval
    if (updated.repetitionLevel === 1) {
      updated.interval = 1; // 1 day
    } else if (updated.repetitionLevel === 2) {
      updated.interval = 6; // 6 days
    } else {
      updated.interval = Math.round(updated.interval * updated.easeFactor);
    }
  } else {
    updated.incorrectCount += 1;
    updated.repetitionLevel = 0;
    updated.interval = 0;

    // Decrease ease factor for incorrect answer
    updated.easeFactor = Math.max(1.3, updated.easeFactor - 0.2);
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + updated.interval);
  updated.nextReview = nextReviewDate.toISOString();

  return updated;
}
