import type {
  EmailMailboxDto,
  EmailMailboxesResponseDto,
  EmailMessageBodyDto,
  EmailRawMessageDto,
  EmailSearchResponseDto,
  EmailThreadDetailsDto,
  EmailThreadListItemDto,
  EmailThreadsResponseDto,
} from '@shared/dto/emails';

export const mapEmailMailboxDto = (row: Record<string, unknown>): EmailMailboxDto => ({
  mailboxId: String(row.mailboxId || (row.entityId ? `entity:${row.entityId}` : 'all')),
  entityId: row.entityId == null ? null : Number(row.entityId),
  displayName: String(row.displayName || 'Unknown'),
  totalThreads: Number(row.totalThreads || 0),
  totalMessages: Number(row.totalMessages || 0),
  lastActivityAt: typeof row.lastActivityAt === 'string' ? row.lastActivityAt : null,
  riskSummary:
    typeof row.riskSummary === 'object' && row.riskSummary !== null
      ? (row.riskSummary as unknown as EmailMailboxDto['riskSummary'])
      : null,
  isJunkSuppressed: Boolean(row.isJunkSuppressed),
  isVip: Boolean(row.isVip),
  isVerified: Boolean(row.isVerified),
});

export const mapEmailMailboxesResponseDto = (
  payload: Record<string, unknown>,
): EmailMailboxesResponseDto => ({
  revisionKey: String(payload?.revisionKey || 'default:v1'),
  data: Array.isArray(payload?.data)
    ? payload.data.map((item) => mapEmailMailboxDto(item as Record<string, unknown>))
    : [],
});

export const mapEmailThreadListItemDto = (
  row: Record<string, unknown>,
): EmailThreadListItemDto => ({
  threadId: String(row.threadId || ''),
  subject: String(row.subject || 'No Subject'),
  participants: Array.isArray(row.participants) ? row.participants.map(String) : [],
  participantCount: Number(row.participantCount || 0),
  lastMessageAt: String(row.lastMessageAt || ''),
  snippet: String(row.snippet || ''),
  messageCount: Number(row.messageCount || 0),
  hasAttachments: Boolean(row.hasAttachments),
  linkedEntityIds: Array.isArray(row.linkedEntityIds)
    ? row.linkedEntityIds
        .map((id: unknown) => Number(id))
        .filter((id: number) => Number.isFinite(id))
    : [],
  linkedEntities: Array.isArray(row.linkedEntities)
    ? (row.linkedEntities as Array<Record<string, unknown>>).map((e) => ({
        entityId: Number(e.entityId || 0),
        name: String(e.name || ''),
      }))
    : [],
  risk: row.risk == null ? null : Number(row.risk),
  ladder: row.ladder ? String(row.ladder) : null,
  confidence: row.confidence == null ? null : Number(row.confidence),
  signalScore: row.signalScore == null ? 0 : Number(row.signalScore),
  significanceScore: row.significanceScore == null ? 0 : Number(row.significanceScore),
});

export const mapEmailThreadsResponseDto = (
  payload: Record<string, unknown>,
): EmailThreadsResponseDto => {
  const meta =
    payload?.meta && typeof payload.meta === 'object'
      ? (payload.meta as Record<string, unknown>)
      : {};
  return {
    data: Array.isArray(payload?.data)
      ? payload.data.map((item) => mapEmailThreadListItemDto(item as Record<string, unknown>))
      : [],
    meta: {
      total: Number(meta?.total || 0),
      limit: Number(meta?.limit || 0),
      hasMore: Boolean(meta?.hasMore),
      nextCursor: meta?.nextCursor ? String(meta.nextCursor) : null,
    },
  };
};

