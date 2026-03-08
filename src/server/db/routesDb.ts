import { adminQueries, analyticsQueries, graphQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

export async function getDatabaseMetadata() {
  const rows = await (adminQueries.getDbMeta as any).run(undefined, getApiPool());
  return rows;
}

export async function getEntityAndDocumentCounts() {
  const rows = await (analyticsQueries.getTotalCounts as any).run(undefined, getApiPool());
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
    try {
      // Use raw query for dynamic table name safely here since this is an admin/internal tool
      const { rows } = await getApiPool().query(`SELECT COUNT(*) as count FROM ${table}`);
      results[table] = { ok: true, count: Number(rows[0].count) };
    } catch (e: any) {
      results[table] = { ok: false, count: 0, error: e.message };
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
  const rows = await (adminQueries.resetJunkFlags as any).run(undefined, getApiPool());
  return rows.length; // Or return total count if we change resetJunkFlags to return count
}

export async function listUsers() {
  const rows = await (adminQueries.listUsers as any).run(undefined, getApiPool());
  return rows;
}

export async function getUserById(id: string) {
  const rows = await (adminQueries.getUserById as any).run({ id }, getApiPool());
  return rows[0];
}

export async function createUser(params: {
  id: string;
  username: string;
  email: string | null;
  role: string;
  passwordHash: string;
}) {
  await (adminQueries.createUser as any).run(params, getApiPool());
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
  const params: any[] = [];

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

// DEPRECATED: Review Queue logic moved to reviewQueueRepository.ts

export async function getMapEntities(minRisk: number, limit: number) {
  return (graphQueries.getMapEntities as any).run({ minRisk, limit }, getApiPool());
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
  await (analyticsQueries.recordWebVitals as any).run(payload, getApiPool());
}

export async function getWebVitalsAggregates(days: number) {
  return (analyticsQueries.getWebVitalsAggregates as any).run(
    { days: days.toString() },
    getApiPool(),
  );
}

export async function getWebVitalsAggregatesAverage(days: number) {
  return (analyticsQueries.getWebVitalsAggregatesAverage as any).run(
    { days: days.toString() },
    getApiPool(),
  );
}

export async function getGraphCommunities() {
  return (graphQueries.getGraphCommunities as any).run(undefined, getApiPool());
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

export async function getGraphNeighbors(
  sourceCanonicalId: string,
  startDate?: string,
  endDate?: string,
) {
  return (graphQueries.getGraphNeighbors as any).run(
    {
      sourceCanonicalId,
      startDate: startDate || null,
      endDate: endDate || null,
    },
    getApiPool(),
  );
}

export async function getGraphPathNodes(pathNodes: string[]) {
  return (graphQueries.getGraphPathNodes as any).run({ pathNodes }, getApiPool());
}

export async function getGraphPathEdges(pathNodes: string[], startDate?: string, endDate?: string) {
  return (graphQueries.getGraphPathEdges as any).run(
    {
      pathNodes,
      startDate: startDate || null,
      endDate: endDate || null,
    },
    getApiPool(),
  );
}

export async function getGlobalGraphNodes(params: {
  minRisk: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}) {
  return (graphQueries.getGlobalGraphNodes as any).run(
    {
      minRisk: params.minRisk,
      limit: params.limit,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
    },
    getApiPool(),
  );
}

export async function getGlobalGraphEdges(params: {
  canonicalIds: string[];
  startDate?: string;
  endDate?: string;
}) {
  return (graphQueries.getGlobalGraphEdges as any).run(
    {
      canonicalIds: params.canonicalIds,
      startDate: params.startDate || null,
      endDate: params.endDate || null,
    },
    getApiPool(),
  );
}

export async function getEdgeEvidenceDocuments(sourceId: string, targetId: string) {
  return (graphQueries.getEdgeEvidenceDocuments as any).run({ sourceId, targetId }, getApiPool());
}

export async function getEdgeRelationship(sourceId: string, targetId: string) {
  const rows = await (graphQueries.getEdgeRelationship as any).run(
    { sourceId, targetId },
    getApiPool(),
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
  const queryParams: any[] = [];
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

const buildCategoryCaseSql = `
CASE
  WHEN
    lower(coalesce(metadata_json ->> 'from', '')) LIKE '%noreply@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%no-reply@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%do-not-reply@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%donotreply@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%notifications@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%notification@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%support@%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%auto%reply%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%mailer-daemon%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%bounce%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%amazon.com%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%order %'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%shipping%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%delivered%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%receipt%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%invoice%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%statement%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%verification code%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%password reset%'
    OR lower(coalesce(content_refined, '')) LIKE '%tracking number%'
    OR lower(coalesce(content_refined, '')) LIKE '%shipment%'
  THEN 'updates'
  WHEN
    lower(coalesce(metadata_json ->> 'from', '')) LIKE '%newsletter%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%marketing%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%mailchimp%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%constantcontact%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%@response.cnbc.com%'
    OR lower(coalesce(metadata_json ->> 'from', '')) LIKE '%@houzz.com%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%newsletter%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%sale%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%offer%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%promotion%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%special%'
    OR lower(coalesce(metadata_json ->> 'subject', d.file_name, d.title, '')) LIKE '%discount%'
    OR lower(coalesce(content_refined, '')) LIKE '%unsubscribe%'
    OR lower(coalesce(content_refined, '')) LIKE '%newsletter%'
    OR lower(coalesce(content_refined, '')) LIKE '%manage preferences%'
    OR lower(coalesce(content_refined, '')) LIKE '%opt out%'
  THEN 'promotions'
  ELSE 'primary'
END
`;

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
    MAX(
      COALESCE(
        CASE
          WHEN (metadata_json ->> 'confidence') ~ '^-?\\d+(\\.\\d+)?$'
            THEN (metadata_json ->> 'confidence')::float
          ELSE NULL
        END,
        CASE
          WHEN (metadata_json ->> 'significance_score') ~ '^-?\\d+(\\.\\d+)?$'
            THEN (metadata_json ->> 'significance_score')::float
          ELSE NULL
        END
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
  confidence
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
  const mailboxScanLimit = Math.max(1_000, Number(process.env.EMAIL_MAILBOX_SCAN_LIMIT || 10_000));

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
  const totals = totalsRows[0];

  let rows: any[] = [];
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
            MAX(ed."redFlagRating") AS "topRisk"
          FROM email_docs ed
          JOIN entity_mentions em ON em.document_id = ed.id
          JOIN entities e ON e.id = em.entity_id
          WHERE COALESCE(e.type, '') = 'Person'
            ${showSuppressedJunk ? '' : "AND COALESCE(e.junk_tier, 'clean') = 'clean'"}
            AND COALESCE(e.full_name, '') <> ''
          GROUP BY em.entity_id, e.full_name
        )
        SELECT
          "entityId",
          "displayName",
          "totalThreads",
          "totalMessages",
          "lastActivityAt",
          "topRisk"
        FROM mailbox_entity_stats
        WHERE "totalThreads" >= 1
        ORDER BY "totalThreads" DESC, "totalMessages" DESC, "displayName" ASC
        LIMIT 60
      `,
      [mailboxScanLimit],
    );
    rows = result.rows;
  } catch (error: any) {
    if (error?.code === '57014') {
      console.warn(
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
  } = params;

  const queryParams: any[] = [];
  let where = getJunkFilterClause(showSuppressedJunk);
  const threadedWhere = '';

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

  const baseSql = buildThreadBaseSql(where);
  const countSql =
    threadedWhere.length > 0
      ? `SELECT COUNT(*)::bigint AS total FROM (${baseSql}) counted WHERE ${buildConversationThreadFilter('counted')}`
      : buildThreadCountSql(where);
  const { rows: countRows } = await getApiPool().query(countSql, queryParams);
  const total = Number(countRows[0]?.total || 0);

  const cursorParams: any[] = [];
  let cursorClause = '';
  if (parsedCursor) {
    cursorClause = `${threadedWhere.length > 0 ? ' AND ' : ' WHERE '} (lastMessageAt < $${queryParams.length + 1} OR (lastMessageAt = $${queryParams.length + 1} AND threadId > $${queryParams.length + 2})) `;
    cursorParams.push(parsedCursor.lastMessageAt, parsedCursor.threadId);
  }

  const listSql = `${baseSql}
      ${threadedWhere}
      ${cursorClause}
      ORDER BY lastMessageAt DESC, threadId ASC
      LIMIT $${queryParams.length + cursorParams.length + 1}
    `;

  const { rows } = await getApiPool().query(listSql, [...queryParams, ...cursorParams, limit + 1]);

  return { rows, countRow: { total } };
}
