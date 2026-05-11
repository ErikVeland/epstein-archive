import { adminQueries, analyticsQueries, graphQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

function runQuery<TParams, TResult>(query: unknown, params: TParams): Promise<TResult[]> {
  return (
    query as { run: (p: TParams, c: ReturnType<typeof getApiPool>) => Promise<TResult[]> }
  ).run(params, getApiPool());
}

export async function getDatabaseMetadata() {
  const rows = await runQuery<undefined, Record<string, unknown>>(
    adminQueries.getDbMeta,
    undefined,
  );
  return rows;
}

export async function getEntityAndDocumentCounts() {
  const rows = await runQuery<
    undefined,
    { entities?: string | number; documents?: string | number }
  >(analyticsQueries.getTotalCounts, undefined);
  const counts = rows[0];
  return {
    entities: Number(counts?.entities || 0),
    documents: Number(counts?.documents || 0),
  };
}

export async function pingDatabase() {
  await getApiPool().query('SELECT 1');
}

export async function getCurrentDatabaseSizeBytes(): Promise<number | null> {
  const { rows } = await getApiPool().query<{ size_bytes: string | number | null }>(
    'SELECT pg_database_size(current_database()) AS size_bytes',
  );
  const raw = rows[0]?.size_bytes;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const ALLOWED_CRITICAL_TABLES = new Set([
  'entities',
  'documents',
  'entity_relationships',
  'entity_mentions',
  'investigations',
  'black_book_entries',
  'media_items',
  'media_albums',
  'refresh_tokens',
  'users',
]);

export async function getCriticalTableCounts(tables: string[]) {
  const results: Record<
    string,
    {
      ok: boolean;
      count: number;
      error?: string;
    }
  > = {};
  for (const table of tables) {
    if (!ALLOWED_CRITICAL_TABLES.has(table)) {
      results[table] = { ok: false, count: 0, error: `Table "${table}" not in allowlist` };
      continue;
    }
    try {
      const { rows } = await getApiPool().query(`SELECT COUNT(*) as count FROM ${table}`);
      results[table] = { ok: true, count: Number(rows[0].count) };
    } catch (e) {
      results[table] = {
        ok: false,
        count: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
  return results;
}

export async function getSampleEntityWithMentions() {
  const { rows } = await getApiPool().query(
    'SELECT id, full_name FROM entities WHERE mentions > 0 LIMIT 1',
  );
  return rows[0] as { id: number; full_name: string } | undefined;
}

export async function insertUploadedDocument(params: {
  fileName: string;
  filePath: string;
  mimetype: string;
  size: number;
  title: string;
  metadataJson: string;
}) {
  const { rows } = await getApiPool().query(
    `
      INSERT INTO documents (
        file_name, 
        file_path, 
        file_type, 
        file_size, 
        date_created, 
        title, 
        metadata_json,
        red_flag_rating
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, 0)
      RETURNING id
    `,
    [
      params.fileName,
      params.filePath,
      params.mimetype,
      params.size,
      params.title,
      params.metadataJson,
    ],
  );
  return rows[0].id;
}

export async function getEvidenceTypes() {
  const { rows } = await getApiPool().query(
    `
      SELECT evidence_type as type, COUNT(*) as count 
      FROM documents 
      WHERE evidence_type IS NOT NULL 
      GROUP BY evidence_type
    `,
  );
  return rows as Array<{ type: string; count: number }>;
}

export async function resetJunkFlags() {
  const rows = await runQuery<undefined, Record<string, unknown>>(
    adminQueries.resetJunkFlags,
    undefined,
  );
  return rows.length; // Or return total count if we change resetJunkFlags to return count
}

export async function listUsers() {
  const rows = await runQuery<undefined, Record<string, unknown>>(
    adminQueries.listUsers,
    undefined,
  );
  return rows;
}

export async function getUserById(id: string) {
  const rows = await runQuery<{ id: string }, Record<string, unknown>>(adminQueries.getUserById, {
    id,
  });
  return rows[0];
}

export async function createUser(params: {
  id: string;
  username: string;
  email: string | null;
  role: string;
  passwordHash: string;
}) {
  await runQuery<typeof params, Record<string, unknown>>(adminQueries.createUser, params);
}

export async function updateUser(
  id: string,
  fields: {
    username?: string;
    email?: string;
    role?: string;
    passwordHash?: string;
  },
) {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (fields.username) {
    updates.push(`username = $${params.length + 1}`);
    params.push(fields.username);
  }
  if (fields.email) {
    updates.push(`email = $${params.length + 1}`);
    params.push(fields.email);
  }
  if (fields.role) {
    updates.push(`role = $${params.length + 1}`);
    params.push(fields.role);
  }
  if (fields.passwordHash) {
    updates.push(`password_hash = $${params.length + 1}`);
    params.push(fields.passwordHash);
  }

  if (updates.length === 0) {
    return;
  }

  params.push(id);
  await getApiPool().query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`,
    params,
  );
}

export async function deleteUser(id: string) {
  await getApiPool().query('DELETE FROM users WHERE id = $1', [id]);
}

// DEPRECATED: Review Queue logic moved to reviewQueueRepository.ts

export async function getMapEntities(minRisk: number, limit: number) {
  return runQuery<{ minRisk: number; limit: number }, Record<string, unknown>>(
    graphQueries.getMapEntities,
    { minRisk, limit },
  );
}

export interface WebVitalsPayload {
  sessionId: string;
  route: string;
  cls: number;
  lcp: number;
  inp: number;
  longTaskCount: number;
}

export async function recordWebVitals(payload: WebVitalsPayload) {
  await runQuery<WebVitalsPayload, Record<string, unknown>>(
    analyticsQueries.recordWebVitals,
    payload,
  );
}

export async function getWebVitalsAggregates(days: number) {
  return runQuery<{ days: string }, Record<string, unknown>>(
    analyticsQueries.getWebVitalsAggregates,
    {
      days: days.toString(),
    },
  );
}

export async function getWebVitalsAggregatesAverage(days: number) {
  return runQuery<{ days: string }, Record<string, unknown>>(
    analyticsQueries.getWebVitalsAggregatesAverage,
    {
      days: days.toString(),
    },
  );
}

export async function getGraphCommunities() {
  return runQuery<undefined, Record<string, unknown>>(graphQueries.getGraphCommunities, undefined);
}

export async function getEmailThreadMessageHeaders(threadId: string) {
  const pool = getApiPool();
  const { rows } = await pool.query(
    `
    SELECT
      d.id AS "messageId",
      COALESCE(
        d.metadata_json ->> 'thread_id',
        d.metadata_json ->> 'threadId',
        d.metadata_json ->> 'conversation_id',
        d.metadata_json ->> 'message_id',
        d.id::text
      ) AS "threadId",
      COALESCE(d.metadata_json ->> 'subject', d.file_name, d.title, 'No Subject') AS subject,
      COALESCE(d.metadata_json ->> 'from', '') AS "fromAddress",
      COALESCE(d.metadata_json ->> 'to', '') AS "toAddresses",
      COALESCE(d.metadata_json ->> 'cc', '') AS "ccAddresses",
      COALESCE(d.date_created, '1970-01-01T00:00:00.000Z') AS "dateCreated",
      COALESCE(d.content_refined, '') AS snippet,
      CASE WHEN (COALESCE(d.metadata_json ->> 'attachments_count', '0'))::int > 0 THEN 1 ELSE 0 END AS "hasAttachments",
      COALESCE(d.metadata_json ->> 'attachments', '[]') AS "attachmentsMetaRaw",
      NULL AS "ingestRunId",
      NULL AS "pipelineVersion",
      COALESCE(d.metadata_json ->> 'confidence', d.metadata_json ->> 'significance_score') AS confidence,
      COALESCE(d.metadata_json ->> 'ladder', d.metadata_json ->> 'evidence_ladder') AS ladder,
      COALESCE((d.metadata_json ->> 'was_agentic')::int, 0) AS "wasAgentic",
      d.red_flag_rating AS "redFlagRating"
    FROM documents d
    WHERE d.evidence_type = 'email'
      AND COALESCE(
        d.metadata_json ->> 'thread_id',
        d.metadata_json ->> 'threadId',
        d.metadata_json ->> 'conversation_id',
        d.metadata_json ->> 'message_id',
        d.id::text
      ) = $1
    ORDER BY "dateCreated" ASC, d.id ASC
    `,
    [threadId],
  );
  return rows;
}

export async function getEmailLinkedEntitiesForMessages(messageIds: number[]) {
  if (messageIds.length === 0) return [];
  const pool = getApiPool();
  const placeholders = messageIds.map((_, idx) => `$${idx + 1}`).join(',');
  const { rows } = await pool.query(
    `
      SELECT
        em.document_id AS "messageId",
        em.entity_id AS "entityId",
        e.full_name AS name,
        e.primary_role AS role
      FROM entity_mentions em
      JOIN entities e ON e.id = em.entity_id
      WHERE em.document_id IN (${placeholders})
      ORDER BY em.document_id ASC, e.full_name ASC
    `,
    messageIds,
  );
  return rows;
}

export async function getEmailLinkedEntitiesForThreads(
  threadIds: string[],
): Promise<Array<{ threadId: string; entityId: number; name: string }>> {
  if (threadIds.length === 0) return [];
  const pool = getApiPool();
  const { rows } = await pool.query<{ threadId: string; entityId: number; name: string }>(
    `
    SELECT
      COALESCE(d.metadata_json->>'thread_id', d.id::text) AS "threadId",
      e.id AS "entityId",
      e.full_name AS name
    FROM documents d
    JOIN entity_mentions em ON d.id = em.document_id
    JOIN entities e ON em.entity_id = e.id
    WHERE d.evidence_type = 'email'
      AND COALESCE(d.metadata_json->>'thread_id', d.id::text) = ANY($1)
    GROUP BY "threadId", e.id, e.full_name
    ORDER BY "threadId", e.full_name
    `,
    [threadIds],
  );
  return rows;
}

export async function getEmailMessageBodyRecord(messageId: string) {
  const pool = getApiPool();
  const { rows } = await pool.query(
    `
    SELECT
      d.id,
      d.content,
      d.content_refined AS content_preview,
      d.metadata_json,
      NULL AS "ingestRunId",
      NULL AS "pipelineVersion",
      d.date_created AS "dateCreated",
      d.file_name AS "fileName",
      d.file_path AS "filePath"
    FROM documents d
    WHERE d.evidence_type = 'email' AND d.id = $1
    LIMIT 1
    `,
    [messageId],
  );
  return rows[0];
}

export async function getEmailMessageThreadPointer(messageId: string) {
  const pool = getApiPool();
  const { rows } = await pool.query(
    `
    SELECT
      id,
      metadata_json
    FROM documents
    WHERE evidence_type = 'email' AND id = $1
    LIMIT 1
    `,
    [messageId],
  );
  return rows[0];
}

export async function getEmailRawMessageRecord(messageId: string) {
  const pool = getApiPool();
  const { rows } = await pool.query(
    `
    SELECT id, content, metadata_json
    FROM documents
    WHERE evidence_type = 'email' AND id = $1
    LIMIT 1
    `,
    [messageId],
  );
  return rows[0];
}

export async function searchEmailMessagesLegacy(params: {
  q: string;
  mailboxEntityId?: number | null;
  limit: number;
}) {
  const pool = getApiPool();
  let mailboxClause = '';
  const sqlParams: Array<string | number> = [];
  if (
    params.mailboxEntityId &&
    Number.isFinite(params.mailboxEntityId) &&
    params.mailboxEntityId > 0
  ) {
    mailboxClause = `
      AND EXISTS (
        SELECT 1 FROM entity_mentions em
        WHERE em.document_id = d.id AND em.entity_id = $1
      )
    `;
    sqlParams.push(params.mailboxEntityId);
  }

  const like = `%${params.q.toLowerCase()}%`;
  const offset = sqlParams.length;
  const sql = `
      SELECT
        d.id AS "messageId",
        COALESCE(
          d.metadata_json ->> 'thread_id',
          d.metadata_json ->> 'threadId',
          d.metadata_json ->> 'conversation_id',
          d.metadata_json ->> 'message_id',
          d.id::text
        ) AS "threadId",
        COALESCE(d.metadata_json ->> 'subject', d.file_name, d.title, 'No Subject') AS subject,
        COALESCE(d.metadata_json ->> 'from', '') AS "fromAddress",
        COALESCE(d.date_created, '1970-01-01T00:00:00.000Z') AS "dateCreated",
        COALESCE(d.content_refined, '') AS snippet
      FROM documents d
      WHERE d.evidence_type = 'email'
        ${mailboxClause}
        AND (
          lower(COALESCE(d.metadata_json ->> 'subject', '')) LIKE $${offset + 1}
          OR lower(COALESCE(d.metadata_json ->> 'from', '')) LIKE $${offset + 1}
          OR lower(COALESCE(d.metadata_json ->> 'to', '')) LIKE $${offset + 1}
          OR lower(COALESCE(d.content_refined, '')) LIKE $${offset + 1}
        )
      ORDER BY COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) DESC, d.id ASC
      LIMIT $${offset + 2}
    `;
  const { rows } = await pool.query(sql, [...sqlParams, like, params.limit]);
  return rows;
}

export async function getEmailDocumentContentById(id: string) {
  const pool = getApiPool();
  const { rows } = await pool.query(
    `
      SELECT content FROM documents WHERE id = $1 AND evidence_type = 'email'
      `,
    [id],
  );
  return rows[0];
}

/**
 * Find shortest hop-count path between two entities using a single BFS recursive CTE.
 * Replaces the prior JS Dijkstra loop that issued one DB query per visited node (up to 5000).
 *
 * Returns an ordered array of canonical_id strings forming the path, or null if unreachable
 * within MAX_DEPTH hops.
 */
export async function findShortestPath(
  sourceId: string,
  targetId: string,
  startDate?: string,
  endDate?: string,
): Promise<string[] | null> {
  const MAX_DEPTH = 7;
  const pool = getApiPool();

  const { rows } = await pool.query<{ path: string[] }>(
    `
    WITH RECURSIVE
    -- Materialise the date-filtered adjacency once so the BFS join is cheap.
    adj(entity_id, neighbor_id) AS (
      SELECT DISTINCT s.canonical_id, t.canonical_id
      FROM entity_relationships er
      JOIN entities s ON er.source_entity_id = s.id
      JOIN entities t ON er.target_entity_id = t.id
      WHERE s.canonical_id != t.canonical_id
        AND ($3::timestamptz IS NULL OR er.first_seen_at <= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR er.last_seen_at  >= $4::timestamptz)
    ),
    bfs(current_id, path, depth) AS (
      -- Seed: direct neighbours of the source node
      SELECT a.neighbor_id,
             ARRAY[$1::bigint, a.neighbor_id],
             1
      FROM adj a
      WHERE a.entity_id = $1::bigint
        AND a.neighbor_id != $1::bigint

      UNION ALL

      -- Expand one hop at a time; stop once the target is the frontier node
      SELECT a.neighbor_id,
             b.path || a.neighbor_id,
             b.depth + 1
      FROM bfs b
      JOIN adj a ON a.entity_id = b.current_id
      WHERE b.depth < $5
        AND NOT (a.neighbor_id = ANY(b.path))  -- no cycles
        AND b.current_id != $2::bigint          -- don't expand past the target
    )
    SELECT path::text[] AS path
    FROM bfs
    WHERE current_id = $2::bigint
    ORDER BY depth ASC
    LIMIT 1
    `,
    [sourceId, targetId, startDate ?? null, endDate ?? null, MAX_DEPTH],
  );

  if (rows.length === 0) return null;
  return rows[0].path;
}

export async function getGraphPathNodes(pathNodes: string[]) {
  return runQuery<{ pathNodes: string[] }, Record<string, unknown>>(
    graphQueries.getGraphPathNodes,
    {
      pathNodes,
    },
  );
}

export async function getGraphPathEdges(pathNodes: string[], startDate?: string, endDate?: string) {
  return runQuery<
    { pathNodes: string[]; startDate: string | null; endDate: string | null },
    Record<string, unknown>
  >(graphQueries.getGraphPathEdges, {
    pathNodes,
    startDate: startDate || null,
    endDate: endDate || null,
  });
}

export async function getGlobalGraphNodes(params: {
  minRisk: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}) {
  return runQuery<
    { minRisk: number; limit: number; startDate: string | null; endDate: string | null },
    Record<string, unknown>
  >(graphQueries.getGlobalGraphNodes, {
    minRisk: params.minRisk,
    limit: params.limit,
    startDate: params.startDate || null,
    endDate: params.endDate || null,
  });
}

export async function getGlobalGraphEdges(params: {
  canonicalIds: string[];
  startDate?: string;
  endDate?: string;
}) {
  return runQuery<
    { canonicalIds: string[]; startDate: string | null; endDate: string | null },
    Record<string, unknown>
  >(graphQueries.getGlobalGraphEdges, {
    canonicalIds: params.canonicalIds,
    startDate: params.startDate || null,
    endDate: params.endDate || null,
  });
}

export async function getEdgeEvidenceDocuments(sourceId: string, targetId: string) {
  return runQuery<{ sourceId: string; targetId: string }, Record<string, unknown>>(
    graphQueries.getEdgeEvidenceDocuments,
    { sourceId, targetId },
  );
}

export async function getEdgeRelationship(sourceId: string, targetId: string) {
  const rows = await runQuery<{ sourceId: string; targetId: string }, Record<string, unknown>>(
    graphQueries.getEdgeRelationship,
    { sourceId, targetId },
  );
  return rows[0];
}

export interface EmailCategoriesCounts {
  all: number;
  primary: number;
  updates: number;
  promotions: number;
}

export interface EmailMetadata {
  id: number;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  hasAttachments: boolean;
  category?: 'primary' | 'updates' | 'promotions';
}

export async function getEmailMetadataPage(params: {
  page: number;
  limit: number;
  category?: string;
}): Promise<{
  data: EmailMetadata[];
  total: number;
}> {
  const { page, limit, category } = params;
  const offset = (page - 1) * limit;

  const whereParts = ["evidence_type = 'email'"];
  const queryParams: unknown[] = [];
  if (category && category !== 'all') {
    whereParts.push(`metadata_json ->> 'category' = $${queryParams.length + 1}`);
    queryParams.push(category);
  }
  const whereClause = `WHERE ${whereParts.join(' AND ')}`;

  const { rows: countRows } = await getApiPool().query(
    `SELECT COUNT(*) as count FROM documents ${whereClause}`,
    queryParams,
  );
  const total = Number(countRows[0].count);

  const query = `
      SELECT 
        id,
        metadata_json ->> 'thread_id' as "threadId",
        metadata_json ->> 'subject' as subject,
        metadata_json ->> 'from' as "from",
        metadata_json ->> 'to' as "to",
        date_created as date,
        SUBSTR(content_preview, 1, 150) as snippet,
        0 as "hasAttachments",
        metadata_json ->> 'category' as category
      FROM documents
      ${whereClause}
      ORDER BY date_created DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

  const { rows: emails } = await getApiPool().query(query, [...queryParams, limit, offset]);

  return { data: emails as EmailMetadata[], total };
}

export async function getEmailBodyById(id: string): Promise<{ body: string } | undefined> {
  const query = `
      SELECT content as body
      FROM documents
      WHERE id = $1 AND evidence_type = 'email'
    `;
  const { rows } = await getApiPool().query(query, [id]);
  return rows[0] as { body: string } | undefined;
}

const buildCategoryCaseSql = `
CASE
  WHEN
    (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%noreply@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%no-reply@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%do-not-reply@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%donotreply@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%notifications@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%notification@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%support@%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%auto%reply%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%mailer-daemon%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%bounce%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%amazon.com%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%order %'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%shipping%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%delivered%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%receipt%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%invoice%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%statement%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%verification code%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%password reset%'
    OR (COALESCE(content_refined, '')) ILIKE '%tracking number%'
    OR (COALESCE(content_refined, '')) ILIKE '%shipment%'
  THEN 'updates'
  WHEN
    (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%newsletter%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%marketing%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%mailchimp%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%constantcontact%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%@response.cnbc.com%'
    OR (COALESCE(metadata_json::jsonb ->> 'from', '')) ILIKE '%@houzz.com%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%newsletter%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%sale%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%offer%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%promotion%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%special%'
    OR (COALESCE(metadata_json::jsonb ->> 'subject', d.file_name, d.title, '')) ILIKE '%discount%'
    OR (COALESCE(content_refined, '')) ILIKE '%unsubscribe%'
    OR (COALESCE(content_refined, '')) ILIKE '%newsletter%'
    OR (COALESCE(content_refined, '')) ILIKE '%manage preferences%'
    OR (COALESCE(content_refined, '')) ILIKE '%opt out%'
  THEN 'promotions'
  THEN 'promotions'
  ELSE 'primary'
END
`;

export async function getEmailCategoriesCounts(): Promise<EmailCategoriesCounts> {
  const query = `
      SELECT
        (${buildCategoryCaseSql}) as category,
        COUNT(*) as count
      FROM documents d
      WHERE d.evidence_type = 'email'
      GROUP BY category
    `;
  const { rows } = await getApiPool().query(query);

  const counts: EmailCategoriesCounts = {
    all: 0,
    primary: 0,
    updates: 0,
    promotions: 0,
  };

  for (const row of rows as Array<{ category: string; count: string }>) {
    const category = row.category || 'primary';
    const count = Number(row.count);
    if (category in counts) {
      counts[category as keyof EmailCategoriesCounts] += count;
    }
    counts.all += count;
  }
  return counts;
}

const buildThreadBaseSql = (where: string) => `
WITH email_docs AS (
  SELECT
    d.id,
    COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) AS dateCreated,
    COALESCE(
      metadata_json ->> 'thread_id',
      metadata_json ->> 'threadId',
      metadata_json ->> 'conversation_id',
      metadata_json ->> 'message_id',
      d.id::text
    ) AS threadId,
    COALESCE(metadata_json ->> 'subject', d.file_name, d.title, 'No Subject') AS subject,
    COALESCE(metadata_json ->> 'from', '') AS fromAddress,
    COALESCE(metadata_json ->> 'to', '') AS toAddress,
    COALESCE(d.content_refined, '') AS snippet,
    d.red_flag_rating,
    COALESCE(d.signal_score, 0) AS signalScore,
    COALESCE(d.significance_score, 0) AS significanceScore,
    d.metadata_json,
    ${buildCategoryCaseSql} AS mailboxTab
  FROM documents d
  WHERE d.evidence_type = 'email'
    ${where}
),
threaded AS (
  SELECT
    threadId,
    MIN(subject) AS subject,
    MAX(dateCreated) AS lastMessageAt,
    COUNT(*) AS messageCount,
    STRING_AGG(DISTINCT fromAddress, ',') AS participantsRaw,
    MAX(COALESCE(red_flag_rating, 0)) AS risk,
    MAX(signalScore) AS signalScore,
    MAX(significanceScore) AS significanceScore,
    MAX(
      COALESCE(
        CASE
          WHEN (metadata_json ->> 'confidence') ~ '^-?\\d+(\\.\\d+)?$'
            THEN (metadata_json ->> 'confidence')::float
          ELSE NULL
        END,
        signalScore
      )
    ) AS confidence,
    MAX(COALESCE(metadata_json ->> 'ladder', metadata_json ->> 'evidence_ladder')) AS ladder,
    MAX(
      CASE
        WHEN COALESCE(metadata_json ->> 'attachments_count', '0') ~ '^\\d+$'
          AND (metadata_json ->> 'attachments_count')::int > 0
          THEN 1
        ELSE 0
      END
    ) AS hasAttachments,
    NULL AS linkedEntityIdsRaw,
    MAX(COALESCE(snippet, '')) AS snippet
  FROM email_docs
  GROUP BY threadId
)
SELECT
  threadId,
  subject,
  participantsRaw,
  COALESCE(
    CASE WHEN participantsRaw = '' THEN 0
         ELSE (LENGTH(participantsRaw) - LENGTH(REPLACE(participantsRaw, ',', '')) + 1)
    END,
    0
  ) AS participantCount,
  lastMessageAt,
  snippet,
  messageCount,
  hasAttachments,
  linkedEntityIdsRaw,
  risk,
  ladder,
  confidence,
  signalScore,
  significanceScore
FROM threaded
`;

const buildThreadCountSql = (where: string) => `
WITH email_docs AS (
  SELECT
    COALESCE(
      metadata_json ->> 'thread_id',
      metadata_json ->> 'threadId',
      metadata_json ->> 'conversation_id',
      metadata_json ->> 'message_id',
      d.id::text
    ) AS threadId
  FROM documents d
  WHERE d.evidence_type = 'email'
    ${where}
)
SELECT COUNT(*)::bigint AS total
FROM (
  SELECT threadId
  FROM email_docs
  GROUP BY threadId
) threaded
`;

const getJunkFilterClause = (showSuppressedJunk: boolean) => {
  if (showSuppressedJunk) return '';
  return `
  AND NOT EXISTS (
    SELECT 1
    FROM entity_mentions em
    JOIN entities e ON e.id = em.entity_id
    WHERE em.document_id = d.id
      AND COALESCE(e.junk_tier, 'clean') = 'junk'
  )
  `;
};

export async function getEmailMailboxes(showSuppressedJunk: boolean) {
  const junkFilter = getJunkFilterClause(showSuppressedJunk);
  const mailboxScanLimit = Math.max(1_000, Number(process.env.EMAIL_MAILBOX_SCAN_LIMIT || 100_000));

  let totals = {
    totalThreads: 0,
    totalMessages: 0,
    lastActivityAt: null as string | null,
  };
  try {
    const { rows: totalsRows } = await getApiPool().query(
      `
      SELECT
        COUNT(DISTINCT COALESCE(
          metadata_json ->> 'thread_id',
          metadata_json ->> 'threadId',
          metadata_json ->> 'conversation_id',
          metadata_json ->> 'message_id',
          d.id::text
        )) AS "totalThreads",
        COUNT(*) AS "totalMessages",
        MAX(COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz)) AS "lastActivityAt"
      FROM documents d
      WHERE d.evidence_type = 'email'
      ${junkFilter}
    `,
    );
    totals = {
      totalThreads: Number(totalsRows[0]?.totalThreads || 0),
      totalMessages: Number(totalsRows[0]?.totalMessages || 0),
      lastActivityAt: (totalsRows[0]?.lastActivityAt as string | null) || null,
    };
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    if (code === '57014') {
      logger.warn('[emails] mailbox totals timed out; returning zeroed aggregate totals');
    } else {
      throw error;
    }
  }

  let rows: Array<Record<string, unknown>> = [];
  try {
    const result = await getApiPool().query(
      `
        WITH email_docs AS (
          SELECT
            d.id,
            COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) AS "dateCreated",
            COALESCE(
              d.metadata_json ->> 'thread_id',
              d.metadata_json ->> 'threadId',
              d.metadata_json ->> 'conversation_id',
              d.metadata_json ->> 'message_id',
              d.id::text
            ) AS "threadId",
            COALESCE(d.red_flag_rating, 0) AS "redFlagRating"
          FROM documents d
          WHERE d.evidence_type = 'email'
          ${junkFilter}
          ORDER BY COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) DESC
          LIMIT $1
        ),
        mailbox_entity_stats AS (
          SELECT
            em.entity_id AS "entityId",
            e.full_name AS "displayName",
            COUNT(DISTINCT ed."threadId") AS "totalThreads",
            COUNT(DISTINCT ed.id) AS "totalMessages",
            MAX(ed."dateCreated") AS "lastActivityAt",
            MAX(ed."redFlagRating") AS "topRisk",
            COALESCE(e.is_vip, 0) AS "isVip",
            COALESCE(e.manually_reviewed, 0) AS "isVerified"
          FROM email_docs ed
          JOIN entity_mentions em ON em.document_id = ed.id
          JOIN entities e ON e.id = em.entity_id
          WHERE COALESCE(e.entity_type, 'Person') = 'Person'
            AND COALESCE(e.junk_tier, 'clean') <> 'junk'
            AND COALESCE(e.full_name, '') <> ''
            -- Prioritize VIPs, otherwise requires at least 2 threads or manual review to be a 'mailbox'
            AND (e.is_vip = 1 OR e.manually_reviewed = 1 OR (
                SELECT COUNT(DISTINCT document_id) 
                FROM entity_mentions 
                WHERE entity_id = e.id
            ) > 2)
          GROUP BY em.entity_id, e.full_name, e.is_vip, e.manually_reviewed
        )
        SELECT
          "entityId",
          "displayName",
          "totalThreads",
          "totalMessages",
          "lastActivityAt",
          "topRisk",
          "isVip",
          "isVerified"
        FROM mailbox_entity_stats
        WHERE "totalThreads" >= 1
        ORDER BY "isVip" DESC, "isVerified" DESC, "totalThreads" DESC, "displayName" ASC
        LIMIT 300
      `,
      [mailboxScanLimit],
    );
    rows = result.rows;
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    if (code === '57014') {
      logger.warn(
        `[emails] mailbox entity aggregation timed out at scan limit ${mailboxScanLimit}; returning totals only`,
      );
      rows = [];
    } else {
      throw error;
    }
  }

  return { totals, rows };
}

export async function getEmailThreads(params: {
  mailboxId: string;
  query?: string;
  fromFilter?: string;
  toFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
  minRisk?: number;
  tab?: string;
  limit: number;
  parsedCursor: { lastMessageAt: string; threadId: string } | null;
  showSuppressedJunk?: boolean;
  showYahooPostMortem?: boolean;
  showEmptyBodies?: boolean;
  sortBy?: 'date' | 'subject' | 'views' | 'stars' | 'participants';
  sortOrder?: 'asc' | 'desc';
  topicDocIds?: string[];
}) {
  const buildConversationThreadFilter = (qualifier: string) => `
    COALESCE(${qualifier}.participantsraw, '') <> ''
    AND (
      CASE
        WHEN COALESCE(${qualifier}.participantsraw, '') = '' THEN 0
        ELSE (
          LENGTH(${qualifier}.participantsraw) -
          LENGTH(REPLACE(${qualifier}.participantsraw, ',', '')) + 1
        )
      END
    ) BETWEEN 2 AND 12
  `;

  const {
    mailboxId,
    query = '',
    fromFilter = '',
    toFilter = '',
    dateFrom = '',
    dateTo = '',
    hasAttachments = false,
    minRisk = 0,
    tab = 'all',
    limit,
    parsedCursor,
    showSuppressedJunk = false,
    showYahooPostMortem = false,
    showEmptyBodies = false,
    sortBy = 'date',
    sortOrder = 'desc',
    topicDocIds = [],
  } = params;

  const queryParams: unknown[] = [];
  let where = getJunkFilterClause(showSuppressedJunk);
  const threadedWhere = '';

  if (topicDocIds.length > 0) {
    where += ` AND d.id = ANY($${queryParams.length + 1})`;
    queryParams.push(topicDocIds);
  }

  if (tab !== 'all') {
    where += ` AND (${buildCategoryCaseSql}) = $${queryParams.length + 1}`;
    queryParams.push(tab);
  }
  // NOTE:
  // Primary is already defined by buildCategoryCaseSql as "not updates/promotions".
  // Applying an extra participant-count gate here over-filters real threads because
  // participantsRaw is sender-centric and many legitimate threads collapse to 1 sender.

  if (mailboxId.startsWith('entity:')) {
    const entityId = Number(mailboxId.replace('entity:', ''));
    if (Number.isFinite(entityId) && entityId > 0) {
      where += ` AND EXISTS (
          SELECT 1 FROM entity_mentions em
          WHERE em.document_id = d.id
            AND em.entity_id = $${queryParams.length + 1}
        )`;
      queryParams.push(entityId);
    }
  }

  if (query.length > 0) {
    const likeParam = `%${query}%`;
    where += ` AND (
        lower(COALESCE(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE lower($${queryParams.length + 1})
        OR lower(COALESCE(metadata_json ->> 'from', '')) LIKE lower($${queryParams.length + 1})
        OR lower(COALESCE(metadata_json ->> 'to', '')) LIKE lower($${queryParams.length + 1})
        OR lower(COALESCE(d.content_refined, '')) LIKE lower($${queryParams.length + 1})
      )`;
    queryParams.push(likeParam);
  }

  if (fromFilter.length > 0) {
    where += ` AND lower(COALESCE(metadata_json ->> 'from', '')) LIKE lower($${queryParams.length + 1})`;
    queryParams.push(`%${fromFilter}%`);
  }

  if (toFilter.length > 0) {
    where += ` AND lower(COALESCE(metadata_json ->> 'to', '')) LIKE lower($${queryParams.length + 1})`;
    queryParams.push(`%${toFilter}%`);
  }

  if (dateFrom.length > 0) {
    where += ` AND COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) >= $${queryParams.length + 1}`;
    queryParams.push(dateFrom);
  }

  if (dateTo.length > 0) {
    where += ` AND COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) <= $${queryParams.length + 1}`;
    queryParams.push(dateTo);
  }

  if (hasAttachments) {
    where += ` AND COALESCE(metadata_json ->> 'attachments_count', '0') ~ '^\\d+$' AND (metadata_json ->> 'attachments_count')::int > 0`;
  }

  if (Number.isFinite(minRisk) && minRisk > 0) {
    where += ` AND COALESCE(d.red_flag_rating, 0) >= $${queryParams.length + 1}`;
    queryParams.push(minRisk);
  }

  if (!showYahooPostMortem) {
    // Restrict all emails to cutoff date Aug 15 2019 by default to trim post-mortem spam
    where += ` AND COALESCE(d.date_created, '1970-01-01T00:00:00.000Z'::timestamptz) <= '2019-08-15T23:59:59.999Z'::timestamptz`;
  }

  if (!showEmptyBodies) {
    // Require non-empty contents (refined content > 3 chars avoiding trivial fragments)
    where += ` AND d.content_refined IS NOT NULL AND LENGTH(TRIM(d.content_refined)) > 3`;
  }

  try {
    const baseSql = buildThreadBaseSql(where);
    const countSql =
      threadedWhere.length > 0
        ? `SELECT COUNT(*)::bigint AS total FROM (${baseSql}) counted WHERE ${buildConversationThreadFilter('counted')}`
        : buildThreadCountSql(where);
    const { rows: countRows } = await getApiPool().query(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);

    const cursorParams: unknown[] = [];
    let cursorClause = '';
    if (parsedCursor) {
      cursorClause = `${threadedWhere.length > 0 ? ' AND ' : ' WHERE '} (lastMessageAt < $${queryParams.length + 1} OR (lastMessageAt = $${queryParams.length + 1} AND threadId > $${queryParams.length + 2})) `;
      cursorParams.push(parsedCursor.lastMessageAt, parsedCursor.threadId);
    }

    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    let sortColumn = 'lastMessageAt';
    if (sortBy === 'subject') sortColumn = 'subject';
    if (sortBy === 'views') sortColumn = 'significanceScore';
    if (sortBy === 'stars') sortColumn = 'signalScore';
    if (sortBy === 'participants') sortColumn = 'participantsRaw';

    const listSql = `${baseSql}
        ${threadedWhere}
        ${cursorClause}
        ORDER BY ${sortColumn} ${sortDirection}, threadId ASC
        LIMIT $${queryParams.length + cursorParams.length + 1}
      `;

    const { rows } = await getApiPool().query(listSql, [
      ...queryParams,
      ...cursorParams,
      limit + 1,
    ]);

    return { rows, countRow: { total } };
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : '';
    if (code !== '57014') {
      throw error;
    }

    logger.warn(
      {
        mailboxId,
        tab,
        limit,
      },
      '[emails] thread query timed out; returning empty thread list',
    );
    return { rows: [], countRow: { total: 0 } };
  }
}

export async function getRandomEmailThreadId(): Promise<string | null> {
  const query = `
    SELECT 
      COALESCE(metadata_json ->> 'thread_id', metadata_json ->> 'threadId', metadata_json ->> 'conversation_id', id::text) AS "threadId"
    FROM documents
    WHERE evidence_type = 'email'
    ORDER BY random()
    LIMIT 1
  `;
  const { rows } = await getApiPool().query(query);
  return rows.length > 0 ? (rows[0].threadId as string) : null;
}
