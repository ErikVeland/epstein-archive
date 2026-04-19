import { Router, Response, Request, NextFunction } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { cacheResponse } from '../utils/perfCache.js';
import crypto from 'crypto';
import path from 'path';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { MediaService } from '../services/MediaService.js';
import { ThumbnailService } from '../services/ThumbnailService.js';
import { authenticateRequest } from '../auth/middleware.js';
import { findFirstExistingPath } from '../utils/pathResolver.js';

const DATA_ROOT = path.resolve(process.cwd(), 'data');

const router = Router();
const mediaService = new MediaService(null);

// Schemas
const batchAvatarsSchema = z.object({
  query: z.object({
    ids: z.string().min(1, 'ids parameter required'),
  }),
});

const mediaImagesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(24),
    albumId: z.coerce.number().int().positive().optional(),
    tagId: z.coerce.number().int().positive().optional(),
    personId: z.coerce.number().int().positive().optional(),
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

const mediaIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
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

const imageBatchRotateSchema = z.object({
  body: z.object({
    imageIds: z.array(z.coerce.number().int().positive()).min(1),
    direction: z.enum(['left', 'right']),
  }),
});

const imageBatchRateSchema = z.object({
  body: z.object({
    imageIds: z.array(z.coerce.number().int().positive()).min(1),
    rating: z.coerce.number().int().min(0).max(5),
  }),
});

const imageBatchMetadataSchema = z.object({
  body: z.object({
    imageIds: z.array(z.coerce.number().int().positive()).min(1),
    updates: z
      .object({
        title: z.string().trim().max(500).optional(),
        description: z.string().trim().max(5000).optional(),
      })
      .refine((updates) => Object.keys(updates).length > 0, {
        message: 'At least one metadata field must be provided',
      }),
  }),
});

