import express from 'express';
import { cleanMime } from '../services/mimeCleaner.js';
import {
  getEntitiesInEmail,
  getKnownEntitySenders,
} from '../services/emailClassificationService.js';
import { performanceCache } from '../performanceCache.js';
import {
  mapEmailMailboxesResponseDto,
  mapEmailMessageBodyDto,
  mapEmailRawMessageDto,
  mapEmailSearchResponseDto,
  mapEmailThreadDetailsDto,
  mapEmailThreadsResponseDto,
} from '../mappers/emailsDtoMapper.js';
import {
  getEmailCategoriesCounts,
  getEmailDocumentContentById,
  getEmailLinkedEntitiesForMessages,
  getEmailLinkedEntitiesForThreads,
  getEmailMailboxes,
  getEmailMessageBodyRecord,
  getEmailMessageThreadPointer,
  getEmailRawMessageRecord,
  getEmailThreadMessageHeaders,
  getEmailThreads,
  searchEmailMessagesLegacy,
} from '../db/routesDb.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const LIST_TTL_SECONDS = 45;
const BODY_TTL_SECONDS = 60;

interface ParsedCursor {
  lastMessageAt: string;
  threadId: string;
}

interface EmailMessageHeaderRow {
  messageId: number;
  threadId: string;
  subject: string;
  fromAddress: string;
  toAddresses: string;
  ccAddresses: string;
  dateCreated: string;
  snippet: string;
  hasAttachments: number;
  attachmentsMetaRaw: string;
  ingestRunId: number | null;
  pipelineVersion: string | null;
  confidence: number | null;
  ladder: string | null;
  wasAgentic: number;
  redFlagRating: number | null;
}

const safeJsonParse = <T>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const normalizeList = (raw: unknown): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((value) => String(value || '').trim()).filter(Boolean);
  }
  return String(raw)
    .split(/[;,]/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const normalizeThreadId = (metadataJson: string | null, id: number): string => {
  const metadata = safeJsonParse<Record<string, unknown>>(metadataJson, {});
  return String(
    metadata.thread_id ||
      metadata.threadId ||
      metadata.conversation_id ||
      metadata.message_id ||
      id,
  );
};

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

const readOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : undefined;

const readOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const parseCursor = (value: string | undefined): ParsedCursor | null => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    const [lastMessageAt, threadId] = decoded.split('|');
    if (!lastMessageAt || !threadId) return null;
    return { lastMessageAt, threadId };
  } catch {
    return null;
  }
};

const encodeCursor = (lastMessageAt: string, threadId: string): string =>
  Buffer.from(`${lastMessageAt}|${threadId}`, 'utf8').toString('base64');

const threadRowField = <T = unknown>(
  row: Record<string, unknown>,
  camel: string,
  snakeish?: string,
): T => {
  if (row[camel] != null) return row[camel] as T;
  const lower = camel.toLowerCase();
  if (row[lower] != null) return row[lower] as T;
  if (snakeish && row[snakeish] != null) return row[snakeish] as T;
  return undefined as T;
};

// const normalizeTab = (tab: string | undefined): 'all' | 'primary' | 'updates' | 'promotions' => {
//   if (tab === 'primary' || tab === 'updates' || tab === 'promotions') return tab;
//   return 'all';
// };

// Schemas
const mailboxesSchema = z.object({
  query: z.object({
    showSuppressedJunk: z.preprocess((v) => v === '1', z.boolean()).optional(),
  }),
});

const threadsSchema = z.object({
  query: z.object({
    mailboxId: z.string().default('all'),
    q: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    hasAttachments: z.preprocess((v) => v === '1', z.boolean()).optional(),
    minRisk: z.coerce.number().optional().default(0),
    tab: z.enum(['all', 'primary', 'updates', 'promotions']).optional().default('all'),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    cursor: z.string().optional(),
    showSuppressedJunk: z.preprocess((v) => v === '1', z.boolean()).optional(),
  }),
});

