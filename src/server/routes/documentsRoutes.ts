import express from 'express';
import { documentsRepository } from '../db/documentsRepository.js';
import { documentPagesRepository } from '../db/documentPagesRepository.js';
import { documentAnnotationsRepository } from '../db/documentAnnotationsRepository.js';
import { dataQualityRepository } from '../db/dataQualityRepository.js';
import { redactionsRepository } from '../db/redactionsRepository.js';
import { z } from 'zod';
import {
  DocumentRedactionsSchema,
  RedactionIntelligenceSummarySchema,
  RedactionQueueSchema,
} from '../../shared/schemas/redactions.js';
import { validate } from '../middleware/validate.js';
import {
  mapDocumentsListResponseDto,
  mapDocumentDetailDto,
} from '../mappers/documentsDtoMapper.js';
import { searchRepository } from '../db/searchRepository.js';
import { icebergRepository } from '../db/icebergRepository.js';
import { AnnotationPolicyService } from '../services/AnnotationPolicyService.js';
import { logger } from '../services/Logger.js';
import fs from 'fs';
import path from 'path';
import type { Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';
import {
  annotationWriteLimiter,
  documentFileLimiter,
  documentsListLimiter,
} from '../middleware/rateLimit.js';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { withTimeoutFallback } from '../utils/asyncTimeout.js';
import {
  authenticateRequest,
  optionalAuthenticate,
  requireRole,
  type AuthRequest,
} from '../auth/middleware.js';
import { rejectDeepOffset, RELATED_LIST_LIMIT_CAP } from '../utils/paginationGuards.js';
import { getApiPool } from '../db/connection.js';

const router = express.Router();
const ASSET_PROXY_TIMEOUT_MS = 30_000;
const verifiedAssetCache = new Map<string, string>();
const VERIFIED_ASSET_CACHE_LIMIT = 1_024;

export function attachmentDisposition(filename: string): string {
  const basename = path.basename(filename || 'original-document').replace(/[\r\n]/g, '');
  const ascii = basename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii || 'original-document'}"; filename*=UTF-8''${encodeURIComponent(basename)}`;
}

interface ByteRange {
  end: number;
  start: number;
}

interface VerifiedPinnedAsset {
  stats: Stats;
}

const fileIdentityKey = (filePath: string, stats: Stats): string =>
  [filePath, stats.dev, stats.ino, stats.size, stats.mtimeMs, stats.ctimeMs].join('\u001f');

export async function verifyPinnedAssetFile(
  fileHandle: FileHandle,
  filePath: string,
  expectedSha256: string,
): Promise<VerifiedPinnedAsset | null> {
  const initialStats = await fileHandle.stat();
  if (!initialStats.isFile()) return null;

  const initialIdentity = fileIdentityKey(filePath, initialStats);
  if (verifiedAssetCache.get(initialIdentity) === expectedSha256) {
    return { stats: initialStats };
  }

  const digest = await new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fileHandle.createReadStream({ autoClose: false, start: 0 });
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
  if (digest !== expectedSha256) return null;

  const verifiedStats = await fileHandle.stat();
  const verifiedIdentity = fileIdentityKey(filePath, verifiedStats);
  if (verifiedIdentity !== initialIdentity) return null;

  if (verifiedAssetCache.size >= VERIFIED_ASSET_CACHE_LIMIT) {
    const oldestKey = verifiedAssetCache.keys().next().value as string | undefined;
    if (oldestKey) verifiedAssetCache.delete(oldestKey);
  }
  verifiedAssetCache.set(verifiedIdentity, digest);
  return { stats: verifiedStats };
}

function parseSingleByteRange(rangeHeader: string, size: number): ByteRange | null {
  if (size <= 0 || rangeHeader.includes(',')) return null;
  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/i);
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return null;
  }
  return { start, end: Math.min(requestedEnd, size - 1) };
}

