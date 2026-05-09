import { communicationsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import {
  IGetThreadsResult,
  ISearchThreadsResult,
  IGetCommunicationsForEntityResult,
} from '@epstein/db/src/queries/__generated__/communications';
import { EmailDTO, ThreadDTO, EmailSearchFilters } from '../../types/email.js';

function normalizeList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v))
      .join(',')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function readString(value: unknown, fallback: string = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readCount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

type EmailRow = {
  id: string | number;
  metadataJson?: unknown;
  metadata_json?: unknown;
  file_name?: unknown;
  date_created?: unknown;
  dateCreated?: unknown;
  content?: unknown;
};

// Helper to map DB row to EmailDTO
function mapRowToEmailDTO(row: EmailRow): EmailDTO {
  let metadata: Record<string, unknown> = {};
  try {
    const rawMetadata = row.metadataJson ?? row.metadata_json;
    const parsed = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
    metadata =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    metadata = {};
  }

  const subject =
    readString(metadata.subject) ||
    readString(metadata.Subject) ||
    readString(row.file_name) ||
    'No Subject';
  const from =
    readString(metadata.from) ||
    readString(metadata.From) ||
    readString(metadata.sender) ||
    'Unknown Sender';
  const threadId =
    readString(metadata.thread_id) || readString(metadata.emailThread) || String(row.id);
  const dateValue =
    readString(row.date_created) ||
    readString(row.dateCreated) ||
    readString(metadata.sent) ||
    readString(metadata.date) ||
    new Date().toISOString();
  const content = readString(row.content);

  return {
    email_id: String(row.id),
    thread_id: threadId,
    message_id: readString(metadata.message_id),
    date: dateValue,
    date_sort: new Date(dateValue).getTime() || 0,
    from: String(from),
    to: normalizeList(metadata.to || metadata.To || metadata.recipients),
    cc: normalizeList(metadata.cc || metadata.Cc),
    bcc: normalizeList(metadata.bcc || metadata.Bcc),
    subject: String(subject),
    snippet: content ? (content.length > 200 ? content.slice(0, 200) + '...' : content) : '',
    body_clean_text: readString(metadata.body_clean_text) || content,
    body_clean_html: readString(metadata.body_clean_html),
    body_raw: content,
    mime_parse_status:
      readString(metadata.mime_parse_status) === 'success' ||
      readString(metadata.mime_parse_status) === 'failed' ||
      readString(metadata.mime_parse_status) === 'partial'
        ? (readString(metadata.mime_parse_status) as 'success' | 'failed' | 'partial')
        : 'partial',
    mime_parse_reason: readOptionalString(metadata.mime_parse_reason),
    attachments_count: readCount(metadata.attachments_count),
    entity_links: [],
    ingest_run_id: readString(metadata.ingest_run_id) || 'legacy',
  };
}

export const communicationsRepository = {
  async getThreads(page: number = 1, limit: number = 50): Promise<ThreadDTO[]> {
    const offset = (page - 1) * limit;
    const pool = getApiPool();

    const rows = await communicationsQueries.getThreads.run({ limit, offset }, pool);

    const threads: Omit<ThreadDTO, 'linkedEntities'>[] = rows.map((row: IGetThreadsResult) => {
      let participants: string[] = [];
      if (Array.isArray(row.participantsJson)) {
        participants = [...new Set(normalizeList(row.participantsJson))];
      }

      return {
        thread_id: row.threadId!,
        subject_canonical: row.subjectCanonical || 'No Subject',
        participants: participants.slice(0, 5),
        message_count: Number(row.messageCount),
        first_date: row.firstDate ? row.firstDate.toISOString() : '',
        last_date: row.lastDate ? row.lastDate.toISOString() : '',
        preview_snippet: row.previewSnippet
          ? row.previewSnippet.length > 100
            ? row.previewSnippet.slice(0, 100) + '...'
            : row.previewSnippet
          : '',
      };
    });

    // Batch-enrich threads with linked entity names via entity_mentions
    if (threads.length > 0) {
      const threadIds = threads.map((t) => t.thread_id);
      const entityRows = await pool.query<{ thread_id: string; entity_id: number; name: string }>(
        `
        SELECT
          COALESCE(d.metadata_json->>'thread_id', d.id::text) AS thread_id,
          e.id AS entity_id,
          e.full_name AS name
        FROM documents d
        JOIN entity_mentions em ON d.id = em.document_id
        JOIN entities e ON em.entity_id = e.id
        WHERE d.evidence_type = 'email'
          AND COALESCE(d.metadata_json->>'thread_id', d.id::text) = ANY($1)
        GROUP BY thread_id, e.id, e.full_name
        ORDER BY thread_id, e.full_name
        `,
        [threadIds],
      );

      const entityByThread = new Map<string, { entityId: number; name: string }[]>();
      for (const row of entityRows.rows) {
        const list = entityByThread.get(row.thread_id) ?? [];
        list.push({ entityId: Number(row.entity_id), name: row.name });
        entityByThread.set(row.thread_id, list);
      }

      return threads.map((t) => ({
        ...t,
        linkedEntities: entityByThread.get(t.thread_id) ?? [],
      }));
    }

    return threads;
  },

  async getThreadById(threadId: string): Promise<ThreadDTO | null> {
    const rows = await communicationsQueries.getThreadMessages.run({ threadId }, getApiPool());
    if (rows.length === 0) return null;

    const messages = rows.map(mapRowToEmailDTO);
    const lastMsg = messages[messages.length - 1];
    const firstMsg = messages[0];

    // Collect participants
    const participants = new Set<string>();
    messages.forEach((m: EmailDTO) => {
      participants.add(m.from);
      m.to.forEach((t: string) => participants.add(t));
    });

    return {
      thread_id: threadId,
      subject_canonical: firstMsg.subject,
      participants: Array.from(participants),
      message_count: messages.length,
      first_date: firstMsg.date,
      last_date: lastMsg.date,
      preview_snippet: lastMsg.snippet,
      messages: messages,
    };
  },

  async getThreadForDocument(documentId: string): Promise<ThreadDTO | null> {
    const rows = await communicationsQueries.getThreadIdForDocument.run(
      { documentId },
      getApiPool(),
    );
    if (rows.length === 0) return null;

    const threadId = rows[0].threadId || documentId;
    return await this.getThreadById(threadId);
  },

  async getMessageById(messageId: string): Promise<EmailDTO | null> {
    const rows = await communicationsQueries.getMessageById.run({ messageId }, getApiPool());
    if (rows.length === 0) return null;
    return mapRowToEmailDTO(rows[0]);
  },

  async searchEmails(filters: EmailSearchFilters): Promise<ThreadDTO[]> {
    const threadRows = await communicationsQueries.searchThreads.run(
      { query: filters.query || '' },
      getApiPool(),
    );

    // For brevity and parity with legacy, return partial thread results
    return threadRows.map((row: ISearchThreadsResult) => ({
      thread_id: row.threadId!,
      subject_canonical: 'Search Result',
      participants: [],
      message_count: 1,
      first_date: row.lastDate ? row.lastDate.toISOString() : '',
      last_date: row.lastDate ? row.lastDate.toISOString() : '',
      preview_snippet: '',
    }));
  },

  async getCommunicationsForEntity(
    entityId: string,
    _filters: EmailSearchFilters,
  ): Promise<EmailDTO[]> {
    const rows = await communicationsQueries.getCommunicationsForEntity.run(
      { entityId },
      getApiPool(),
    );
    return rows.map((row: IGetCommunicationsForEntityResult) =>
      mapRowToEmailDTO({
        ...row,
        metadataJson: row.metadata_json,
        dateCreated: row.date_created,
      } as unknown as EmailRow),
    );
  },

  async getCommunicationsMatrix(): Promise<
    Array<{
      sender: string;
      recipient: string;
      count: number;
    }>
  > {
    const pool = getApiPool();
    const res = await pool.query<{ sender: string; recipient: string; count: number }>(
      `
      SELECT 
        COALESCE(d.metadata_json->>'from', d.metadata_json->>'From', d.metadata_json->>'sender', 'Unknown Sender') AS sender,
        jsonb_array_elements_text(
          CASE 
            WHEN jsonb_typeof(d.metadata_json->'to') = 'array' THEN d.metadata_json->'to'
            WHEN jsonb_typeof(d.metadata_json->'To') = 'array' THEN d.metadata_json->'To'
            WHEN jsonb_typeof(d.metadata_json->'recipients') = 'array' THEN d.metadata_json->'recipients'
            ELSE '[]'::jsonb
          END
        ) AS recipient,
        COUNT(*)::int AS count
      FROM documents d
      WHERE d.evidence_type = 'email'
      GROUP BY sender, recipient
      HAVING COUNT(*) > 0
      ORDER BY count DESC
      LIMIT 100
      `,
    );
    return res.rows;
  },
};