const threadIdParamSchema = z.object({
  params: z.object({
    threadId: z.string().min(1),
  }),
});

const messageIdParamSchema = z.object({
  params: z.object({
    messageId: z.string().min(1),
  }),
});

const messageBodySchema = z.object({
  params: z.object({
    messageId: z.string().min(1),
  }),
  query: z.object({
    showQuoted: z.preprocess((v) => v === '1', z.boolean()).optional(),
  }),
});

const emailSearchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Query is required'),
    scope: z.enum(['mailbox', 'global']).optional().default('global'),
    mailboxId: z.string().optional().default('all'),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  }),
});

const emailIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const parseEntityIds = (raw: string | null): number[] => {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );
};

// GET /api/emails/mailboxes
router.get('/mailboxes', validate(mailboxesSchema), async (req, res, next) => {
  try {
    const showSuppressedJunk = (req.query as Record<string, unknown>).showSuppressedJunk === true;
    const cacheKey = `emails:mailboxes:${showSuppressedJunk ? 'all' : 'filtered'}`;
    const cached = performanceCache.get<unknown>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const { totals, rows } = await getEmailMailboxes(showSuppressedJunk);

    const payload = {
      revisionKey: `${process.env.INGEST_RUN_ID || process.env.LATEST_INGEST_RUN_ID || 'default'}:${process.env.RULESET_VERSION || 'v1'}`,
      data: [
        {
          mailboxId: 'all',
          displayName: 'All Inboxes',
          entityId: null,
          totalThreads: totals.totalThreads || 0,
          totalMessages: totals.totalMessages || 0,
          lastActivityAt: totals.lastActivityAt,
          riskSummary: null,
          isJunkSuppressed: !showSuppressedJunk,
        },
        ...rows.map((row) => ({
          mailboxId: `entity:${row.entityId}`,
          entityId: row.entityId,
          displayName: row.displayName,
          totalThreads: row.totalThreads,
          totalMessages: row.totalMessages,
          lastActivityAt: row.lastActivityAt,
          riskSummary:
            Number(row.topRisk) >= 4
              ? 'high'
              : Number(row.topRisk) >= 2
                ? 'medium'
                : Number(row.topRisk) > 0
                  ? 'low'
                  : 'minimal',
          isJunkSuppressed: !showSuppressedJunk,
        })),
      ],
    };

    const dto = mapEmailMailboxesResponseDto(payload);
    performanceCache.set(cacheKey, dto, LIST_TTL_SECONDS);
    res.json(dto);
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/threads
router.get('/threads', validate(threadsSchema), async (req, res, next) => {
  try {
    const queryParams = req.query as Record<string, unknown>;
    const mailboxId = readString(queryParams.mailboxId) || 'all';
    const query = readString(queryParams.q);
    const fromFilter = readString(queryParams.from);
    const toFilter = readString(queryParams.to);
    const dateFrom = readString(queryParams.dateFrom);
    const dateTo = readString(queryParams.dateTo);
    const hasAttachments = readOptionalBoolean(queryParams.hasAttachments);
    const minRisk = readOptionalNumber(queryParams.minRisk);
    const tab = readString(queryParams.tab);
    const limit = readNumber(queryParams.limit, DEFAULT_LIMIT);
    const cursor = readString(queryParams.cursor);
    const showSuppressedJunk = readOptionalBoolean(queryParams.showSuppressedJunk);

    res.setHeader('X-Limit-Applied', String(limit));
    const parsedCursor = parseCursor(cursor);

    const { rows, countRow } = await getEmailThreads({
      mailboxId,
      query,
      fromFilter,
      toFilter,
      dateFrom,
      dateTo,
      hasAttachments,
      minRisk,
      tab,
      limit,
      parsedCursor,
      showSuppressedJunk,
    });

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = pageRows[pageRows.length - 1] as Record<string, unknown> | undefined;
    const nextCursor = hasMore
      ? encodeCursor(
          String(threadRowField(lastRow || {}, 'lastMessageAt') || ''),
          String(threadRowField(lastRow || {}, 'threadId') || ''),
        )
      : null;

    const threadIds = pageRows.map((row) =>
      String(threadRowField(row as Record<string, unknown>, 'threadId') || ''),
    );
    const entityRows = await getEmailLinkedEntitiesForThreads(threadIds);
    const entitiesByThread = new Map<string, { entityId: number; name: string }[]>();
    for (const er of entityRows) {
      const list = entitiesByThread.get(er.threadId) ?? [];
      list.push({ entityId: er.entityId, name: er.name });
      entitiesByThread.set(er.threadId, list);
    }

    const payload = {
      data: pageRows.map((row) => {
        const threadId = String(threadRowField(row as Record<string, unknown>, 'threadId') || '');
        return {
          threadId,
          subject: String((row as Record<string, unknown>).subject || 'No Subject'),
          participants: normalizeList(
            threadRowField(row as Record<string, unknown>, 'participantsRaw') || '',
          ),
          participantCount: threadRowField(row as Record<string, unknown>, 'participantCount') || 0,
          lastMessageAt: threadRowField(row as Record<string, unknown>, 'lastMessageAt') || '',
          snippet: String((row as Record<string, unknown>).snippet || ''),
          messageCount: threadRowField(row as Record<string, unknown>, 'messageCount') || 0,
          hasAttachments:
            Number(threadRowField(row as Record<string, unknown>, 'hasAttachments') || 0) === 1,
          linkedEntityIds: parseEntityIds(
            threadRowField(row as Record<string, unknown>, 'linkedEntityIdsRaw') || '',
          ),
          linkedEntities: entitiesByThread.get(threadId) ?? [],
          risk:
            (row as Record<string, unknown>).risk == null
              ? null
              : typeof (row as Record<string, unknown>).risk === 'number'
                ? (row as Record<string, unknown>).risk
                : Number((row as Record<string, unknown>).risk),
          ladder: readString((row as Record<string, unknown>).ladder) || null,
          confidence: readOptionalNumber((row as Record<string, unknown>).confidence) ?? null,
        };
      }),
      meta: {
        total: countRow.total || 0,
        limit,
        hasMore,
        nextCursor: nextCursor || '',
      },
    };

    res.json(mapEmailThreadsResponseDto(payload));
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/threads/:threadId
router.get('/threads/:threadId', validate(threadIdParamSchema), async (req, res, next) => {
  try {
    const threadId = req.params.threadId;
    const rows = (await getEmailThreadMessageHeaders(threadId)) as EmailMessageHeaderRow[];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const messageIds = rows.map((row) => row.messageId);
    const entityRows =
      messageIds.length > 0
        ? ((await getEmailLinkedEntitiesForMessages(messageIds)) as Array<{
            messageId: number;
            entityId: number;
            name: string;
            role: string | null;
          }>)
        : [];

    const entitiesByMessage = new Map<
      number,
      Array<{ entityId: number; name: string; role: string | null }>
    >();
    for (const row of entityRows) {
      if (!entitiesByMessage.has(row.messageId)) {
        entitiesByMessage.set(row.messageId, []);
      }
      entitiesByMessage.get(row.messageId)!.push({
        entityId: row.entityId,
        name: row.name,
        role: row.role,
      });
    }

    const messages = rows.map((row) => ({
      messageId: String(row.messageId),
      threadId: row.threadId,
      subject: row.subject,
      from: row.fromAddress,
      to: normalizeList(row.toAddresses),
      cc: normalizeList(row.ccAddresses),
      date: row.dateCreated,
      snippet: row.snippet,
      flags: {
        hasAttachments: row.hasAttachments === 1,
      },
      attachmentsMeta: safeJsonParse<unknown[]>(row.attachmentsMetaRaw, []),
      linkedEntities: entitiesByMessage.get(row.messageId) || [],
      ingestRunId: row.ingestRunId,
      pipelineVersion: row.pipelineVersion,
      confidence: row.confidence,
      ladder: row.ladder,
      wasAgentic: Boolean(row.wasAgentic),
      redFlagRating: row.redFlagRating,
    }));

    return res.json(
      mapEmailThreadDetailsDto({
        threadId,
        subject: rows[rows.length - 1].subject,
        messages,
      }),
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/messages/:messageId/body
router.get('/messages/:messageId/body', validate(messageBodySchema), async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const showQuoted = (req.query as Record<string, unknown>).showQuoted === true;
    const cacheKey = `emails:message:${messageId}:body:${showQuoted ? 'quoted' : 'collapsed'}`;
    const cached = performanceCache.get<unknown>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const row = (await getEmailMessageBodyRecord(messageId)) as
      | {
          id: number;
          content: string | null;
          content_preview: string | null;
          metadata_json: string | null;
          ingestRunId: number | null;
          pipelineVersion: string | null;
          dateCreated: string | null;
          fileName: string | null;
          filePath: string | null;
        }
      | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const metadata = safeJsonParse<Record<string, unknown>>(row.metadata_json, {});
    const source = String(row.content || metadata.body_raw || metadata.raw || '').trim();
    const cleaned = source ? await cleanMime(source) : null;

    const cleanedTextInitial =
      cleaned?.body_clean_text ||
      String(metadata.body_clean_text || row.content_preview || '').trim();

    const cleanedText = showQuoted
      ? cleanedTextInitial
      : cleanedTextInitial
          .replace(/\nOn .*wrote:\n[\s\S]*$/im, '\n')
          .replace(/\nFrom:\s.*$/im, '\n')
          .trim();

    const cleanedHtml = cleaned?.body_clean_html || '';
    const links = Array.from(
      new Set([
        ...Array.from(cleanedText.matchAll(/https?:\/\/[^\s<>()"']+/g)).map((m) => m[0]),
        ...Array.from(cleanedHtml.matchAll(/href=["']([^"']+)["']/gi)).map((m) => m[1]),
      ]),
    ).slice(0, 50);

    const payload = {
      messageId,
      cleanedText,
      cleanedHtml,
      extractedLinks: links,
      extractedEntities: normalizeList(metadata.extracted_entities || []),
      mimeWarnings:
        cleaned?.mime_parse_status === 'failed'
          ? [cleaned.mime_parse_reason || 'MIME parse failed']
          : [],
      parseStatus: cleaned?.mime_parse_status || 'partial',
      ingestRunId: row.ingestRunId,
      pipelineVersion: row.pipelineVersion,
      sourceFile: {
        fileName: row.fileName,
        filePath: row.filePath,
      },
      rawAvailable: source.length > 0,
    };

    const dto = mapEmailMessageBodyDto(payload);
    performanceCache.set(cacheKey, dto, BODY_TTL_SECONDS);
    res.json(dto);
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/messages/:messageId/thread
router.get(
  '/messages/:messageId/thread',
  validate(messageIdParamSchema),
  async (req, res, next) => {
    try {
      const row = (await getEmailMessageThreadPointer(req.params.messageId)) as
        | { id: number; metadata_json: string | null }
        | undefined;

      if (!row) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const threadId = normalizeThreadId(row.metadata_json, row.id);
      res.json({ messageId: req.params.messageId, threadId });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/emails/messages/:messageId/raw
router.get('/messages/:messageId/raw', validate(messageIdParamSchema), async (req, res, next) => {
  try {
    const row = (await getEmailRawMessageRecord(req.params.messageId)) as
      | { id: number; content: string | null; metadata_json: string | null }
      | undefined;

    if (!row) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const metadata = safeJsonParse<Record<string, unknown>>(row.metadata_json, {});
    const raw = String(metadata.body_raw || metadata.raw || row.content || '');

    res.json(
      mapEmailRawMessageDto({
        messageId: req.params.messageId,
        raw,
        warning: 'Raw MIME content can include malformed or unsafe markup. Inspect with caution.',
        determinism:
          'Raw view is a direct source payload and is not transformed except transport encoding.',
      }),
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/search
router.get('/search', validate(emailSearchSchema), async (req, res, next) => {
  try {
    const queryParams = req.query as Record<string, unknown>;
    const q = readString(queryParams.q) || '';
    const scope = queryParams.scope === 'mailbox' ? 'mailbox' : 'global';
    const mailboxId = readString(queryParams.mailboxId);
    const limit = readNumber(queryParams.limit, 20);

    let mailboxEntityId: number | null = null;
    if (scope === 'mailbox' && mailboxId?.startsWith('entity:')) {
      const entityId = Number(mailboxId.replace('entity:', ''));
      if (Number.isFinite(entityId) && entityId > 0) {
        mailboxEntityId = entityId;
      }
    }
    const rows = (await searchEmailMessagesLegacy({
      q,
      mailboxEntityId,
      limit,
    })) as Array<{
      messageId: number;
      threadId: string;
      subject: string;
      fromAddress: string;
      dateCreated: string;
      snippet: string;
    }>;

    const lowerNeedle = q.toLowerCase();
    const payload = {
      scope,
      q,
      data: rows.map((row) => {
        const haystack = `${row.subject}\n${row.snippet}`.toLowerCase();
        const start = haystack.indexOf(lowerNeedle);
        const end = start >= 0 ? start + q.length : -1;
        return {
          threadId: row.threadId,
          messageId: String(row.messageId),
          subject: row.subject,
          from: row.fromAddress,
          date: row.dateCreated,
          snippet: row.snippet,
          highlights: start >= 0 ? [{ start, end }] : [],
        };
      }),
    };

    res.json(mapEmailSearchResponseDto(payload));
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/categories (legacy support)
router.get('/categories', validate(z.object({})), async (_req, res, next) => {
  try {
    const counts = await getEmailCategoriesCounts();
    res.json(counts);
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/:id/entities (legacy + current UI support)
router.get('/:id/entities', validate(emailIdParamSchema), async (req, res, next) => {
  try {
    const email = (await getEmailDocumentContentById(req.params.id)) as
      | { content: string }
      | undefined;

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const entities = await getEntitiesInEmail(email.content || '');
    res.json({ entities });
  } catch (error) {
    next(error);
  }
});

// GET /api/emails/known-senders (legacy support)
router.get('/known-senders', validate(z.object({})), async (_req, res) => {
  res.json(getKnownEntitySenders());
});

const legacyIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// Legacy aliases to avoid contract breakage
router.get('/thread/:id', validate(legacyIdParamSchema), async (req, res, next) => {
  try {
    return res.redirect(307, `/api/emails/threads/${encodeURIComponent(req.params.id)}`);
  } catch (error) {
    return next(error);
  }
});

router.get('/message/:id', validate(legacyIdParamSchema), async (req, res, next) => {
  try {
    return res.redirect(307, `/api/emails/messages/${encodeURIComponent(req.params.id)}/body`);
  } catch (error) {
    return next(error);
  }
});

// Legacy root endpoint maps to thread metadata list
router.get('/', async (req, res, next) => {
  const mailboxId = typeof req.query.mailboxId === 'string' ? req.query.mailboxId : 'all';
  const q =
    typeof req.query.search === 'string'
      ? req.query.search
      : typeof req.query.q === 'string'
        ? req.query.q
        : '';
  const tab = typeof req.query.category === 'string' ? req.query.category : 'all';
  const limit = typeof req.query.limit === 'string' ? req.query.limit : String(DEFAULT_LIMIT);
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

  try {
    const target = `/api/emails/threads?mailboxId=${encodeURIComponent(mailboxId)}&q=${encodeURIComponent(q)}&tab=${encodeURIComponent(tab)}&limit=${encodeURIComponent(limit)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    return res.redirect(307, target);
  } catch (error) {
    return next(error);
  }
});

export default router;
