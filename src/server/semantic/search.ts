import { getApiPool } from '../db/connection.js';
import { getEmbedding } from './embedding.js';
import { getSemanticCapability } from './capability.js';

export interface SemanticResult {
  id: string;
  similarity: number;
  matchReason: 'semantic';
}

export async function searchDocumentsSemantic(
  query: string,
  limit: number = 50,
): Promise<SemanticResult[]> {
  const capability = await getSemanticCapability();
  if (!capability.available) {
    throw new Error(`Semantic search unavailable: ${capability.reason}`);
  }

  const embedding = await getEmbedding(query);
  const pool = getApiPool();

  const res = await pool.query<{ id: string; similarity: number }>(
    `
    SELECT id, 1 - (content_embedding <=> $1::vector) as similarity
    FROM documents
    WHERE content_embedding IS NOT NULL
    ORDER BY content_embedding <=> $1::vector
    LIMIT $2
    `,
    [JSON.stringify(embedding), limit],
  );

  return res.rows.map((row) => ({
    id: String(row.id),
    similarity: row.similarity,
    matchReason: 'semantic',
  }));
}

export async function searchEntitiesSemantic(
  query: string,
  limit: number = 50,
): Promise<SemanticResult[]> {
  const capability = await getSemanticCapability();
  if (!capability.available) {
    throw new Error(`Semantic search unavailable: ${capability.reason}`);
  }

  const embedding = await getEmbedding(query);
  const pool = getApiPool();

  const res = await pool.query<{ id: string; similarity: number }>(
    `
    SELECT id, 1 - (description_embedding <=> $1::vector) as similarity
    FROM entities
    WHERE description_embedding IS NOT NULL
    ORDER BY description_embedding <=> $1::vector
    LIMIT $2
    `,
    [JSON.stringify(embedding), limit],
  );

  return res.rows.map((row) => ({
    id: String(row.id),
    similarity: row.similarity,
    matchReason: 'semantic',
  }));
}
