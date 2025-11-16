import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.DOCUMENTS_BUCKET || '';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  try {
    const method = event.httpMethod;

    if (method === 'POST') {
      return await handleDocumentAction(event, headers);
    } else if (method === 'GET') {
      return await getDocuments(event, headers);
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }
  } catch (error) {
    console.error('Document handler error:', error);
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

async function handleDocumentAction(
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');
  const { action } = body;

  switch (action) {
    case 'get_upload_url':
      return await getUploadUrl(body, headers);
    case 'get_download_url':
      return await getDownloadUrl(body, headers);
    case 'upload_text':
      return await uploadTextDocument(body, headers);
    case 'process_document':
      return await processDocument(body, headers);
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
  }
}

/**
 * Generate presigned URL for secure document upload
 */
async function getUploadUrl(
  data: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const { userId, language, fileName, contentType } = data;

  if (!userId || !language || !fileName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId, language, and fileName are required' }),
    };
  }

  const documentId = uuidv4();
  const key = `documents/${userId}/${language}/${documentId}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
    Metadata: {
      userId,
      language,
      documentId,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate presigned URL valid for 15 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      uploadUrl,
      documentId,
      key,
      message: 'Upload your file to this URL using PUT request',
    }),
  };
}

/**
 * Generate presigned URL for secure document download
 */
async function getDownloadUrl(
  data: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const { key } = data;

  if (!key) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'key is required' }),
    };
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // Generate presigned URL valid for 1 hour
  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ downloadUrl }),
  };
}

/**
 * Upload text content directly (for pasted text or small documents)
 */
async function uploadTextDocument(
  data: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const { userId, language, content, title, documentType } = data;

  if (!userId || !language || !content || !title) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'userId, language, content, and title are required' }),
    };
  }

  const documentId = uuidv4();
  const key = `documents/${userId}/${language}/${documentId}/${title}.txt`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: 'text/plain',
    Metadata: {
      userId,
      language,
      documentId,
      documentType: documentType || 'text',
      uploadedAt: new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      documentId,
      key,
      message: 'Document uploaded successfully',
    }),
  };
}

/**
 * Process document for RAG system (chunking, embedding, indexing)
 */
async function processDocument(
  data: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> {
  const { documentId, key, userId, language } = data;

  if (!key || !userId || !language) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'key, userId, and language are required' }),
    };
  }

  try {
    // Retrieve document from S3
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(getCommand);
    const content = await streamToString(response.Body);

    // Process document for RAG
    const chunks = chunkDocument(content);
    const metadata = {
      documentId: documentId || uuidv4(),
      userId,
      language,
      key,
      chunkCount: chunks.length,
      processedAt: new Date().toISOString(),
    };

    // Store chunks in S3 with metadata for RAG retrieval
    const chunksKey = `processed/${userId}/${language}/${metadata.documentId}/chunks.json`;
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: chunksKey,
      Body: JSON.stringify({ chunks, metadata }),
      ContentType: 'application/json',
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documentId: metadata.documentId,
        chunksKey,
        chunkCount: chunks.length,
        message: 'Document processed successfully for RAG system',
      }),
    };
  } catch (error) {
    console.error('Document processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process document',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Get list of documents for a user and language
 */
async function getDocuments(
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

  const prefix = `documents/${userId}/${language}/`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  const documents = (response.Contents || []).map((item) => ({
    key: item.Key,
    size: item.Size,
    lastModified: item.LastModified?.toISOString(),
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ documents, count: documents.length }),
  };
}

/**
 * Helper function to convert stream to string
 */
async function streamToString(stream: any): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * Chunk document into smaller pieces for RAG system
 * Uses simple sentence-based chunking with overlap
 */
function chunkDocument(content: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if ((currentChunk + trimmedSentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Add overlap by keeping last part of current chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 10));
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