function requestEtagMatches(rawHeader: string | undefined, etag: string): boolean {
  if (!rawHeader) return false;
  return rawHeader.split(',').some((candidate) => {
    const normalized = candidate.trim();
    return normalized === '*' || normalized === etag || normalized.replace(/^W\//, '') === etag;
  });
}

function ifRangeAllowsRange(rawHeader: string | undefined, etag: string, stats: Stats): boolean {
  if (!rawHeader) return true;
  const normalized = rawHeader.trim();
  if (normalized.startsWith('"') || normalized.startsWith('W/')) return normalized === etag;

  const requestedDate = Date.parse(normalized);
  if (!Number.isFinite(requestedDate)) return false;
  return Math.floor(stats.mtimeMs / 1_000) * 1_000 <= requestedDate;
}

const documentsListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    search: z.string().optional(),
    fileType: z.string().optional(),
    evidenceType: z.string().optional(),
    source: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    hasFailedRedactions: z
      .preprocess(
        (val) =>
          typeof val === 'string'
            ? val.toLowerCase() === 'true'
            : typeof val === 'boolean'
              ? val
              : undefined,
        z.boolean().optional(),
      )
      .optional(),
    minRedFlag: z.coerce.number().int().min(0).max(5).optional(),
    maxRedFlag: z.coerce.number().int().min(0).max(5).optional(),
    sortBy: z
      .enum(['date', 'title', 'red_flag', 'size', 'relevance', 'fileType', 'significance'])
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    collectionId: z.string().optional(),
    includeMedia: z
      .preprocess(
        (val) =>
          typeof val === 'string'
            ? val.toLowerCase() === 'true'
            : typeof val === 'boolean'
              ? val
              : undefined,
        z.boolean().optional(),
      )
      .default(false),
    excludedFileTypes: z.string().optional(),
    mode: z.enum(['lexical', 'semantic', 'hybrid']).default('lexical'),
    cursor: z.string().optional(),
  }),
});

const documentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const documentContextSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  query: z.object({
    entityIds: z.string().optional(),
    claimId: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
  }),
});

const createDocumentAnnotationSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    type: z.enum(['highlight', 'note', 'evidence', 'question', 'contradiction', 'tag']),
    selectedText: z.string().trim().min(1).max(2000),
    note: z.string().trim().max(4000).optional().default(''),
    start: z.number().int().min(0),
    end: z.number().int().min(1),
    contextBefore: z.string().max(500).optional(),
    contextAfter: z.string().max(500).optional(),
    pdfPage: z.number().int().positive().optional(),
    pdfX: z.number().min(0).max(1).optional(),
    pdfY: z.number().min(0).max(1).optional(),
    pdfWidth: z.number().positive().max(1).optional(),
    pdfHeight: z.number().positive().max(1).optional(),
  }),
});

const createFingerprint = (ip: string, userAgent: string): string => {
  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex');
};

const normalizeExistingRoot = (rootPath: string): string | null => {
  const resolved = path.resolve(rootPath);
  if (!fs.existsSync(resolved)) return null;
  return fs.realpathSync(resolved);
};

const isWithinRoot = (candidate: string, root: string): boolean => {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
};

const withDocumentsListTimeout = async <T>(promise: Promise<T>): Promise<T | null> =>
  withTimeoutFallback<T | null>(promise, null, {
    timeoutMs: 15_000,
    onTimeout: () => logger.warn('[Documents] list query timed out'),
  });