router.get(
  '/batch-avatars',
  cacheResponse(300),
  validate(batchAvatarsSchema),
  async (req, res, next) => {
    try {
      const idsStr = req.query.ids as string;
      const rawIds = idsStr.split(',').filter(Boolean);
      if (rawIds.length > 50) {
        return res.status(400).json({ error: 'Max 50 ids allowed per batch request' });
      }

      const items = await mediaRepository.getPhotosForEntities(rawIds);

      const formatted = items.map((m: { id: unknown; filePath: unknown; entityId: unknown }) => {
        const key = `${m.id}-${m.filePath}`;
        const etag = crypto.createHash('md5').update(key).digest('hex');
        return {
          entityId: String(m.entityId),
          url: `/api/media/images/${m.id}/thumbnail`,
          etag,
        };
      });

      res.json({ items: formatted });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/albums', cacheResponse(300), async (_req, res, next) => {
  try {
    const albums = await mediaService.getAllAlbums();
    res.json(albums);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', cacheResponse(120), async (_req, res, next) => {
  try {
    const stats = await mediaService.getMediaStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/tags', cacheResponse(120), async (_req, res, next) => {
  try {
    const tags = await mediaService.getAllTags();
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

router.get('/images', validate(mediaImagesQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | undefined>;
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 24);
    const sortField = String(query.sortField || 'date_added').toLowerCase();
    const sortOrder = String(query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const slim = query.slim === 'true';

    const { mediaItems, total } = await mediaRepository.getMediaItemsPaginated(page, limit, {
      albumId: query.albumId ? Number(query.albumId) : undefined,
      tagId: query.tagId ? Number(query.tagId) : undefined,
      personId: query.personId ? Number(query.personId) : undefined,
      verificationStatus: query.verificationStatus,
      minRedFlagRating: query.minRedFlagRating ? Number(query.minRedFlagRating) : undefined,
      hasPeople: query.hasPeople === 'true',
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
      transcriptQuery: query.search,
      excludeTextScans: query.excludeTextScans === 'true',
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

router.get('/images/:id/thumbnail', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    await sendImageFile(Number(req.params.id), res, true);
  } catch (error) {
    next(error);
  }
});

router.get('/images/:id/file', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    await sendImageFile(Number(req.params.id), res, false);
  } catch (error) {
    next(error);
  }
});

router.get('/images/:id/raw', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    await sendImageFile(Number(req.params.id), res, false);
  } catch (error) {
    next(error);
  }
});

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
router.delete('/images/:id/tags/:tagId', authenticateRequest, async (req, res, next) => {
  try {
    await mediaService.removeTagFromImage(Number(req.params.id), Number(req.params.tagId));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
router.post(
  '/images/:id/people',
  authenticateRequest,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      const imageId = Number(req.params.id);
      const personId = Number(req.body?.personId);
      if (!Number.isFinite(personId))
        return res.status(400).json({ error: 'personId is required' });
      await mediaService.addPersonToItem(imageId, personId);
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
);
router.delete('/images/:id/people/:personId', authenticateRequest, async (req, res, next) => {
  try {
    await mediaService.removePersonFromItem(Number(req.params.id), Number(req.params.personId));
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const runImageBatch = async <T>(
  imageIds: number[],
  handler: (imageId: number) => Promise<T>,
): Promise<
  Array<({ id: number; success: true } & T) | { id: number; success: false; error: string }>
> =>
  Promise.all(
    imageIds.map(async (imageId) => {
      try {
        const result = await handler(imageId);
        return { id: imageId, success: true as const, ...result };
      } catch (error) {
        return {
          id: imageId,
          success: false as const,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
  );

router.put(
  '/images/batch/rotate',
  authenticateRequest,
  validate(imageBatchRotateSchema),
  async (req, res, next) => {
    try {
      const { imageIds, direction } = req.body as {
        imageIds: number[];
        direction: 'left' | 'right';
      };
      const degrees = direction === 'right' ? 90 : -90;
      const results = await runImageBatch(imageIds, async (imageId) => {
        await mediaService.rotateImage(imageId, degrees);
        return { image: await mediaService.getImageById(imageId) };
      });
      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/images/batch/rotate',
  authenticateRequest,
  validate(imageBatchRotateSchema),
  async (req, res, next) => {
    try {
      const { imageIds, direction } = req.body as {
        imageIds: number[];
        direction: 'left' | 'right';
      };
      const degrees = direction === 'right' ? 90 : -90;
      const results = await runImageBatch(imageIds, async (imageId) => {
        await mediaService.rotateImage(imageId, degrees);
        return { image: await mediaService.getImageById(imageId) };
      });
      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);
router.put(
  '/images/batch/rate',
  authenticateRequest,
  validate(imageBatchRateSchema),
  async (req, res, next) => {
    try {
      const { imageIds, rating } = req.body as { imageIds: number[]; rating: number };
      const results = await runImageBatch(imageIds, async (imageId) => {
        await mediaService.updateImage(imageId, { redFlagRating: rating });
        return { image: await mediaService.getImageById(imageId) };
      });
      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/images/batch/rate',
  authenticateRequest,
  validate(imageBatchRateSchema),
  async (req, res, next) => {
    try {
      const { imageIds, rating } = req.body as { imageIds: number[]; rating: number };
      const results = await runImageBatch(imageIds, async (imageId) => {
        await mediaService.updateImage(imageId, { redFlagRating: rating });
        return { image: await mediaService.getImageById(imageId) };
      });
      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);
router.put(
  '/images/batch/metadata',
  authenticateRequest,
  validate(imageBatchMetadataSchema),
  async (req, res, next) => {
    try {
      const { imageIds, updates } = req.body as {
        imageIds: number[];
        updates: { title?: string; description?: string };
      };
      const results = await runImageBatch(imageIds, async (imageId) => {
        await mediaService.updateImage(imageId, updates);
        return { image: await mediaService.getImageById(imageId) };
      });
      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);
router.post(
  '/images/batch/metadata',
  authenticateRequest,
  validate(imageBatchMetadataSchema),
  async (req, res, next) => {
    try {
      const { imageIds, updates } = req.body as {
        imageIds: number[];
        updates: { title?: string; description?: string };
      };
      const results = await runImageBatch(imageIds, async (imageId) => {
        await mediaService.updateImage(imageId, updates);
        return { image: await mediaService.getImageById(imageId) };
      });
      res.json({ results });
    } catch (error) {
      next(error);
    }
  },
);

// ─── Shared schema for audio/video list queries ───────────────────────────────

const avListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(24),
    albumId: z.coerce.number().int().optional(),
    sortBy: z.enum(['title', 'date', 'rating', 'date_taken']).optional(),
    transcriptQuery: z.string().optional(),
    hasPeople: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  }),
});

const makeAvListHandler =
  (fileType: 'audio' | 'video') => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as Record<string, string | undefined>;
      const { page, limit, albumId, sortBy, transcriptQuery, hasPeople } = query;
      const result = await mediaRepository.getMediaItemsPaginated(
        Number(page || 1),
        Number(limit || 24),
        {
          fileType,
          albumId: albumId ? Number(albumId) : undefined,
          sortBy: (sortBy as 'title' | 'date' | 'rating' | 'date_taken') ?? 'title',
          transcriptQuery: transcriptQuery || undefined,
          hasPeople: hasPeople === 'true',
        },
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

// ─── Audio routes ─────────────────────────────────────────────────────────────

router.get('/audio/albums', cacheResponse(120), async (_req, res, next) => {
  try {
    const albums = await mediaRepository.getAlbumsByMediaType('audio');
    res.json(albums);
  } catch (error) {
    next(error);
  }
});

router.get('/audio', validate(avListQuerySchema), makeAvListHandler('audio'));

router.get('/audio/:id', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const item = await mediaRepository.getMediaItemById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Audio item not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.get('/audio/:id/stream', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const item = await mediaRepository.getMediaItemById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Audio item not found' });

    const resolvedPath = findFirstExistingPath([String(item.filePath || '')]);
    if (!resolvedPath) return res.status(404).json({ error: 'Audio file not found on disk' });

    if (item.fileType) res.type(String(item.fileType));
    return res.sendFile(resolvedPath);
  } catch (error) {
    next(error);
  }
});

// ─── Video routes ─────────────────────────────────────────────────────────────

router.get('/video/albums', cacheResponse(120), async (_req, res, next) => {
  try {
    const albums = await mediaRepository.getAlbumsByMediaType('video');
    res.json(albums);
  } catch (error) {
    next(error);
  }
});

router.get('/video', validate(avListQuerySchema), makeAvListHandler('video'));

router.get('/video/:id', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const item = await mediaRepository.getMediaItemById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Video item not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.get('/video/:id/thumbnail', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const item = await mediaRepository.getMediaItemById(id);
    if (!item) return res.status(404).json({ error: 'Video item not found' });

    let thumbnailPath = findFirstExistingPath([String(item.thumbnailPath || '')]);
    if (!thumbnailPath) {
      const videoPath = findFirstExistingPath([String(item.filePath || '')]);
      if (!videoPath) return res.status(404).json({ error: 'Video file not found on disk' });
      thumbnailPath = await ThumbnailService.generateVideoThumbnail(videoPath, id);
    }

    if (!thumbnailPath) {
      return res.status(404).json({ error: 'Video thumbnail not available' });
    }

    res.type(path.extname(thumbnailPath) || 'application/octet-stream');
    return res.sendFile(thumbnailPath);
  } catch (error) {
    next(error);
  }
});

router.get('/video/:id/stream', validate(mediaIdParamSchema), async (req, res, next) => {
  try {
    const item = await mediaRepository.getMediaItemById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: 'Video item not found' });

    const resolvedPath = findFirstExistingPath([String(item.filePath || '')]);
    if (!resolvedPath) return res.status(404).json({ error: 'Video file not found on disk' });

    if (item.fileType) res.type(String(item.fileType));
    return res.sendFile(resolvedPath);
  } catch (error) {
    next(error);
  }
});

// ─── PDF route ────────────────────────────────────────────────────────────────

const pdfQuerySchema = z.object({
  query: z.object({
    filePath: z.string().min(1),
  }),
});

router.get('/pdf', validate(pdfQuerySchema), async (req, res, next) => {
  try {
    const filePath = req.query.filePath as string;
    const resolvedPath = findFirstExistingPath([filePath]);
    if (!resolvedPath) return res.status(404).json({ error: 'PDF file not found on disk' });
    if (
      !resolvedPath.startsWith(DATA_ROOT + path.sep) &&
      !resolvedPath.startsWith(DATA_ROOT + '/')
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.type('application/pdf');
    return res.sendFile(resolvedPath);
  } catch (error) {
    next(error);
  }
});

// ─── Batch tag / people operations (audio + video items) ─────────────────────

const batchTagsSchema = z.object({
  body: z.object({
    itemIds: z.array(z.number().int().positive()),
    tagIds: z.array(z.number().int().positive()),
    action: z.enum(['add', 'remove']),
  }),
});

const batchImageTagsSchema = z.object({
  body: z
    .object({
      itemIds: z.array(z.coerce.number().int().positive()).optional(),
      imageIds: z.array(z.coerce.number().int().positive()).optional(),
      tagIds: z.array(z.coerce.number().int().positive()).min(1),
      action: z.enum(['add', 'remove']),
    })
    .refine((body) => (body.itemIds?.length ?? 0) > 0 || (body.imageIds?.length ?? 0) > 0, {
      message: 'At least one item id is required',
    }),
});

const batchPeopleSchema = z.object({
  body: z.object({
    itemIds: z.array(z.number().int().positive()),
    personIds: z.array(z.number().int().positive()),
    action: z.enum(['add', 'remove']).optional(),
  }),
});

const batchImagePeopleSchema = z.object({
  body: z
    .object({
      itemIds: z.array(z.coerce.number().int().positive()).optional(),
      imageIds: z.array(z.coerce.number().int().positive()).optional(),
      personIds: z.array(z.coerce.number().int().positive()).optional(),
      entityIds: z.array(z.coerce.number().int().positive()).optional(),
      action: z.enum(['add', 'remove']).optional(),
    })
    .refine((body) => (body.itemIds?.length ?? 0) > 0 || (body.imageIds?.length ?? 0) > 0, {
      message: 'At least one item id is required',
    })
    .refine((body) => (body.personIds?.length ?? 0) > 0 || (body.entityIds?.length ?? 0) > 0, {
      message: 'At least one person id is required',
    }),
});

const handleBatchTags = async (itemIds: number[], tagIds: number[], action: 'add' | 'remove') => {
  if (action === 'add') {
    await mediaService.batchAddTagsToItems(itemIds, tagIds);
  } else {
    await mediaService.batchRemoveTagsFromItems(itemIds, tagIds);
  }

  return itemIds.map((id) => ({ id, success: true }));
};

const handleBatchPeople = async (
  itemIds: number[],
  personIds: number[],
  action?: 'add' | 'remove',
) => {
  if (action === 'remove') {
    await mediaService.batchRemovePeopleFromItems(itemIds, personIds);
  } else {
    await mediaService.batchAddPeopleToItems(itemIds, personIds);
  }

  return itemIds.map((id) => ({ id, success: true }));
};

router.put(
  '/items/batch/tags',
  authenticateRequest,
  validate(batchTagsSchema),
  async (req, res, next) => {
    try {
      const { itemIds, tagIds, action } = req.body as {
        itemIds: number[];
        tagIds: number[];
        action: 'add' | 'remove';
      };
      const results = await handleBatchTags(itemIds, tagIds, action);
      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/items/batch/people',
  authenticateRequest,
  validate(batchPeopleSchema),
  async (req, res, next) => {
    try {
      const { itemIds, personIds, action } = req.body as {
        itemIds: number[];
        personIds: number[];
        action?: 'add' | 'remove';
      };
      const results = await handleBatchPeople(itemIds, personIds, action);
      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/images/batch/tags',
  authenticateRequest,
  validate(batchImageTagsSchema),
  async (req, res, next) => {
    try {
      const { imageIds, itemIds, tagIds, action } = req.body as {
        imageIds?: number[];
        itemIds?: number[];
        tagIds: number[];
        action: 'add' | 'remove';
      };
      const results = await handleBatchTags(itemIds ?? imageIds ?? [], tagIds, action);
      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/images/batch/tags',
  authenticateRequest,
  validate(batchImageTagsSchema),
  async (req, res, next) => {
    try {
      const { imageIds, itemIds, tagIds, action } = req.body as {
        imageIds?: number[];
        itemIds?: number[];
        tagIds: number[];
        action: 'add' | 'remove';
      };
      const results = await handleBatchTags(itemIds ?? imageIds ?? [], tagIds, action);
      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  '/images/batch/people',
  authenticateRequest,
  validate(batchImagePeopleSchema),
  async (req, res, next) => {
    try {
      const { imageIds, itemIds, personIds, entityIds, action } = req.body as {
        imageIds?: number[];
        itemIds?: number[];
        personIds?: number[];
        entityIds?: number[];
        action?: 'add' | 'remove';
      };
      const results = await handleBatchPeople(
        itemIds ?? imageIds ?? [],
        personIds ?? entityIds ?? [],
        action,
      );
      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/images/batch/people',
  authenticateRequest,
  validate(batchImagePeopleSchema),
  async (req, res, next) => {
    try {
      const { imageIds, itemIds, personIds, entityIds, action } = req.body as {
        imageIds?: number[];
        itemIds?: number[];
        personIds?: number[];
        entityIds?: number[];
        action?: 'add' | 'remove';
      };
      const results = await handleBatchPeople(
        itemIds ?? imageIds ?? [],
        personIds ?? entityIds ?? [],
        action,
      );
      res.json({ ok: true, results });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
