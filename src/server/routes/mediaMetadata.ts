import { Router } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { cacheResponse } from '../middleware/cache.js';
import crypto from 'crypto';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { MediaService } from '../services/MediaService.js';

const router = Router();
const mediaService = new MediaService(null);

const batchAvatarsSchema = z.object({
  query: z.object({
    ids: z.string().min(1, 'ids parameter required'),
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

router.get('/albums', cacheResponse(300), validate(z.object({})), async (_req, res, next) => {
  try {
    const albums = await mediaService.getAllAlbums();
    res.json(albums);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', cacheResponse(120), validate(z.object({})), async (_req, res, next) => {
  try {
    const stats = await mediaService.getMediaStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/tags', cacheResponse(120), validate(z.object({})), async (_req, res, next) => {
  try {
    const tags = await mediaService.getAllTags();
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

export default router;
