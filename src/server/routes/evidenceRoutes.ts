/**
 * Evidence API Routes
 *
 * Provides endpoints for searching, retrieving, and managing evidence records
 * with full-text search, filtering, and entity relationships.
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentsRepository } from '../db/documentsRepository.js';
import { searchRepository } from '../db/searchRepository.js';
import { forensicRepository } from '../db/forensicRepository.js';
import { getEvidenceTypes, insertUploadedDocument } from '../db/routesDb.js';
import { logAudit } from '../utils/auditLogger.js';
import { authenticateRequest, requireRole, AuthRequest } from '../auth/middleware.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { logger } from '../services/Logger.js';

interface RequestWithId extends Request {
  requestId?: string;
}

const router = express.Router();
const fsPromises = fs.promises;

// Schemas
const searchEvidenceSchema = z.object({
  query: z.object({
    q: z.string().optional(),
    query: z.string().optional(),
    limit: z.coerce.number().int().min(1).default(50),
    mode: z.enum(['lexical', 'semantic', 'hybrid', 'web', 'prefix']).default('lexical'),
  }),
});

const evidenceIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

const uploadEvidenceSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
});

// Configure upload security
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOCX, JPG, PNG allowed.'));
    }
  },
});

const hasPrefix = (bytes: Buffer, prefix: number[]) =>
  prefix.every((value, index) => bytes[index] === value);

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const readRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

const readBytes = async (filePath: string, size: number) => {
  const fd = await fsPromises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(size);
    const { bytesRead } = await fd.read(buffer, 0, size, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await fd.close();
  }
};

const validateUploadedFileSignature = async (
  tempPath: string,
  originalName: string,
  mimetype: string,
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  const ext = path.extname(originalName).toLowerCase();
  const bytes = await readBytes(tempPath, 16);

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46])
      ? { ok: true }
      : { ok: false, reason: 'Invalid PDF signature' };
  }
  if (mimetype === 'image/png' || ext === '.png') {
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      ? { ok: true }
      : { ok: false, reason: 'Invalid PNG signature' };
  }
  if (mimetype === 'image/jpeg' || ext === '.jpg' || ext === '.jpeg') {
    return hasPrefix(bytes, [0xff, 0xd8, 0xff])
      ? { ok: true }
      : { ok: false, reason: 'Invalid JPEG signature' };
  }
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])
      ? { ok: true }
      : { ok: false, reason: 'Invalid DOCX signature' };
  }
  if (mimetype === 'application/msword' || ext === '.doc') {
    return hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0])
      ? { ok: true }
      : { ok: false, reason: 'Invalid DOC signature' };
  }
  if (mimetype === 'text/plain' || ext === '.txt') {
    const textProbe = await readBytes(tempPath, 1024);
    const hasNullByte = textProbe.some((byte) => byte === 0x00);
    return hasNullByte ? { ok: false, reason: 'Text file appears binary' } : { ok: true };
  }

  return { ok: false, reason: 'Unsupported file signature' };
};

/**
 * POST /api/evidence/upload
 * Secure document upload
 */
