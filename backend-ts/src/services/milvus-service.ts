import { MilvusClient, DataType, IndexType, MetricType } from '@zilliz/milvus2-sdk-node';
import { OpenAIEmbeddings } from '@langchain/openai';

/**
 * Milvus Vector Database Service
 * Handles document embeddings storage and similarity search for RAG system
 */
export class MilvusService {
  private client: MilvusClient;
  private embeddings: OpenAIEmbeddings;
  private collectionName: string;

  constructor() {
    this.client = new MilvusClient({
      address: `${process.env.MILVUS_ENDPOINT}:${process.env.MILVUS_PORT || '19530'}`,
      timeout: 30000, // 30 seconds
    });

    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-small', // Latest OpenAI embedding model
      openAIApiKey: process.env.OPENAI_API_KEY,
      dimensions: 1536, // Embedding dimension
    });

    this.collectionName = 'learno_documents';
  }

  /**
   * Initialize Milvus collection for document embeddings
   */
  async initializeCollection(): Promise<void> {
    try {
      // Check if collection exists
      const { value: hasCollection } = await this.client.hasCollection({
        collection_name: this.collectionName,
      });

      if (!hasCollection) {
        // Create collection schema
        await this.client.createCollection({
          collection_name: this.collectionName,
          fields: [
            {
              name: 'id',
              description: 'Unique ID for each chunk',
              data_type: DataType.VarChar,
              is_primary_key: true,
              max_length: 100,
            },
            {
              name: 'documentId',
              description: 'Document ID from PostgreSQL',
              data_type: DataType.VarChar,
              max_length: 100,
            },
            {
              name: 'userId',
              description: 'User ID who uploaded document',
              data_type: DataType.VarChar,
              max_length: 100,
            },
            {
              name: 'language',
              description: 'Language of the document',
              data_type: DataType.VarChar,
              max_length: 50,
            },
            {
              name: 'chunkIndex',
              description: 'Index of chunk in document',
              data_type: DataType.Int64,
            },
            {
              name: 'content',
              description: 'Text content of chunk',
              data_type: DataType.VarChar,
              max_length: 5000,
            },
            {
              name: 'embedding',
              description: 'Vector embedding of content',
              data_type: DataType.FloatVector,
              dim: 1536, // OpenAI embedding dimension
            },
            {
              name: 'metadata',
              description: 'Additional metadata as JSON',
              data_type: DataType.VarChar,
              max_length: 2000,
            },
          ],
        });

        // Create index for vector field
        await this.client.createIndex({
          collection_name: this.collectionName,
          field_name: 'embedding',
          index_type: IndexType.IVF_FLAT,
          metric_type: MetricType.L2,
          params: { nlist: 1024 },
        });

        // Load collection into memory
        await this.client.loadCollection({
          collection_name: this.collectionName,
        });

        console.log('Milvus collection initialized successfully');
      } else {
        // Load existing collection
        await this.client.loadCollection({
          collection_name: this.collectionName,
        });
        console.log('Milvus collection loaded successfully');
      }
    } catch (error) {
      console.error('Error initializing Milvus collection:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text chunks
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return await this.embeddings.embedDocuments(texts);
  }

  /**
   * Generate embedding for a single query
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    return await this.embeddings.embedQuery(query);
  }

  /**
   * Insert document chunks with embeddings into Milvus
   */
  async insertDocumentChunks(
    documentId: string,
    userId: string,
    language: string,
    chunks: Array<{
      chunkIndex: number;
      content: string;
      metadata?: any;
    }>
  ): Promise<string[]> {
    try {
      // Generate embeddings for all chunks
      const contents = chunks.map(c => c.content);
      const embeddings = await this.generateEmbeddings(contents);

      // Prepare data for insertion
      const ids = chunks.map((_, idx) => `${documentId}_${idx}`);
      const documentIds = chunks.map(() => documentId);
      const userIds = chunks.map(() => userId);
      const languages = chunks.map(() => language);
      const chunkIndices = chunks.map(c => c.chunkIndex);
      const metadataStrings = chunks.map(c => JSON.stringify(c.metadata || {}));

      // Insert into Milvus
      const insertResult = await this.client.insert({
        collection_name: this.collectionName,
        fields_data: [
          {
            field_name: 'id',
            data: ids,
          },
          {
            field_name: 'documentId',
            data: documentIds,
          },
          {
            field_name: 'userId',
            data: userIds,
          },
          {
            field_name: 'language',
            data: languages,
          },
          {
            field_name: 'chunkIndex',
            data: chunkIndices,
          },
          {
            field_name: 'content',
            data: contents,
          },
          {
            field_name: 'embedding',
            data: embeddings,
          },
          {
            field_name: 'metadata',
            data: metadataStrings,
          },
        ],
      });

      // Flush to make data queryable immediately
      await this.client.flush({
        collection_names: [this.collectionName],
      });

      console.log(`Inserted ${chunks.length} chunks into Milvus`);
      return ids;
    } catch (error) {
      console.error('Error inserting document chunks:', error);
      throw error;
    }
  }

  /**
   * Search for similar document chunks
   */
  async searchSimilarChunks(
    query: string,
    language: string,
    userId?: string,
    topK: number = 5,
    minScore: number = 0.7
  ): Promise<Array<{
    id: string;
    documentId: string;
    content: string;
    chunkIndex: number;
    score: number;
    metadata: any;
  }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Build filter expression
      let expr = `language == "${language}"`;
      if (userId) {
        expr += ` && userId == "${userId}"`;
      }

      // Search in Milvus
      const searchResult = await this.client.search({
        collection_name: this.collectionName,
        vector: queryEmbedding,
        filter: expr,
        limit: topK,
        metric_type: MetricType.L2,
        params: { nprobe: 10 },
        output_fields: ['id', 'documentId', 'content', 'chunkIndex', 'metadata'],
      });

      // Process results
      const results = searchResult.results.map((result: any) => ({
        id: result.id,
        documentId: result.documentId,
        content: result.content,
        chunkIndex: result.chunkIndex,
        score: 1 / (1 + result.score), // Convert L2 distance to similarity score
        metadata: JSON.parse(result.metadata || '{}'),
      }))
      .filter((r: any) => r.score >= minScore);

      return results;
    } catch (error) {
      console.error('Error searching Milvus:', error);
      throw error;
    }
  }

  /**
   * Delete document from Milvus
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.client.delete({
        collection_name: this.collectionName,
        filter: `documentId == "${documentId}"`,
      });

      console.log(`Deleted document ${documentId} from Milvus`);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Delete all chunks for a user's language
   */
  async deleteUserLanguageData(userId: string, language: string): Promise<void> {
    try {
      await this.client.delete({
        collection_name: this.collectionName,
        filter: `userId == "${userId}" && language == "${language}"`,
      });

      console.log(`Deleted all data for user ${userId}, language ${language}`);
    } catch (error) {
      console.error('Error deleting user language data:', error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<{
    totalChunks: number;
    isLoaded: boolean;
  }> {
    try {
      const stats = await this.client.getCollectionStatistics({
        collection_name: this.collectionName,
      });

      const loadState = await this.client.getLoadState({
        collection_name: this.collectionName,
      });

      return {
        totalChunks: parseInt(stats.data.row_count),
        isLoaded: loadState.state === 'LoadStateLoaded',
      };
    } catch (error) {
      console.error('Error getting collection stats:', error);
      return { totalChunks: 0, isLoaded: false };
    }
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: string,
    language: string,
    keywords: string[],
    userId?: string,
    topK: number = 5
  ): Promise<Array<{
    id: string;
    documentId: string;
    content: string;
    chunkIndex: number;
    score: number;
    metadata: any;
  }>> {
    try {
      // Get semantic search results
      const semanticResults = await this.searchSimilarChunks(query, language, userId, topK * 2);

      // Filter by keywords if provided
      if (keywords.length > 0) {
        const filtered = semanticResults.filter(result => {
          const contentLower = result.content.toLowerCase();
          return keywords.some(keyword => contentLower.includes(keyword.toLowerCase()));
        });

        return filtered.slice(0, topK);
      }

      return semanticResults.slice(0, topK);
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Close Milvus client connection
   */
  async close(): Promise<void> {
    // Milvus client doesn't require explicit close
    console.log('Milvus client closed');
  }
}
