import { Router, Response } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { MediaService } from '../services/MediaService.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { mediaStreamLimiter } from '../middleware/rateLimit.js';
import { findFirstExistingPath } from '../utils/pathResolver.js';
import { documentsRepository } from '../db/documentsRepository.js';
import { MediaExtractionService } from '../services/MediaExtractionService.js';
import { rejectDeepOffset } from '../utils/paginationGuards.js';
import path from 'path';
import { mediaIdParamSchema } from './mediaShared.js';

const router = Router();
const mediaService = new MediaService(null);

const mediaImagesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(24),
    albumId: z.coerce.number().int().positive().optional(),
    tagId: z.coerce.number().int().positive().optional(),
    personId: z.coerce.number().int().positive().optional(),
    documentId: z.coerce.number().int().positive().optional(),
    sortField: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional(),
    slim: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
    verificationStatus: z.string().optional(),
    minRedFlagRating: z.coerce.number().int().min(0).max(5).optional(),
    hasPeople: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
    search: z.string().optional(),
    excludeTextScans: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  }),
});

const imageUpdateSchema = z.object({
  params: mediaIdParamSchema.shape.params,
  body: z
    .object({
      title: z.string().trim().max(500).optional(),
      description: z.string().trim().max(5000).optional(),
      redFlagRating: z.coerce.number().int().min(0).max(5).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field must be provided',
    }),
});

const imageRotateSchema = z.object({
  params: mediaIdParamSchema.shape.params,
  body: z.object({
    direction: z.enum(['left', 'right']),
  }),
});

