import { getApiPool } from '../db/connection.js';
import { logger } from '../services/Logger.js';

export interface SemanticCapability {
  available: boolean;
  reason?: string;
  provider?: 'pgvector';
  documentEmbeddings?: number;
  entityEmbeddings?: number;
  supportedModels?: string[];
}

/**
 * Detects if the database supports pgvector and semantic search columns.
 * Designed to degrade gracefully without throwing.
 */
export async function getSemanticCapability(): Promise<SemanticCapability> {
  try {
    const pool = getApiPool();

    // 1. Check if pgvector extension is installed
    const extensionRes = await pool.query<{ installed: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as installed",
    );

    if (!extensionRes.rows[0]?.installed) {
      return { available: false, reason: 'pgvector extension not installed in database' };
    }

    // 2. Check if embedding columns exist in documents and entities
    const columnRes = await pool.query<{ tableName: string; columnName: string }>(`
      SELECT table_name as "tableName", column_name as "columnName"
      FROM information_schema.columns
      WHERE (table_name = 'documents' AND column_name = 'content_embedding')
         OR (table_name = 'entities' AND column_name = 'description_embedding')
    `);

    if (columnRes.rows.length < 2) {
      return {
        available: false,
        reason: 'Missing required embedding columns (content_embedding or description_embedding)',
      };
    }

    const [documentEmbeddingRes, entityEmbeddingRes] = await Promise.all([
      pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM documents WHERE content_embedding IS NOT NULL',
      ),
      pool.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM entities WHERE description_embedding IS NOT NULL',
      ),
    ]);

    const documentEmbeddings = Number(documentEmbeddingRes.rows[0]?.count || 0);
    const entityEmbeddings = Number(entityEmbeddingRes.rows[0]?.count || 0);

    if (documentEmbeddings === 0 && entityEmbeddings === 0) {
      return {
        available: false,
        reason: 'pgvector is installed, but no document or entity embeddings are populated',
        provider: 'pgvector',
        documentEmbeddings,
        entityEmbeddings,
      };
    }

    return { available: true, provider: 'pgvector', documentEmbeddings, entityEmbeddings };
  } catch (error) {
    logger.warn({ err: error }, '[semantic] capability detection failed');
    return {
      available: false,
      reason: error instanceof Error ? error.message : 'Unknown database error during detection',
    };
  }
}
