import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import {
  User,
  UserProgress,
  Session,
  ShortTermMemory,
  LongTermPattern,
  QValue,
  VocabularyExercise,
} from '../models/types';

export class DynamoDBService {
  private client: DynamoDBClient;

  constructor() {
    this.client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }

  // ==================== Users ====================

  async createUser(user: User): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: process.env.USERS_TABLE!,
        Item: marshall(user),
      })
    );
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: process.env.USERS_TABLE!,
        Key: marshall({ userId }),
      })
    );

    return result.Item ? (unmarshall(result.Item) as User) : null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: process.env.USERS_TABLE!,
        IndexName: 'UsernameIndex',
        KeyConditionExpression: 'username = :username',
        ExpressionAttributeValues: marshall({ ':username': username }),
      })
    );

    return result.Items && result.Items.length > 0
      ? (unmarshall(result.Items[0]) as User)
      : null;
  }

  // ==================== User Progress ====================

  async getUserProgress(userId: string, language: string): Promise<UserProgress | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: process.env.PROGRESS_TABLE!,
        Key: marshall({ userId, language }),
      })
    );

    return result.Item ? (unmarshall(result.Item) as UserProgress) : null;
  }

  async updateUserProgress(progress: UserProgress): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: process.env.PROGRESS_TABLE!,
        Item: marshall(progress),
      })
    );
  }

  // ==================== Sessions ====================

  async createSession(session: Session): Promise<void> {
    // Add TTL (30 days from now)
    const sessionWithTTL = {
      ...session,
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    };

    await this.client.send(
      new PutItemCommand({
        TableName: process.env.SESSIONS_TABLE!,
        Item: marshall(sessionWithTTL),
      })
    );
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: process.env.SESSIONS_TABLE!,
        Key: marshall({ sessionId }),
      })
    );

    return result.Item ? (unmarshall(result.Item) as Session) : null;
  }

  async getUserSessions(userId: string, limit: number = 20): Promise<Session[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: process.env.SESSIONS_TABLE!,
        IndexName: 'UserSessionsIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({ ':userId': userId }),
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    return result.Items ? result.Items.map(item => unmarshall(item) as Session) : [];
  }

  // ==================== Short-term Memory ====================

  async createShortTermMemory(memory: ShortTermMemory): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: process.env.SHORT_TERM_MEMORY_TABLE!,
        Item: marshall(memory),
      })
    );
  }

  async getShortTermMemories(
    userId: string,
    language?: string,
    limit: number = 50
  ): Promise<ShortTermMemory[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: process.env.SHORT_TERM_MEMORY_TABLE!,
        IndexName: 'UserMemoryIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: marshall({ ':userId': userId }),
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    let memories = result.Items ? result.Items.map(item => unmarshall(item) as ShortTermMemory) : [];

    // Filter by language if specified
    if (language) {
      memories = memories.filter(m => m.language === language);
    }

    return memories;
  }

  // ==================== Long-term Memory ====================

  async upsertLongTermPattern(pattern: LongTermPattern): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: process.env.LONG_TERM_MEMORY_TABLE!,
        Item: marshall(pattern),
      })
    );
  }

  async getLongTermPatterns(
    userId: string,
    language?: string,
    patternType?: string
  ): Promise<LongTermPattern[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: process.env.LONG_TERM_MEMORY_TABLE!,
        IndexName: 'UserPatternsIndex',
        KeyConditionExpression: patternType
          ? 'userId = :userId AND patternType = :patternType'
          : 'userId = :userId',
        ExpressionAttributeValues: marshall(
          patternType
            ? { ':userId': userId, ':patternType': patternType }
            : { ':userId': userId }
        ),
      })
    );

    let patterns = result.Items ? result.Items.map(item => unmarshall(item) as LongTermPattern) : [];

    // Filter by language if specified
    if (language) {
      patterns = patterns.filter(p => p.language === language);
    }

    return patterns;
  }

  // ==================== Q-Learning ====================

  async getQValue(userId: string, language: string, stateKey: string, actionKey: string): Promise<number> {
    const stateActionKey = `${userId}#${language}#${stateKey}#${actionKey}`;

    const result = await this.client.send(
      new GetItemCommand({
        TableName: process.env.Q_TABLE!,
        Key: marshall({ stateActionKey }),
      })
    );

    return result.Item ? (unmarshall(result.Item) as QValue).qValue : 0.0;
  }

  async updateQValue(qValue: QValue): Promise<void> {
    qValue.stateActionKey = `${qValue.userId}#${qValue.language}#${qValue.stateKey}#${qValue.actionKey}`;

    await this.client.send(
      new PutItemCommand({
        TableName: process.env.Q_TABLE!,
        Item: marshall(qValue),
      })
    );
  }

  async getUserQValues(userId: string, language: string): Promise<QValue[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: process.env.Q_TABLE!,
        IndexName: 'UserQValuesIndex',
        KeyConditionExpression: 'userId = :userId AND language = :language',
        ExpressionAttributeValues: marshall({ ':userId': userId, ':language': language }),
      })
    );

    return result.Items ? result.Items.map(item => unmarshall(item) as QValue) : [];
  }

  // ==================== Vocabulary ====================

  async createVocabularyExercise(exercise: VocabularyExercise): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: process.env.VOCABULARY_TABLE!,
        Item: marshall(exercise),
      })
    );
  }

  async getVocabularyExercises(
    userId: string,
    language: string,
    dueOnly: boolean = false
  ): Promise<VocabularyExercise[]> {
    const now = new Date().toISOString();

    const result = await this.client.send(
      new QueryCommand({
        TableName: process.env.VOCABULARY_TABLE!,
        IndexName: 'UserVocabIndex',
        KeyConditionExpression: dueOnly
          ? 'userId = :userId AND nextReview <= :now'
          : 'userId = :userId',
        ExpressionAttributeValues: marshall(
          dueOnly ? { ':userId': userId, ':now': now } : { ':userId': userId }
        ),
      })
    );

    let exercises = result.Items ? result.Items.map(item => unmarshall(item) as VocabularyExercise) : [];

    // Filter by language
    exercises = exercises.filter(e => e.language === language);

    return exercises;
  }

  async updateVocabularyExercise(exercise: VocabularyExercise): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: process.env.VOCABULARY_TABLE!,
        Item: marshall(exercise),
      })
    );
  }
}