router.post(
  '/upload',
  authenticateRequest,
  upload.single('file'),
  validate(uploadEvidenceSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, mimetype, size, path: tempPath } = req.file;
      const { title, description } = req.body;

      const signatureCheck = await validateUploadedFileSignature(tempPath, originalname, mimetype);
      if (!signatureCheck.ok) {
        await fsPromises.unlink(tempPath);
        return res.status(400).json({ error: signatureCheck.reason });
      }

      // Move to permanent storage (data/documents)
      const targetDir = path.join(process.cwd(), 'data', 'documents', 'uploads');
      await fsPromises.mkdir(targetDir, { recursive: true });

      const fileExt = path.extname(originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1000)}${fileExt}`;
      const targetPath = path.join(targetDir, fileName);

      await fsPromises.rename(tempPath, targetPath);

      const documentId = await insertUploadedDocument({
        fileName,
        filePath: `uploads/${fileName}`,
        mimetype,
        size,
        title: title || originalname,
        metadataJson: JSON.stringify({
          originalName: originalname,
          uploadedBy: (req as AuthRequest).user?.id || 'anonymous',
          description,
        }),
      });

      await logAudit(
        'upload_document',
        (req as AuthRequest).user?.id ?? null,
        'document',
        String(documentId),
        {
          fileName,
        },
        undefined,
        (req as RequestWithId).requestId,
      );

      res.status(201).json({
        success: true,
        documentId,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      logger.error({ err: error }, 'Upload error');
      // Cleanup temp file if it exists
      if (req.file?.path) {
        await fsPromises.unlink(req.file.path).catch(() => undefined);
      }
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

/**
 * GET /api/evidence/search
 * Search evidence with filtering and pagination
 */
router.get('/search', validate(searchEvidenceSchema), async (req: Request, res: Response) => {
  try {
    type SearchQuery = z.infer<typeof searchEvidenceSchema>['query'];
    const { q, query, limit, mode } = req.query as unknown as SearchQuery;
    const searchTerm = typeof q === 'string' && q.trim().length > 0 ? q : query;

    if (!searchTerm) {
      // Return recent documents if no query
      const result = await documentsRepository.getDocuments(1, limit, {});
      return res.json(result);
    }

    const result = await searchRepository.search(searchTerm, limit, { mode });

    // Shape the semanticCapability field into a spec-compliant _meta envelope.
    // The rest of the result (entities, documents, …) is spread unchanged.
    const { semanticCapability, ...resultWithoutCap } = result;
    const cap = semanticCapability;
    const requestedSemantic = mode === 'semantic' || mode === 'hybrid';
    const degraded = requestedSemantic && !(cap?.available ?? false);
    const degradedReason: string | null = degraded
      ? (cap?.reason ?? 'pgvector_unavailable') || 'pgvector_unavailable'
      : null;

    res.json({
      ...resultWithoutCap,
      _meta: {
        mode: mode ?? 'lexical',
        semanticAvailable: cap?.available ?? false,
        degraded,
        degradedReason,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Evidence search error');
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get available evidence types
router.get('/types', async (_req: Request, res: Response) => {
  try {
    const types = await getEvidenceTypes();
    res.json(types);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch evidence types' });
  }
});

/**
 * GET /api/evidence/:id
 * Get single evidence record with full details
 */
router.get('/:id', validate(evidenceIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const evidence = await documentsRepository.getDocumentById(id);

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Check quarantine status manually if not using middleware on this specific route handler structure
    // (Though we will apply middleware to the route definition below)
    if (evidence.is_quarantined && (req as AuthRequest).user?.role !== 'admin') {
      await logAudit(
        'view',
        (req as AuthRequest).user?.id ?? null,
        'document',
        id,
        { reason: 'quarantined' },
        undefined,
        (req as RequestWithId).requestId,
      );
      return res
        .status(403)
        .json({ error: 'Evidence is quarantined', reason: evidence.quarantine_reason });
    }

    // Log successful access
    await logAudit(
      'view',
      (req as AuthRequest).user?.id ?? null,
      'document',
      id,
      {},
      undefined,
      (req as RequestWithId).requestId,
    );

    const metadata = readRecord(evidence.metadata);
    const canonical = {
      ...evidence,
      id: String(evidence.id ?? id),
      fileName: String(evidence.fileName || evidence.file_name || ''),
      filePath: evidence.filePath ?? evidence.file_path ?? null,
      fileType: String(evidence.fileType || evidence.file_type || ''),
      fileSize: Number(evidence.fileSize || evidence.file_size || 0),
      dateCreated: evidence.dateCreated ?? evidence.date_created ?? null,
      title: String(evidence.title || evidence.fileName || evidence.file_name || `Document ${id}`),
      content: String(evidence.content || ''),
      contentRefined:
        evidence.contentRefined !== undefined && evidence.contentRefined !== null
          ? String(evidence.contentRefined)
          : null,
      contentPreview:
        evidence.contentPreview !== undefined && evidence.contentPreview !== null
          ? String(evidence.contentPreview)
          : String(evidence.content || '').slice(0, 320) || null,
      metadata:
        evidence.metadata &&
        typeof evidence.metadata === 'object' &&
        !Array.isArray(evidence.metadata)
          ? evidence.metadata
          : {},
      evidenceType: String(evidence.evidenceType || evidence.evidence_type || 'document'),
      redFlagRating: Number(evidence.redFlagRating || evidence.red_flag_rating || 0),
      sourceCollection:
        evidence.sourceCollection ??
        evidence.source_collection ??
        readString(metadata.source_collection) ??
        null,
      fileUrl: `/api/documents/${id}/file?variant=clean`,
      originalFileUrl: `/api/documents/${id}/file?variant=dirty`,
      entities: Array.isArray(evidence.entities)
        ? evidence.entities.map((entity: Record<string, unknown>) => ({
            id: entity.id,
            name: String(entity.name || ''),
            mentions: Number(entity.mentions || 0),
            contexts: Array.isArray(entity.contexts)
              ? entity.contexts
                  .map((ctx: unknown) =>
                    typeof ctx === 'string'
                      ? ctx
                      : String((ctx as Record<string, unknown>)?.context || ''),
                  )
                  .filter((ctx: string) => ctx.length > 0)
              : [],
          }))
        : [],
    };

    res.json(canonical);
  } catch (error) {
    logger.error({ err: error }, 'Evidence retrieval error');
    res.status(500).json({ error: 'Retrieval failed' });
  }
});

/**
 * GET /api/evidence/:id/metrics
 * Legacy route alias (backward compatibility) for /api/documents/:id/analytics/metrics
 * Get forensic metrics
 */
router.get('/:id/metrics', validate(evidenceIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const metrics = forensicRepository.getMetrics(id);
    res.json(metrics || { metrics_json: '{}', authenticity_score: 0 });
  } catch (e) {
    logger.error({ err: e }, 'Metrics error');
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * GET /api/evidence/:id/custody
 * Legacy route alias (backward compatibility) for /api/documents/:id/analytics/custody
 * Get chain of custody
 */
router.get('/:id/custody', validate(evidenceIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const chain = forensicRepository.getChainOfCustody(id);
    res.json(chain || []);
  } catch (e) {
    logger.error({ err: e }, 'Custody error');
    res.status(500).json({ error: 'Failed to get chain of custody' });
  }
});

/**
 * POST /api/evidence/:id/analyze
 * Legacy route alias (backward compatibility) for /api/documents/:id/analytics/analyze
 * Trigger document analysis based on OCR quality and source provenance.
 *
 * NOTE: The returned `documentSignalScore` is a heuristic derived from OCR quality,
 * source provenance completeness, and red-flag rating. It is NOT a forensic authenticity
 * score and carries no evidentiary validity. Do not use it to assert document legitimacy.
 */
router.post(
  '/:id/analyze',
  authenticateRequest,
  requireRole('admin'),
  validate(evidenceIdSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const doc = await documentsRepository.getDocumentById(id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const metadata = readRecord(doc.metadata);
      const content = String(doc.content || doc.contentRefined || '').toLowerCase();

      // OCR quality proxy: word density vs. character noise
      const wordCount = readNumber(doc.wordCount ?? doc.word_count, 0);
      const ocrQualityScore =
        wordCount > 0
          ? Math.min(1.0, Math.max(0.0, (wordCount - 10) / Math.max(wordCount, 200)))
          : 0;

      // Source provenance completeness: has known source_collection, original path, and date
      const hasSourceCollection = !!(doc.sourceCollection || doc.source_collection);
      const hasDateCreated = !!(doc.dateCreated || doc.date_created);
      const hasFilePath = !!(doc.filePath || doc.file_path);
      const provenanceScore =
        (hasSourceCollection ? 0.4 : 0) + (hasDateCreated ? 0.35 : 0) + (hasFilePath ? 0.25 : 0);

      // Red flag rating contributes investigative relevance signal (not authenticity)
      const redFlagRating = Number(doc.redFlagRating || doc.red_flag_rating || 0);
      const relevanceSignal = Math.min(1.0, redFlagRating / 5);

      // Combined heuristic signal — clearly labelled, not forensic
      const documentSignalScore = Math.min(
        1.0,
        ocrQualityScore * 0.4 + provenanceScore * 0.4 + relevanceSignal * 0.2,
      );

      // Keyword occurrence counts for reference (informational only)
      const investigationKeywords = [
        'epstein',
        'maxwell',
        'payment',
        'transfer',
        'wire',
        'confidential',
        'bank',
        'trust',
        'llc',
        'offshore',
      ];
      const keywordMatches = investigationKeywords.filter((kw) => content.includes(kw));

      const metrics = {
        disclaimer:
          'This analysis is heuristic and has no forensic validity. ' +
          'documentSignalScore reflects OCR quality and source provenance completeness, ' +
          'not document authenticity or evidentiary weight.',
        ocrQuality: {
          wordCount,
          qualityScore: ocrQualityScore,
        },
        sourceProvenance: {
          hasSourceCollection,
          hasDateCreated,
          hasFilePath,
          provenanceScore,
          source: doc.sourceCollection || doc.source_collection || 'Unknown',
          author: readString(metadata.author) || readString(metadata.uploadedBy) || 'Unknown',
        },
        keywordPresence: {
          note: 'Keyword presence is informational only — it does not indicate document suspicion.',
          matches: keywordMatches,
          totalMatched: keywordMatches.length,
        },
      };

      await forensicRepository.saveMetrics(id as string, metrics, documentSignalScore);
      await forensicRepository.addCustodyEvent({
        evidenceId: id as string,
        actor: (req as AuthRequest).user?.username || (req as AuthRequest).user?.id || 'System',
        action: 'Document Signal Analysis',
        notes: `OCR quality: ${ocrQualityScore.toFixed(2)}, provenance: ${provenanceScore.toFixed(2)}. Signal score (heuristic only): ${documentSignalScore.toFixed(2)}`,
      });

      // authenticityScore is a deprecated alias kept for backward compatibility
      res.json({
        success: true,
        metrics,
        documentSignalScore,
        authenticityScore: documentSignalScore,
      });
    } catch (e) {
      logger.error({ err: e }, 'Analysis error');
      res.status(500).json({ error: 'Analysis failed' });
    }
  },
);

export default router;
