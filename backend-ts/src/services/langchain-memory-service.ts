import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBChatMessageHistory } from '@langchain/community/stores/message/dynamodb';
import { BufferMemory, ConversationSummaryMemory } from 'langchain/memory';
import { ChatOpenAI } from '@langchain/openai';
import {
  RunnableWithMessageHistory,
  RunnablePassthrough,
  RunnableSequence
} from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder
} from '@langchain/core/prompts';
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage
} from '@langchain/core/messages';
import { Redis } from 'ioredis';
import { StringOutputParser } from '@langchain/core/output_parsers';

/**
 * LangChain Memory Service
 * Implements short-term and long-term memory using LangChain's built-in memory systems
 */
export class LangChainMemoryService {
  private dynamoClient: DynamoDBClient;
  private redis: Redis;
  private model: ChatOpenAI;
  private chatHistoryTable: string;

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Redis for caching and fast memory access
    this.redis = new Redis({
      host: process.env.REDIS_ENDPOINT || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.model = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.chatHistoryTable = process.env.CHAT_HISTORY_TABLE || 'ChatHistoryTable';
  }

  /**
   * Create a conversation chain with message history persistence
   * Uses DynamoDB for storing message history
   */
  async createConversationChain(
    sessionId: string,
    systemPrompt: string,
    options: {
      useCache?: boolean;
      maxTokens?: number;
      memoryType?: 'buffer' | 'summary' | 'window';
      windowSize?: number;
    } = {}
  ) {
    const {
      useCache = true,
      maxTokens = 1000,
      memoryType = 'buffer',
      windowSize = 10,
    } = options;

    // Create prompt template with message history placeholder
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      new MessagesPlaceholder('history'),
      ['human', '{input}'],
    ]);

    // Create base chain
    const baseChain = RunnableSequence.from([
      {
        input: (x: any) => x.input,
        history: (x: any) => x.history,
      },
      prompt,
      this.model,
      new StringOutputParser(),
    ]);

