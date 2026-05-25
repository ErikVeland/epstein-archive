import { Router } from 'express';
import { MediaService } from '../services/MediaService.js';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();
const mediaService = new MediaService(null);

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
  '/images/batch/rotate',
  authenticateRequest,
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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

router.put(
  '/items/batch/tags',
  authenticateRequest,
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
  requireRole('admin'),
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
