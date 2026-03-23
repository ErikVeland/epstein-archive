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

// Helper to map DB row to EmailDTO
function mapRowToEmailDTO(row: Record<string, unknown>): EmailDTO {
  let metadata: Record<string, unknown> = {};
  try {
    metadata =
      typeof row.metadataJson === 'string' ? JSON.parse(row.metadataJson) : row.metadataJson || {};
  } catch {
    metadata = {};
  }

  const subject = metadata.subject || metadata.Subject || row.file_name || 'No Subject';
  const from = metadata.from || metadata.From || metadata.sender || 'Unknown Sender';
  const threadId = metadata.thread_id || metadata.emailThread || String(row.id);

  return {
    email_id: String(row.id),
    thread_id: threadId,
    message_id: metadata.message_id || '',
    date:
      row.date_created ||
      row.dateCreated ||
      metadata.sent ||
      metadata.date ||
      new Date().toISOString(),
    date_sort:
      new Date(row.date_created || row.dateCreated || metadata.sent || metadata.date).getTime() ||
      0,
    from: String(from),
    to: normalizeList(metadata.to || metadata.To || metadata.recipients),
    cc: normalizeList(metadata.cc || metadata.Cc),
    bcc: normalizeList(metadata.bcc || metadata.Bcc),
    subject: String(subject),
    snippet: row.content
      ? row.content.length > 200
        ? row.content.slice(0, 200) + '...'
        : row.content
      : '',
    body_clean_text: metadata.body_clean_text || row.content || '',
    body_clean_html: metadata.body_clean_html || '',
    body_raw: row.content || '',
    mime_parse_status: metadata.mime_parse_status || 'partial',
    mime_parse_reason: metadata.mime_parse_reason,
    attachments_count: metadata.attachments_count || 0,
    entity_links: [],
    ingest_run_id: metadata.ingest_run_id || 'legacy',
  };
}

export const communicationsRepository = {
  async getThreads(page: number = 1, limit: number = 50): Promise<ThreadDTO[]> {
    const offset = (page - 1) * limit;

    const rows = await communicationsQueries.getThreads.run({ limit, offset }, getApiPool());

    return rows.map((row: IGetThreadsResult) => {
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
      } as unknown as Record<string, unknown>),
    );
  },
};