    // Wrap with message history
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: baseChain,
      getMessageHistory: async (sessionId: string) => {
        // Check cache first if enabled
        if (useCache) {
          const cachedHistory = await this.getCachedHistory(sessionId);
          if (cachedHistory) {
            return cachedHistory;
          }
        }

        // Create DynamoDB-backed message history
        const messageHistory = new DynamoDBChatMessageHistory({
          tableName: this.chatHistoryTable,
          partitionKey: 'sessionId',
          sessionId,
          client: this.dynamoClient,
          config: {
            ttl: 30 * 24 * 60 * 60, // 30 days TTL
          },
        });

        // Cache the history for faster subsequent access
        if (useCache) {
          await this.cacheHistory(sessionId, messageHistory);
        }

        return messageHistory;
      },
      inputMessagesKey: 'input',
      historyMessagesKey: 'history',
    });

    return chainWithHistory;
  }

  /**
   * Create conversation memory with buffer (stores all messages)
   */
  async createBufferMemory(sessionId: string): Promise<BufferMemory> {
    const messageHistory = new DynamoDBChatMessageHistory({
      tableName: this.chatHistoryTable,
      partitionKey: 'sessionId',
      sessionId,
      client: this.dynamoClient,
    });

    return new BufferMemory({
      chatHistory: messageHistory,
      returnMessages: true,
      memoryKey: 'history',
    });
  }

  /**
   * Create conversation memory with summary (summarizes old messages)
   * Useful for long conversations to save tokens
   */
  async createSummaryMemory(sessionId: string): Promise<ConversationSummaryMemory> {
    const messageHistory = new DynamoDBChatMessageHistory({
      tableName: this.chatHistoryTable,
      partitionKey: 'sessionId',
      sessionId,
      client: this.dynamoClient,
    });

    return new ConversationSummaryMemory({
      llm: this.model,
      chatHistory: messageHistory,
      returnMessages: true,
      memoryKey: 'history',
    });
  }

  /**
   * Get chat history from cache (Redis)
   */
  private async getCachedHistory(sessionId: string): Promise<DynamoDBChatMessageHistory | null> {
    try {
      const cached = await this.redis.get(`chat_history:${sessionId}`);
      if (!cached) return null;

      const messages = JSON.parse(cached);

      // Reconstruct message history from cached data
      const messageHistory = new DynamoDBChatMessageHistory({
        tableName: this.chatHistoryTable,
        partitionKey: 'sessionId',
        sessionId,
        client: this.dynamoClient,
      });

      return messageHistory;
    } catch (error) {
      console.error('Error getting cached history:', error);
      return null;
    }
  }

  /**
   * Cache chat history in Redis for fast access
   */
  private async cacheHistory(
    sessionId: string,
    messageHistory: DynamoDBChatMessageHistory
  ): Promise<void> {
    try {
      const messages = await messageHistory.getMessages();
      await this.redis.setex(
        `chat_history:${sessionId}`,
        3600, // 1 hour cache
        JSON.stringify(messages.map(msg => ({
          type: msg._getType(),
          content: msg.content,
        })))
      );
    } catch (error) {
      console.error('Error caching history:', error);
    }
  }

  /**
   * Invoke conversation with message history
   */
  async invokeConversation(
    chainWithHistory: RunnableWithMessageHistory<any, any>,
    userMessage: string,
    sessionId: string,
    additionalContext: Record<string, any> = {}
  ): Promise<string> {
    const response = await chainWithHistory.invoke(
      {
        input: userMessage,
        ...additionalContext,
      },
      {
        configurable: {
          sessionId,
        },
      }
    );

    return response;
  }

  /**
   * Get conversation history for a session
   */
  async getConversationHistory(sessionId: string): Promise<BaseMessage[]> {
    const messageHistory = new DynamoDBChatMessageHistory({
      tableName: this.chatHistoryTable,
      partitionKey: 'sessionId',
      sessionId,
      client: this.dynamoClient,
    });

    return await messageHistory.getMessages();
  }

  /**
   * Clear conversation history for a session
   */
  async clearHistory(sessionId: string): Promise<void> {
    const messageHistory = new DynamoDBChatMessageHistory({
      tableName: this.chatHistoryTable,
      partitionKey: 'sessionId',
      sessionId,
      client: this.dynamoClient,
    });

    await messageHistory.clear();

    // Clear cache
    await this.redis.del(`chat_history:${sessionId}`);
  }

  /**
   * Add message to history manually
   */
  async addMessage(
    sessionId: string,
    message: BaseMessage
  ): Promise<void> {
    const messageHistory = new DynamoDBChatMessageHistory({
      tableName: this.chatHistoryTable,
      partitionKey: 'sessionId',
      sessionId,
      client: this.dynamoClient,
    });

    await messageHistory.addMessage(message);

    // Invalidate cache
    await this.redis.del(`chat_history:${sessionId}`);
  }

  /**
   * Trim conversation history to last N messages
   * Useful for managing context window size
   */
  async trimHistory(sessionId: string, keepLast: number = 10): Promise<void> {
    const messageHistory = new DynamoDBChatMessageHistory({
      tableName: this.chatHistoryTable,
      partitionKey: 'sessionId',
      sessionId,
      client: this.dynamoClient,
    });

    const messages = await messageHistory.getMessages();

    if (messages.length > keepLast) {
      // Clear all messages
      await messageHistory.clear();

      // Re-add last N messages
      const lastMessages = messages.slice(-keepLast);
      for (const msg of lastMessages) {
        await messageHistory.addMessage(msg);
      }
    }

    // Invalidate cache
    await this.redis.del(`chat_history:${sessionId}`);
  }

  /**
   * Get conversation summary (useful for long conversations)
   */
  async getConversationSummary(sessionId: string): Promise<string> {
    const messages = await this.getConversationHistory(sessionId);

    if (messages.length === 0) {
      return 'No conversation history available.';
    }

    // Use LLM to generate summary
    const summaryPrompt = ChatPromptTemplate.fromMessages([
      ['system', 'Summarize the following conversation in 2-3 sentences, focusing on key topics and learning progress:'],
      ['human', '{conversation}'],
    ]);

    const chain = summaryPrompt.pipe(this.model).pipe(new StringOutputParser());

    const conversationText = messages.map(msg =>
      `${msg._getType()}: ${msg.content}`
    ).join('\n');

    const summary = await chain.invoke({
      conversation: conversationText,
    });

    return summary;
  }

  /**
   * Store memory pattern in Redis for quick access
   */
  async storeMemoryPattern(
    userId: string,
    language: string,
    patternType: string,
    patternData: any,
    expirySeconds: number = 24 * 60 * 60 // 24 hours
  ): Promise<void> {
    const key = `memory_pattern:${userId}:${language}:${patternType}`;
    await this.redis.setex(key, expirySeconds, JSON.stringify(patternData));
  }

  /**
   * Get memory pattern from Redis
   */
  async getMemoryPattern(
    userId: string,
    language: string,
    patternType: string
  ): Promise<any | null> {
    const key = `memory_pattern:${userId}:${language}:${patternType}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