// GET /api/documents
router.get(
  '/',
  documentsListLimiter,
  validate(documentsListQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.query;
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 50);
      const cursor = (query as Record<string, unknown>).cursor as string | undefined;
      const sortOrder: 'asc' | 'desc' | undefined =
        query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : undefined;
      const searchMode =
        query.mode === 'semantic' || query.mode === 'hybrid' || query.mode === 'lexical'
          ? query.mode
          : 'lexical';

      if (!cursor && rejectDeepOffset(res, 'Document', page, limit)) return;

      if (
        typeof query.search === 'string' &&
        query.search.trim().length > 0 &&
        searchMode !== 'lexical'
      ) {
        const semanticResult = await searchRepository.search(query.search, limit, {
          mode: searchMode,
          evidenceType: query.evidenceType as string | undefined,
        });
        const semanticAvailable = semanticResult.semanticCapability?.available === true;
        const effectiveMode = semanticAvailable ? searchMode : 'lexical';
        const response = mapDocumentsListResponseDto({
          documents: semanticResult.documents,
          total: semanticResult.documents.length,
          page,
          pageSize: limit,
          totalPages: 1,
          searchMeta: {
            requestedMode: searchMode,
            effectiveMode,
            semanticAvailable,
            semanticReason: semanticResult.semanticCapability?.reason,
            message:
              searchMode === 'semantic' && !semanticAvailable
                ? 'Conceptual search is unavailable in this environment, so keyword results are shown instead.'
                : searchMode === 'hybrid' && !semanticAvailable
                  ? 'Hybrid search is using keyword results because semantic indexes are unavailable.'
                  : undefined,
          },
        });
        return res.json(response);
      }

      const filters = {
        search: query.search as string | undefined,
        fileType: query.fileType as string | undefined,
        evidenceType: query.evidenceType as string | undefined,
        source: query.source as string | undefined,
        startDate: query.startDate as string | undefined,
        endDate: query.endDate as string | undefined,
        hasFailedRedactions:
          typeof query.hasFailedRedactions === 'boolean' ? query.hasFailedRedactions : undefined,
        minRedFlag: query.minRedFlag !== undefined ? Number(query.minRedFlag) : undefined,
        maxRedFlag: query.maxRedFlag !== undefined ? Number(query.maxRedFlag) : undefined,
        sortBy: query.sortBy as string | undefined,
        sortOrder,
        collectionId: query.collectionId as string | undefined,
        includeMedia: (query.includeMedia as unknown as boolean) ?? false,
        excludedFileTypes: query.excludedFileTypes
          ? (query.excludedFileTypes as string).split(',').filter(Boolean)
          : undefined,
      };

      const result = cursor
        ? await withDocumentsListTimeout(
            documentsRepository.getDocumentsCursor(cursor, limit, filters),
          )
        : await withDocumentsListTimeout(documentsRepository.getDocuments(page, limit, filters));
      if (result === null) {
        res.setHeader('Retry-After', '5');
        return res.status(503).json({
          error: {
            code: 'DOCUMENTS_TIMEOUT',
            message: 'Documents are taking longer to load. Please retry.',
          },
        });
      }

      if (cursor && 'meta' in result) {
        const { meta } = result as {
          meta: { total: number; limit: number; hasMore: boolean; nextCursor: string | null };
        };
        const mapped = mapDocumentsListResponseDto(result);
        return res.json({ ...mapped, meta });
      }

      return res.json(mapDocumentsListResponseDto(result));
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/documents/:id/context
router.get('/:id/context', validate(documentContextSchema), async (req, res, next) => {
  try {
    const params = req.params as unknown as { id: number };
    const query = req.query as unknown as z.infer<typeof documentContextSchema>['query'];
    const entityIds = String(query.entityIds || '')
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    const context = await icebergRepository.getDocumentContext({
      documentId: params.id,
      entityIds,
      page: query.page,
    });
    if (!context) return res.status(404).json({ error: 'Document context not found' });
    return res.json(context);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/pages
router.get('/:id/pages', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await documentPagesRepository.getDocumentPages(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/lineage
router.get('/:id/lineage', validate(documentIdSchema), async (req, res, next) => {
  try {
    const documentId = Number(req.params.id);
    if (!Number.isFinite(documentId) || documentId <= 0) {
      return res.status(400).json({ error: 'Invalid document id' });
    }

    const lineage = await dataQualityRepository.getDocumentLineage(documentId);
    if (!lineage) {
      return res.status(404).json({ error: 'Document lineage not found' });
    }

    return res.json(lineage);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/annotations
router.get(
  '/:id/annotations',
  validate(documentIdSchema),
  optionalAuthenticate,
  async (req, res, next) => {
    try {
      const documentId = String(req.params.id);
      if (!/^\d+$/.test(documentId)) {
        return res.status(400).json({ error: 'Invalid document id' });
      }

      const authReq = req as AuthRequest;

      const annotations = await documentAnnotationsRepository.getByDocumentId(documentId, {
        includeForensic: AnnotationPolicyService.canReadForensic(authReq),
        includeDrafts: AnnotationPolicyService.canReadDrafts(authReq),
      });
      return res.json({
        annotations: annotations.map((annotation) => ({
          id: annotation.id,
          documentId: String(annotation.document_id),
          type: annotation.annotation_type,
          selectedText: annotation.selected_text,
          note: annotation.note,
          scope: annotation.scope || 'public',
          reviewState: annotation.review_state || 'approved',
          position: {
            start: annotation.start_offset,
            end: annotation.end_offset,
          },
          contextBefore: annotation.context_before,
          contextAfter: annotation.context_after,
          author: annotation.author_label,
          pdfPage: annotation.pdf_page,
          pdfX: annotation.pdf_x,
          pdfY: annotation.pdf_y,
          pdfWidth: annotation.pdf_width,
          pdfHeight: annotation.pdf_height,
          createdAt: annotation.created_at,
          updatedAt: annotation.updated_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/documents/:id/annotations
router.post(
  '/:id/annotations',
  authenticateRequest,
  annotationWriteLimiter,
  validate(createDocumentAnnotationSchema),
  async (req, res, next) => {
    try {
      const documentId = String(req.params.id);
      if (!/^\d+$/.test(documentId)) {
        return res.status(400).json({ error: 'Invalid document id' });
      }

      const {
        type,
        selectedText,
        note,
        start,
        end,
        contextBefore,
        contextAfter,
        pdfPage,
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
      } = req.body;
      if (end <= start) {
        return res.status(400).json({ error: 'Invalid annotation span' });
      }

      const doc = await documentsRepository.getDocumentById(documentId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const ip = String(req.ip || '');
      const userAgent = String(req.get('user-agent') || '');
      const policy = AnnotationPolicyService.decideWrite(req as AuthRequest);

      let fingerprint: string;
      if ((req as AuthRequest).user?.role === 'guest') {
        fingerprint = (req as AuthRequest).user!.id.replace('guest:', '');
      } else {
        fingerprint = createFingerprint(ip, userAgent);
      }

      const annotation = await documentAnnotationsRepository.create({
        documentId,
        annotationType: type,
        selectedText,
        note: note || '',
        startOffset: start,
        endOffset: end,
        contextBefore,
        contextAfter,
        authorLabel: policy.authorLabel,
        authorFingerprintHash: fingerprint,
        pdfPage,
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
        scope: policy.scope,
        reviewState: policy.reviewState,
        createdByUserId: policy.actorUserId,
        createdByRole: policy.actorRole,
        requestId: req.requestId || null,
      });

      return res.status(201).json({
        annotation: {
          id: annotation.id,
          documentId: String(annotation.document_id),
          type: annotation.annotation_type,
          selectedText: annotation.selected_text,
          note: annotation.note,
          scope: annotation.scope || policy.scope,
          reviewState: annotation.review_state || policy.reviewState,
          position: {
            start: annotation.start_offset,
            end: annotation.end_offset,
          },
          contextBefore: annotation.context_before,
          contextAfter: annotation.context_after,
          author: annotation.author_label,
          pdfPage: annotation.pdf_page,
          pdfX: annotation.pdf_x,
          pdfY: annotation.pdf_y,
          pdfWidth: annotation.pdf_width,
          pdfHeight: annotation.pdf_height,
          createdAt: annotation.created_at,
          updatedAt: annotation.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

const annotationModerationSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    annotationId: z.string().min(1),
  }),
});

router.post(
  '/:id/annotations/:annotationId/approve',
  authenticateRequest,
  requireRole('admin'),
  validate(annotationModerationSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { id, annotationId } = req.params;
      const ip = String(req.ip || '');
      const userAgent = String(req.get('user-agent') || '');
      const fingerprint = createFingerprint(ip, userAgent);
      const updated = await documentAnnotationsRepository.setReviewState(
        String(id),
        String(annotationId),
        'approved',
        { userId: req.user?.id || null, role: req.user?.role || null, fingerprint },
        req.requestId || null,
      );
      if (!updated) {
        return res.status(404).json({ error: 'Annotation not found' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/:id/annotations/:annotationId/reject',
  authenticateRequest,
  requireRole('admin'),
  validate(annotationModerationSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { id, annotationId } = req.params;
      const ip = String(req.ip || '');
      const userAgent = String(req.get('user-agent') || '');
      const fingerprint = createFingerprint(ip, userAgent);
      const updated = await documentAnnotationsRepository.setReviewState(
        String(id),
        String(annotationId),
        'rejected',
        { userId: req.user?.id || null, role: req.user?.role || null, fingerprint },
        req.requestId || null,
      );
      if (!updated) {
        return res.status(404).json({ error: 'Annotation not found' });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/documents/redactions/summary
router.get('/redactions/summary', async (_req, res, next) => {
  try {
    res.json(RedactionIntelligenceSummarySchema.parse(await redactionsRepository.getSummary()));
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/redactions/queue
router.get('/redactions/queue', async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    res.json(RedactionQueueSchema.parse(await redactionsRepository.getQueue(limit)));
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/redactions
router.get('/:id/redactions', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const findings = await redactionsRepository.getDocumentFindings(String(id));
    res.json(
      DocumentRedactionsSchema.parse({
        documentId: String(id),
        sourceFileUrl: `/api/documents/${encodeURIComponent(String(id))}/file?variant=original`,
        count: findings.length,
        overlayRecoveryCount: findings.filter((finding) => finding.type === 'overlay_text_exposed')
          .length,
        hypothesisCount: findings.filter((finding) => finding.type === 'contextual_hypothesis')
          .length,
        unresolvedCount: findings.filter((finding) => finding.type === 'unresolved_redaction')
          .length,
        findings,
        disclaimer:
          'Confidence ranks machine-generated leads. It does not establish identity, accuracy, guilt, or truth. Verify every finding against the original document and independent evidence.',
      }),
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/file — intentionally public (no auth): corpus files are public research material.
// Path traversal is prevented by withinAllowedRoots check below.
router.get('/:id/file', documentFileLimiter, validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = String(req.query.variant || 'dirty').toLowerCase();
    const forceDownload = ['1', 'true', 'attachment'].includes(
      String(req.query.download || req.query.disposition || '').toLowerCase(),
    );
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const requestedAssetSha256 = String(req.query.assetSha256 || '')
      .trim()
      .toLowerCase()
      .replace(/^sha256:/, '');
    if (requestedAssetSha256 && !/^[a-f0-9]{64}$/.test(requestedAssetSha256)) {
      return res.status(400).json({ error: 'assetSha256 must be a SHA-256 hex digest' });
    }

    const pinnedAsset = requestedAssetSha256
      ? (
          await getApiPool().query<{
            id: string;
            storage_path: string;
            file_name: string | null;
            mime_type: string | null;
            sha256: string;
          }>(
            `
              SELECT
                pinned.id::text AS id,
                pinned.storage_path,
                pinned.file_name,
                pinned.mime_type,
                LOWER(REGEXP_REPLACE(pinned.sha256, '^sha256:', '')) AS sha256
              FROM file_assets pinned
              WHERE LOWER(REGEXP_REPLACE(pinned.sha256, '^sha256:', '')) = $2
                AND (
                  EXISTS (
                    SELECT 1
                    FROM document_assets da
                    JOIN file_assets linked ON linked.id = da.asset_id
                    WHERE da.document_id = $1
                      AND COALESCE(linked.original_asset_id, linked.id) = pinned.id
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM evidence_passages ep
                    WHERE ep.document_id = $1
                      AND ep.asset_id = pinned.id
                      AND ep.asset_sha256 = $2
                  )
                )
              ORDER BY pinned.id ASC
              LIMIT 1
            `,
            [id, requestedAssetSha256],
          )
        ).rows[0] || null
      : null;
    if (requestedAssetSha256 && !pinnedAsset) {
      return res.status(404).json({ error: 'Pinned evidence asset not found for document' });
    }

    const docAny = doc as unknown as Record<string, unknown>;
    const metadata = (docAny.metadata || {}) as Record<string, unknown>;
    const responseFilename = String(
      pinnedAsset?.file_name || doc.fileName || docAny.file_name || `document-${id}`,
    );
    const setContentDisposition = (fallbackPath?: string): void => {
      const filename =
        responseFilename || (fallbackPath ? path.basename(fallbackPath) : 'document');
      res.setHeader(
        'Content-Disposition',
        forceDownload
          ? attachmentDisposition(filename)
          : `inline; filename="${filename.replace(/["\r\n]/g, '')}"`,
      );
    };
    const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);
    const firstNonUrl = (values: unknown[]): string => {
      for (const candidate of values) {
        const normalized = String(candidate || '').trim();
        if (!normalized) continue;
        if (isHttpUrl(normalized)) continue;
        return normalized;
      }
      return '';
    };
    const firstHttpUrl = (values: unknown[]): string => {
      for (const candidate of values) {
        const normalized = String(candidate || '').trim();
        if (!normalized) continue;
        if (!isHttpUrl(normalized)) continue;
        return normalized;
      }
      return '';
    };

    const deriveRemoteUrlFromPath = (candidatePath: string): string => {
      const normalized = String(candidatePath || '').trim();
      if (!normalized) return '';
      if (isHttpUrl(normalized)) return normalized;

      const cleaned = normalized.replace(/\\/g, '/');
      const match = cleaned.match(
        /(epstein\.academy|www\.justice(?:-\d+)?\.gov|justice\.gov)(\/epstein\/files\/.+)/i,
      );
      if (!match) return '';
      const matchedHost = match[1].toLowerCase();
      // DOJ corpus mirrors are stored locally under hostnames such as
      // `www.justice-7.gov`. Those are directory labels, not public hosts.
      const host = /^www\.justice-\d+\.gov$/i.test(matchedHost) ? 'www.justice.gov' : matchedHost;
      const pathname = match[2];
      return `https://${host}${pathname}`;
    };

    const isAllowedRemoteUrl = (rawUrl: string): boolean => {
      try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
        const host = url.hostname.toLowerCase();

        // Block private IP ranges (RFC 1918, RFC 3927, RFC 4193, RFC 4291)
        // IPv4 private ranges
        if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(host)) return false;
        // IPv6 private/local
        if (/^(::1|localhost|127\.)/i.test(host)) return false;
        if (/^(fe80:|fc00:|fd00:)/i.test(host)) return false;
        // Block link-local (169.254.x.x) — used for metadata API
        if (/^169\.254\./.test(host)) return false;
        // Block reserved/broadcast
        if (/^(0\.|224\.|240\.)/.test(host)) return false;
        // Block .local, .internal, .intranet, etc.
        if (
          host.endsWith('.local') ||
          host.endsWith('.internal') ||
          host.endsWith('.intranet') ||
          host.endsWith('.private')
        )
          return false;

        // Only allow explicitly approved external hosts
        const allowed =
          host === 'epstein.academy' ||
          host.endsWith('.epstein.academy') ||
          host === 'justice.gov' ||
          host.endsWith('.justice.gov');
        return allowed;
      } catch {
        return false;
      }
    };

    const dirtyPath = pinnedAsset
      ? firstNonUrl([pinnedAsset.storage_path])
      : firstNonUrl([
          doc.filePath,
          docAny.file_path,
          metadata.filePath,
          metadata.file_path,
          metadata.originalPath,
          metadata.original_path,
        ]);
    const originalPath = pinnedAsset
      ? firstNonUrl([pinnedAsset.storage_path])
      : firstNonUrl([metadata.source_path]);
    const cleanedPath = pinnedAsset
      ? firstNonUrl([pinnedAsset.storage_path])
      : firstNonUrl([
          docAny.cleanedPath,
          docAny.cleaned_path,
          metadata.cleanedPath,
          metadata.cleaned_path,
          metadata.cleaned_path_refined,
        ]);
    const dirtyUrl = pinnedAsset
      ? firstHttpUrl([pinnedAsset.storage_path])
      : firstHttpUrl([
          doc.filePath,
          docAny.file_path,
          metadata.filePath,
          metadata.file_path,
          metadata.originalPath,
          metadata.original_path,
        ]);
    const originalUrl = pinnedAsset
      ? firstHttpUrl([pinnedAsset.storage_path])
      : firstHttpUrl([metadata.source_path]);
    const cleanedUrl = pinnedAsset
      ? firstHttpUrl([pinnedAsset.storage_path])
      : firstHttpUrl([
          docAny.cleanedPath,
          docAny.cleaned_path,
          metadata.cleanedPath,
          metadata.cleaned_path,
          metadata.cleaned_path_refined,
        ]);

    const variants = {
      dirty: dirtyPath,
      original: originalPath,
      cleaned: cleanedPath,
    };
    const variantUrls = {
      dirty: dirtyUrl,
      original: originalUrl,
      cleaned: cleanedUrl,
    };

    const allowedRoots = [
      normalizeExistingRoot(path.resolve(process.cwd(), 'data')),
      process.env.RAW_CORPUS_BASE_PATH
        ? normalizeExistingRoot(process.env.RAW_CORPUS_BASE_PATH)
        : null,
    ].filter((root): root is string => Boolean(root));

    const checkFile = (
      candidatePath: string,
    ): {
      absolutePath: string;
      exists: boolean;
      allowed: boolean;
      isFile: boolean;
      attemptedPaths: string[];
    } => {
      if (!candidatePath) {
        return {
          absolutePath: '',
          exists: false,
          allowed: false,
          isFile: false,
          attemptedPaths: [],
        };
      }

      const attemptedPaths: string[] = [];
      const normalizedCandidate = candidatePath.replace(/^\/+/, '');
      const normalizedNoDataPrefix = normalizedCandidate.replace(/^(?:\.\/)?data\//, '');
      const decodedCandidate = (() => {
        try {
          return decodeURIComponent(normalizedCandidate);
        } catch {
          return normalizedCandidate;
        }
      })();
      const decodedNoDataPrefix = decodedCandidate.replace(/^(?:\.\/)?data\//, '');

      // Build list of potential absolute paths to check
      const potentialPaths: string[] = [];
      if (path.isAbsolute(candidatePath)) {
        potentialPaths.push(candidatePath);
      } else {
        // Try project root
        potentialPaths.push(path.resolve(process.cwd(), normalizedCandidate));
        potentialPaths.push(path.resolve(process.cwd(), decodedCandidate));
        // Try relative to each allowed root
        for (const root of allowedRoots) {
          potentialPaths.push(path.resolve(root, normalizedCandidate));
          potentialPaths.push(path.resolve(root, decodedCandidate));
          if (normalizedNoDataPrefix !== normalizedCandidate) {
            potentialPaths.push(path.resolve(root, normalizedNoDataPrefix));
          }
          if (decodedNoDataPrefix !== decodedCandidate) {
            potentialPaths.push(path.resolve(root, decodedNoDataPrefix));
          }
        }
      }

      for (const absPath of Array.from(new Set(potentialPaths))) {
        attemptedPaths.push(absPath);
        if (fs.existsSync(absPath)) {
          try {
            const canonical = fs.realpathSync(absPath);
            const stats = fs.statSync(canonical);
            if (stats.isFile()) {
              const allowed = allowedRoots.some((root) => isWithinRoot(canonical, root));
              if (allowed) {
                return {
                  absolutePath: canonical,
                  exists: true,
                  allowed: true,
                  isFile: true,
                  attemptedPaths,
                };
              }
            }
          } catch (_e) {
            // Skip paths that fail to resolve (e.g. symlink loops, permission denied)
            continue;
          }
        }
      }

      return { absolutePath: '', exists: false, allowed: false, isFile: false, attemptedPaths };
    };

    // Attempt resolution with fallback
    const primaryVariant = variant as keyof typeof variants;
    const variantOrder: (keyof typeof variants)[] = pinnedAsset ? ['original'] : [primaryVariant];
    if (!pinnedAsset && primaryVariant === 'original') variantOrder.push('dirty', 'cleaned');
    else if (!pinnedAsset && primaryVariant === 'cleaned') variantOrder.push('dirty', 'original');
    else if (!pinnedAsset) variantOrder.push('original', 'cleaned');

    let finalFileResult: ReturnType<typeof checkFile> | null = null;
    let fallbackUsed = false;
    const allAttempted: Record<string, string[]> = {};

    for (const v of variantOrder) {
      const res = checkFile(variants[v]);
      allAttempted[v] = res.attemptedPaths;
      if (res.exists && res.allowed && res.isFile) {
        finalFileResult = res;
        if (v !== primaryVariant) fallbackUsed = true;
        break;
      }
    }

    if (!finalFileResult) {
      if (pinnedAsset) {
        return res.status(404).json({
          error: 'Pinned evidence asset is not available from an approved local corpus path',
          id,
          assetSha256: requestedAssetSha256,
          attemptedPaths: allAttempted,
        });
      }
      const remoteFallbackEnabled = process.env.PUBLIC_REMOTE_FILE_FALLBACK !== 'false';
      const isEmailRecord = String(docAny.evidenceType || docAny.evidence_type || '')
        .toLowerCase()
        .includes('email');

      if (isEmailRecord) {
        const from = String(metadata.from || metadata.sender || 'unknown@archive.local');
        const to = String(metadata.to || metadata.recipients || 'undisclosed-recipients');
        const subject = String(metadata.subject || doc.title || doc.fileName || 'Untitled Email');
        const date = String(metadata.date || doc.dateCreated || new Date().toUTCString());
        const body = String(docAny.contentRefined || docAny.content || '').trim();
        const eml = [
          `From: ${from}`,
          `To: ${to}`,
          `Subject: ${subject}`,
          `Date: ${date}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=utf-8',
          '',
          body || '[No extracted body available]',
          '',
        ].join('\r\n');

        res.setHeader('Content-Type', 'message/rfc822; charset=utf-8');
        setContentDisposition();
        return res.status(200).send(eml);
      }

      if (!remoteFallbackEnabled) {
        return res.status(404).json({
          error: 'No valid local file path found for document',
          id,
          requestedVariant: variant,
          checkedVariants: variantOrder,
          attemptedPaths: allAttempted,
        });
      }

      for (const v of variantOrder) {
        const candidateUrl = variantUrls[v] || deriveRemoteUrlFromPath(variants[v] || '');
        if (!candidateUrl) continue;
        if (!isAllowedRemoteUrl(candidateUrl)) continue;
        // In production, only DOJ is a valid upstream fallback. Proxying this
        // application's own public URL would recurse when a local corpus file
        // is absent.
        if (process.env.NODE_ENV === 'production') {
          const candidateHost = new URL(candidateUrl).hostname.toLowerCase();
          if (candidateHost !== 'justice.gov' && !candidateHost.endsWith('.justice.gov')) continue;
        }

        const rangeHeader = req.header('range') || undefined;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ASSET_PROXY_TIMEOUT_MS);
        try {
          const parsedUpstreamUrl = new URL(candidateUrl);
          const ageGateCookie = parsedUpstreamUrl.hostname.endsWith('justice.gov')
            ? 'justiceGovAgeVerified=true'
            : '';

          const upstream = await fetch(candidateUrl, {
            headers: {
              ...(rangeHeader ? { range: rangeHeader } : {}),
              'user-agent': 'epstein-archive',
              ...(ageGateCookie ? { cookie: ageGateCookie } : {}),
            },
            redirect: 'follow',
            signal: controller.signal,
          });

          if (!upstream.ok && upstream.status !== 206) continue;

          const body = upstream.body;
          if (!body) continue;

          const contentType = upstream.headers.get('content-type');
          const contentTypeLower = String(contentType || '').toLowerCase();
          if (contentTypeLower.includes('text/html')) continue;
          const contentLength = upstream.headers.get('content-length');
          const acceptRanges = upstream.headers.get('accept-ranges');
          const contentRange = upstream.headers.get('content-range');

          res.status(upstream.status);
          setContentDisposition();
          res.setHeader('X-Asset-Proxy', 'true');
          if (v !== primaryVariant) res.setHeader('X-Asset-Fallback', 'true');
          if (contentType) res.setHeader('Content-Type', contentType);
          if (contentLength) res.setHeader('Content-Length', contentLength);
          if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
          if (contentRange) res.setHeader('Content-Range', contentRange);

          Readable.fromWeb(body as unknown as WebReadableStream<Uint8Array>).pipe(res);
          return;
        } catch {
          continue;
        } finally {
          clearTimeout(timeout);
        }
      }

      return res.status(404).json({
        error: 'No valid local file path found for document',
        id,
        requestedVariant: variant,
        checkedVariants: variantOrder,
        attemptedPaths: allAttempted,
      });
    }

    setContentDisposition(finalFileResult.absolutePath);
    if (pinnedAsset) {
      let fileHandle: FileHandle | null = null;
      const closeFileHandle = async (): Promise<void> => {
        const activeHandle = fileHandle;
        fileHandle = null;
        if (activeHandle) await activeHandle.close();
      };

      try {
        fileHandle = await fs.promises.open(
          finalFileResult.absolutePath,
          fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
        );
        const verified = await verifyPinnedAssetFile(
          fileHandle,
          finalFileResult.absolutePath,
          requestedAssetSha256,
        );
        if (!verified) {
          await closeFileHandle();
          return res.status(409).json({
            error: 'Pinned evidence asset failed SHA-256 verification',
            id,
            assetSha256: requestedAssetSha256,
          });
        }

        const { stats } = verified;
        const etag = `"sha256-${requestedAssetSha256}"`;
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', stats.mtime.toUTCString());
        res.setHeader('X-Evidence-Asset-ID', pinnedAsset.id);
        res.setHeader('X-Evidence-Asset-SHA256', requestedAssetSha256);
        res.type(pinnedAsset.mime_type || pinnedAsset.file_name || finalFileResult.absolutePath);
        if (fallbackUsed) res.setHeader('X-Asset-Fallback', 'true');

        if (requestEtagMatches(req.header('if-none-match'), etag)) {
          await closeFileHandle();
          return res.status(304).end();
        }

        const rawRange = req.method === 'HEAD' ? undefined : req.header('range');
        const rangeAllowed = ifRangeAllowsRange(req.header('if-range'), etag, stats);
        const requestedRange =
          rawRange && rangeAllowed ? parseSingleByteRange(rawRange, stats.size) : null;
        if (rawRange && rangeAllowed && !requestedRange) {
          res.setHeader('Content-Range', `bytes */${stats.size}`);
          await closeFileHandle();
          return res.status(416).end();
        }

        const start = requestedRange?.start ?? 0;
        const end = requestedRange?.end ?? Math.max(0, stats.size - 1);
        const contentLength = requestedRange ? end - start + 1 : stats.size;
        if (requestedRange) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
        } else {
          res.status(200);
        }
        res.setHeader('Content-Length', String(contentLength));

        if (req.method === 'HEAD' || stats.size === 0) {
          await closeFileHandle();
          return res.end();
        }

        const stream = fileHandle.createReadStream({
          autoClose: false,
          start,
          end,
        });
        try {
          await pipeline(stream, res);
        } catch (error) {
          if (!res.headersSent) throw error;
          if (!req.aborted) {
            logger.warn(
              { err: error, documentId: id, assetSha256: requestedAssetSha256 },
              'Pinned evidence asset stream failed',
            );
          }
          res.destroy(error instanceof Error ? error : undefined);
        } finally {
          await closeFileHandle();
        }
        return;
      } catch (error) {
        await closeFileHandle().catch(() => undefined);
        throw error;
      }
    }
    if (fallbackUsed) {
      res.setHeader('X-Asset-Fallback', 'true');
    }

    return res.sendFile(finalFileResult.absolutePath, { dotfiles: 'allow' }, (err) => {
      if (err) next(err);
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/related', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(RELATED_LIST_LIMIT_CAP, Math.max(1, Number(req.query.limit || 10)));
    const related = await documentsRepository.getRelatedDocuments(id, limit);
    res.json(related);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id
router.get('/:id', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(mapDocumentDetailDto(doc));
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/claims
router.get('/:id/claims', validate(documentIdSchema), async (req, res, next) => {
  try {
    const documentId = req.params.id;
    const { claimTriplesRepository } = await import('../db/claimTriplesRepository.js');
    const claims = await claimTriplesRepository.getByDocumentId(documentId);
    res.json(claims);
  } catch (error) {
    next(error);
  }
});

export default router;