export const mapEmailThreadDetailsDto = (
  payload: Record<string, unknown>,
): EmailThreadDetailsDto => ({
  threadId: String(payload?.threadId || ''),
  subject: String(payload?.subject || 'No Subject'),
  messages: Array.isArray(payload?.messages)
    ? payload.messages.map((rawMsg: unknown) => {
        const msg = rawMsg as Record<string, unknown>;
        return {
          messageId: String(msg.messageId || ''),
          threadId: String(msg.threadId || ''),
          subject: String(msg.subject || 'No Subject'),
          from: String(msg.from || ''),
          to: Array.isArray(msg.to) ? msg.to.map(String) : [],
          cc: Array.isArray(msg.cc) ? msg.cc.map(String) : [],
          date: String(msg.date || ''),
          snippet: String(msg.snippet || ''),
          flags: {
            hasAttachments: Boolean(
              (msg?.flags as Record<string, unknown> | null | undefined)?.hasAttachments,
            ),
          },
          attachmentsMeta: Array.isArray(msg.attachmentsMeta) ? msg.attachmentsMeta : [],
          linkedEntities: Array.isArray(msg.linkedEntities)
            ? msg.linkedEntities.map((rawEntity: unknown) => {
                const entity = rawEntity as Record<string, unknown>;
                return {
                  entityId: Number(entity.entityId || 0),
                  name: String(entity.name || ''),
                  role: entity.role ? String(entity.role) : null,
                };
              })
            : [],
          ingestRunId: msg.ingestRunId == null ? null : Number(msg.ingestRunId),
          pipelineVersion: msg.pipelineVersion ? String(msg.pipelineVersion) : null,
          confidence: msg.confidence == null ? null : Number(msg.confidence),
          ladder: msg.ladder ? String(msg.ladder) : null,
          wasAgentic: Boolean(msg.wasAgentic),
          redFlagRating: msg.redFlagRating == null ? null : Number(msg.redFlagRating),
        };
      })
    : [],
});

export const mapEmailMessageBodyDto = (payload: Record<string, unknown>): EmailMessageBodyDto => {
  const sourceFile =
    payload?.sourceFile && typeof payload.sourceFile === 'object'
      ? (payload.sourceFile as Record<string, unknown>)
      : {};
  return {
    messageId: String(payload?.messageId || ''),
    cleanedText: String(payload?.cleanedText || ''),
    cleanedHtml: String(payload?.cleanedHtml || ''),
    extractedLinks: Array.isArray(payload?.extractedLinks)
      ? payload.extractedLinks.map(String)
      : [],
    extractedEntities: Array.isArray(payload?.extractedEntities)
      ? payload.extractedEntities.map(String)
      : [],
    mimeWarnings: Array.isArray(payload?.mimeWarnings) ? payload.mimeWarnings.map(String) : [],
    parseStatus: String(payload?.parseStatus || 'partial'),
    ingestRunId: payload?.ingestRunId == null ? null : Number(payload.ingestRunId),
    pipelineVersion: payload?.pipelineVersion ? String(payload.pipelineVersion) : null,
    sourceFile: {
      fileName: sourceFile?.fileName ? String(sourceFile.fileName) : null,
      filePath: sourceFile?.filePath ? String(sourceFile.filePath) : null,
    },
    rawAvailable: Boolean(payload?.rawAvailable),
  };
};

export const mapEmailRawMessageDto = (payload: Record<string, unknown>): EmailRawMessageDto => ({
  messageId: String(payload?.messageId || ''),
  raw: String(payload?.raw || ''),
  warning: String(payload?.warning || ''),
  determinism: String(payload?.determinism || ''),
});

export const mapEmailSearchResponseDto = (
  payload: Record<string, unknown>,
): EmailSearchResponseDto => ({
  scope: payload?.scope === 'mailbox' ? 'mailbox' : 'global',
  q: String(payload?.q || ''),
  data: Array.isArray(payload?.data)
    ? payload.data.map((rawRow: unknown) => {
        const row = rawRow as Record<string, unknown>;
        return {
          threadId: String(row.threadId || ''),
          messageId: String(row.messageId || ''),
          subject: String(row.subject || ''),
          from: String(row.from || ''),
          date: String(row.date || ''),
          snippet: String(row.snippet || ''),
          highlights: Array.isArray(row.highlights)
            ? row.highlights
                .map((rawH: unknown) => {
                  const h = rawH as Record<string, unknown>;
                  return { start: Number(h.start || 0), end: Number(h.end || 0) };
                })
                .filter(
                  (h: { start: number; end: number }) =>
                    Number.isFinite(h.start) && Number.isFinite(h.end),
                )
            : [],
        };
      })
    : [],
});