router.get('/images', validate(mediaImagesQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, unknown>;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 24);
    if (rejectDeepOffset(res, 'Media image', page, limit)) return;
    const sortField = String(query.sortField || 'date_added').toLowerCase();
    const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const slim = query.slim === true;

    const { mediaItems, total } = await mediaRepository.getMediaItemsPaginated(page, limit, {
      albumId: query.albumId ? Number(query.albumId) : undefined,
      tagId: query.tagId ? Number(query.tagId) : undefined,
      personId: query.personId ? Number(query.personId) : undefined,
      documentId: query.documentId ? Number(query.documentId) : undefined,
      verificationStatus:
        typeof query.verificationStatus === 'string' ? query.verificationStatus : undefined,
      minRedFlagRating: query.minRedFlagRating ? Number(query.minRedFlagRating) : undefined,
      hasPeople: query.hasPeople === true,
      sortBy: sortField as
        | 'date_added'
        | 'date_taken'
        | 'filename'
        | 'file_size'
        | 'title'
        | 'date'
        | 'rating'
        | undefined,
      sortOrder,
      fileType: 'image',
      transcriptQuery: typeof query.search === 'string' ? query.search : undefined,
      excludeTextScans: query.excludeTextScans === true,
    });

    res.setHeader('X-Total-Count', String(total));
    res.json(
      mediaItems.map((item: Record<string, unknown>) =>
        slim
          ? {
              id: item.id,
              title: item.title || '',
              description: item.description || '',
              fileType: item.fileType,
              fileSize: Number(item.fileSize || 0),
              width: Number(item.width || 0),
              height: Number(item.height || 0),
              thumbnailPath: item.thumbnailPath || null,
              path: item.filePath || item.file_path || null,
              isSensitive: Boolean(item.isSensitive),
              redFlagRating: Number(item.redFlagRating || 0),
              createdAt: item.createdAt || null,
              dateTaken: item.dateTaken || null,
              albumId: item.albumId || null,
            }
          : item,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.post(
  '/images/extract/:id',
  authenticateRequest,
  requireRole('admin'),
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const doc = await documentsRepository.getDocumentById(id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const filePathRaw =
        (doc as Record<string, unknown>).filePath ?? (doc as Record<string, unknown>).file_path;
      const fileTypeRaw =
        (doc as Record<string, unknown>).fileType ?? (doc as Record<string, unknown>).file_type;
      const titleRaw =
        (doc as Record<string, unknown>).title ??
        (doc as Record<string, unknown>).filename ??
        (doc as Record<string, unknown>).fileName;
      const sourceCollectionRaw =
        (doc as Record<string, unknown>).sourceCollection ??
        (doc as Record<string, unknown>).source_collection;

      const filePath = typeof filePathRaw === 'string' ? filePathRaw : '';
      const fileType = typeof fileTypeRaw === 'string' ? fileTypeRaw : '';
      const title = typeof titleRaw === 'string' ? titleRaw : `Document ${id}`;
      const sourceCollection =
        typeof sourceCollectionRaw === 'string' ? sourceCollectionRaw : undefined;

      if (!filePath) return res.status(400).json({ error: 'Document has no file path' });
      if (!fileType.toLowerCase().includes('pdf')) {
        return res.status(400).json({ error: 'Only PDF documents are supported for extraction' });
      }

      const extractor = new MediaExtractionService(mediaService);
      const extractedCount = await extractor.extractFromPdf(id, filePath, title, sourceCollection);
      res.json({ extractedCount });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/images/:id', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = await mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Image not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

const sendImageFile = async (id: number, res: Response, preferThumbnail: boolean) => {
  const item = await mediaRepository.getMediaItemById(id);
  if (!item) return res.status(404).json({ error: 'Image not found' });

  const resolvedPath = findFirstExistingPath(
    preferThumbnail
      ? [String(item.thumbnailPath || ''), String(item.filePath || '')]
      : [String(item.filePath || ''), String(item.thumbnailPath || '')],
  );

  if (!resolvedPath) {
    return res.status(404).json({ error: 'Media file not found on disk' });
  }

  res.type(path.extname(resolvedPath) || 'application/octet-stream');
  return res.sendFile(resolvedPath);
};

router.get(
  '/images/:id/thumbnail',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      await sendImageFile(Number(req.params.id), res, true);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/images/:id/file',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      await sendImageFile(Number(req.params.id), res, false);
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  '/images/:id/raw',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      await sendImageFile(Number(req.params.id), res, false);
    } catch (error) {
      next(error);
    }
  },
);

router.get('/images/:id/tags', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const tags = await mediaService.getImageTags(Number(req.params.id));
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

router.get('/images/:id/people', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const imageId = Number(req.params.id);
    const people = await mediaService.getImagePeople(imageId);
    res.json(people);
  } catch (error) {
    next(error);
  }
});

// Edit and moderation routes remain authenticated.
router.put(
  '/images/:id',
  authenticateRequest,
  requireRole('admin'),
  validate(imageUpdateSchema),
  async (req, res, next) => {
    try {
      const imageId = Number(req.params.id);
      const { title, description, redFlagRating } = req.body as {
        title?: string;
        description?: string;
        redFlagRating?: number;
      };

      await mediaService.updateImage(imageId, {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(redFlagRating !== undefined ? { redFlagRating } : {}),
      });

      const updatedImage = await mediaService.getImageById(imageId);
      if (!updatedImage) return res.status(404).json({ error: 'Image not found' });

      res.json(updatedImage);
    } catch (error) {
      next(error);
    }
  },
);
router.put(
  '/images/:id/rotate',
  authenticateRequest,
  requireRole('admin'),
  validate(imageRotateSchema),
  async (req, res, next) => {
    try {
      const imageId = Number(req.params.id);
      const { direction } = req.body as { direction: 'left' | 'right' };
      const degrees = direction === 'right' ? 90 : -90;

      await mediaService.rotateImage(imageId, degrees);

      const updatedImage = await mediaService.getImageById(imageId);
      if (!updatedImage) return res.status(404).json({ error: 'Image not found' });

      res.json(updatedImage);
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/images/:id/tags',
  authenticateRequest,
  requireRole('admin'),
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      const imageId = Number(req.params.id);
      const tagId = Number(req.body?.tagId);
      if (!Number.isFinite(tagId)) return res.status(400).json({ error: 'tagId is required' });
      await mediaService.addTagToImage(imageId, tagId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);
router.delete(
  '/images/:id/tags/:tagId',
  authenticateRequest,
  requireRole('admin'),
  validate(
    z.object({
      params: z.object({
        id: z.coerce.number().int().positive(),
        tagId: z.coerce.number().int().positive(),
      }),
    }),
  ),
  async (req, res, next) => {
    try {
      await mediaService.removeTagFromImage(Number(req.params.id), Number(req.params.tagId));
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/images/:id/people',
  authenticateRequest,
  requireRole('admin'),
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      const imageId = Number(req.params.id);
      // Backward compatible payloads:
      // - { personId } (canonical)
      // - { entityId } (legacy clients)
      const personId = Number(
        (req.body as Record<string, unknown> | undefined)?.personId ??
          (req.body as Record<string, unknown> | undefined)?.entityId,
      );
      if (!Number.isFinite(personId))
        return res.status(400).json({ error: 'personId is required' });
      await mediaService.addPersonToItem(imageId, personId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);
router.delete(
  '/images/:id/people/:personId',
  authenticateRequest,
  requireRole('admin'),
  validate(
    z.object({
      params: z.object({
        id: z.coerce.number().int().positive(),
        personId: z.coerce.number().int().positive(),
      }),
    }),
  ),
  async (req, res, next) => {
    try {
      await mediaService.removePersonFromItem(Number(req.params.id), Number(req.params.personId));
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
