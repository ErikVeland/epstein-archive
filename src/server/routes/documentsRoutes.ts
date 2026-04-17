import { Router } from 'express';
import { documentsRepository } from '../db/documentsRepository.js';
import { documentPagesRepository } from '../db/documentPagesRepository.js';
import { documentAnnotationsRepository } from '../db/documentAnnotationsRepository.js';
import { dataQualityRepository } from '../db/dataQualityRepository.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { mapDocumentsListResponseDto } from '../mappers/documentsDtoMapper.js';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';

const router = Router();

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
    sortBy: z.enum(['date', 'title', 'red_flag', 'size', 'relevance', 'fileType']).optional(),
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
  }),
});

const documentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
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
  }),
});

const annotationWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const toSafePublicHandle = (rawAuthor: string | null | undefined): string => {
  const cleaned = (rawAuthor || '').trim().slice(0, 32);
  return cleaned ? cleaned : 'anonymous';
};

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

// GET /api/documents
router.get('/', validate(documentsListQuerySchema), async (req, res, next) => {
  try {
    const query = req.query;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const sortOrder =
      query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : undefined;
    const result = await documentsRepository.getDocuments(page, limit, {
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
    });
    res.json(mapDocumentsListResponseDto(result));
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
router.get('/:id/annotations', validate(documentIdSchema), async (req, res, next) => {
  try {
    const documentId = Number(req.params.id);
    if (!Number.isFinite(documentId) || documentId <= 0) {
      return res.status(400).json({ error: 'Invalid document id' });
    }

    const annotations = await documentAnnotationsRepository.getByDocumentId(documentId);
    return res.json({
      annotations: annotations.map((annotation) => ({
        id: annotation.id,
        documentId: String(annotation.document_id),
        type: annotation.annotation_type,
        selectedText: annotation.selected_text,
        note: annotation.note,
        position: {
          start: annotation.start_offset,
          end: annotation.end_offset,
        },
        contextBefore: annotation.context_before,
        contextAfter: annotation.context_after,
        author: annotation.author_label,
        createdAt: annotation.created_at,
        updatedAt: annotation.updated_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/documents/:id/annotations
router.post(
  '/:id/annotations',
  annotationWriteLimiter,
  validate(createDocumentAnnotationSchema),
  async (req, res, next) => {
    try {
      const documentId = Number(req.params.id);
      if (!Number.isFinite(documentId) || documentId <= 0) {
        return res.status(400).json({ error: 'Invalid document id' });
      }

      const { type, selectedText, note, start, end, contextBefore, contextAfter } = req.body;
      if (end <= start) {
        return res.status(400).json({ error: 'Invalid annotation span' });
      }

      const doc = await documentsRepository.getDocumentById(String(documentId));
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const ip = String(req.ip || '');
      const userAgent = String(req.get('user-agent') || '');
      const author = toSafePublicHandle(
        typeof req.body?.author === 'string' ? req.body.author : req.get('x-public-author'),
      );
      const fingerprint = createFingerprint(ip, userAgent);

      const annotation = await documentAnnotationsRepository.create({
        documentId,
        annotationType: type,
        selectedText,
        note: note || '',
        startOffset: start,
        endOffset: end,
        contextBefore,
        contextAfter,
        authorLabel: author,
        authorFingerprintHash: fingerprint,
      });

      return res.status(201).json({
        annotation: {
          id: annotation.id,
          documentId: String(annotation.document_id),
          type: annotation.annotation_type,
          selectedText: annotation.selected_text,
          note: annotation.note,
          position: {
            start: annotation.start_offset,
            end: annotation.end_offset,
          },
          contextBefore: annotation.context_before,
          contextAfter: annotation.context_after,
          author: annotation.author_label,
          createdAt: annotation.created_at,
          updatedAt: annotation.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/documents/:id/redactions
router.get('/:id/redactions', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const redactionSpans = Array.isArray(doc.redaction_spans)
      ? (doc.redaction_spans as Array<Record<string, unknown>>)
      : [];
    res.json({
      hasFailedRedactions: redactionSpans.length > 0,
      count: redactionSpans.length,
      redactions: redactionSpans.map((s: Record<string, unknown>) => ({
        page: s.page_index || 1,
        text: s.original_text || '',
        bbox: s.bbox || [0, 0, 0, 0],
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/file — intentionally public (no auth): corpus files are public research material.
// Path traversal is prevented by withinAllowedRoots check below.
router.get('/:id/file', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = String(req.query.variant || 'dirty').toLowerCase();
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const docAny = doc as unknown as Record<string, unknown>;
    const metadata = (docAny.metadata || {}) as Record<string, unknown>;
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
        /(epstein\.academy|www\.justice\.gov|justice\.gov)(\/epstein\/files\/.+)/i,
      );
      if (!match) return '';
      const host = match[1].toLowerCase();
      const pathname = match[2];
      return `https://${host}${pathname}`;
    };

    const isAllowedRemoteUrl = (rawUrl: string): boolean => {
      try {
        const url = new URL(rawUrl);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
        const host = url.hostname.toLowerCase();
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '::1' ||
          host.endsWith('.local') ||
          host.endsWith('.internal')
        ) {
          return false;
        }
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

    const dirtyPath = firstNonUrl([
      doc.filePath,
      docAny.file_path,
      metadata.filePath,
      metadata.file_path,
      metadata.originalPath,
      metadata.original_path,
    ]);
    const originalPath = firstNonUrl([
      docAny.originalFilePath,
      docAny.original_file_path,
      metadata.originalFilePath,
      metadata.original_file_path,
      metadata.source_path,
    ]);
    const cleanedPath = firstNonUrl([
      docAny.cleanedPath,
      docAny.cleaned_path,
      metadata.cleanedPath,
      metadata.cleaned_path,
      metadata.cleaned_path_refined,
    ]);
    const dirtyUrl = firstHttpUrl([
      doc.filePath,
      docAny.file_path,
      metadata.filePath,
      metadata.file_path,
      metadata.originalPath,
      metadata.original_path,
    ]);
    const originalUrl = firstHttpUrl([
      docAny.originalFilePath,
      docAny.original_file_path,
      metadata.originalFilePath,
      metadata.original_file_path,
      metadata.source_path,
    ]);
    const cleanedUrl = firstHttpUrl([
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

      // Build list of potential absolute paths to check
      const potentialPaths: string[] = [];
      if (path.isAbsolute(candidatePath)) {
        potentialPaths.push(candidatePath);
      } else {
        // Try project root
        potentialPaths.push(path.resolve(process.cwd(), normalizedCandidate));
        // Try relative to each allowed root
        for (const root of allowedRoots) {
          potentialPaths.push(path.resolve(root, normalizedCandidate));
        }
      }

      for (const absPath of potentialPaths) {
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
    const variantOrder: (keyof typeof variants)[] = [primaryVariant];
    if (primaryVariant === 'original') variantOrder.push('dirty', 'cleaned');
    else if (primaryVariant === 'cleaned') variantOrder.push('dirty', 'original');
    else variantOrder.push('original', 'cleaned');

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
        res.setHeader(
          'Content-Disposition',
          `inline; filename="${String(doc.fileName || `email-${id}.eml`).replace(/"/g, '')}"`,
        );
        return res.status(200).send(eml);
      }

      for (const v of variantOrder) {
        const candidateUrl = variantUrls[v] || deriveRemoteUrlFromPath(variants[v] || '');
        if (!candidateUrl) continue;
        if (!isAllowedRemoteUrl(candidateUrl)) continue;

        const rangeHeader = req.header('range') || undefined;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);
        try {
          const upstream = await fetch(candidateUrl, {
            headers: {
              ...(rangeHeader ? { range: rangeHeader } : {}),
              'user-agent': 'epstein-archive',
            },
            redirect: 'follow',
            signal: controller.signal,
          });

          if (!upstream.ok && upstream.status !== 206) continue;

          const body = upstream.body;
          if (!body) continue;

          const contentType = upstream.headers.get('content-type');
          const contentLength = upstream.headers.get('content-length');
          const acceptRanges = upstream.headers.get('accept-ranges');
          const contentRange = upstream.headers.get('content-range');

          res.status(upstream.status);
          res.setHeader('Content-Disposition', 'inline');
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

    res.setHeader('Content-Disposition', 'inline');
    if (fallbackUsed) {
      res.setHeader('X-Asset-Fallback', 'true');
    }

    return res.sendFile(finalFileResult.absolutePath, (err) => {
      if (err) next(err);
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/related', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const related = await documentsRepository.getRelatedDocuments(id, limit);
    res.json(related);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id (Alias to evidence route behavior if needed, or redirect)
router.get('/:id', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (error) {
    next(error);
  }
});

export default router;
