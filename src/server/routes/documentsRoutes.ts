import { Router } from 'express';
import { documentsRepository } from '../db/documentsRepository.js';
import { documentPagesRepository } from '../db/documentPagesRepository.js';
import { documentAnnotationsRepository } from '../db/documentAnnotationsRepository.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { mapDocumentsListResponseDto } from '../mappers/documentsDtoMapper.js';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

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
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    collectionId: z.string().optional(),
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

// GET /api/documents
router.get('/', validate(documentsListQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as any;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 50);
    const result = await documentsRepository.getDocuments(page, limit, {
      search: query.search,
      fileType: query.fileType,
      evidenceType: query.evidenceType,
      source: query.source,
      startDate: query.startDate,
      endDate: query.endDate,
      hasFailedRedactions:
        typeof query.hasFailedRedactions === 'boolean' ? query.hasFailedRedactions : undefined,
      minRedFlag: query.minRedFlag,
      maxRedFlag: query.maxRedFlag,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      collectionId: query.collectionId,
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

    res.json({
      hasFailedRedactions: Boolean(doc.redaction_spans?.length > 0),
      count: doc.redaction_spans?.length || 0,
      redactions: (doc.redaction_spans || []).map((s: any) => ({
        page: s.page_index || 1,
        text: s.original_text || '',
        bbox: s.bbox || [0, 0, 0, 0],
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id/file
router.get('/:id/file', validate(documentIdSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const variant = String((req.query as any).variant || 'dirty').toLowerCase();
    const doc = await documentsRepository.getDocumentById(id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const dirtyPath = (doc.filePath || (doc as any).file_path || '') as string;
    const originalPath = (doc.originalFilePath || (doc as any).original_file_path || '') as string;
    const cleanedPath = ((doc as any).cleanedPath ||
      (doc as any).cleaned_path ||
      (doc as any).metadata?.cleanedPath ||
      (doc as any).metadata?.cleaned_path ||
      '') as string;

    let selectedPath = dirtyPath;
    if (variant === 'original' && originalPath) selectedPath = originalPath;
    if (variant === 'cleaned' && cleanedPath) selectedPath = cleanedPath;

    if (!selectedPath) {
      return res.status(404).json({ error: 'No file path available for document' });
    }

    const dataRoot = path.resolve(process.cwd(), 'data');
    const normalizedRelative = selectedPath.replace(/^\/+/, '');
    const absolutePath = path.isAbsolute(selectedPath)
      ? selectedPath
      : path.resolve(process.cwd(), normalizedRelative);

    if (!absolutePath.startsWith(dataRoot)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', 'inline');
    return res.sendFile(absolutePath);
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
