import { Router } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { cacheResponse } from '../middleware/cache.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { mediaStreamLimiter } from '../middleware/rateLimit.js';
import { findFirstExistingPath } from '../utils/pathResolver.js';
import path from 'path';
import { ThumbnailService } from '../services/ThumbnailService.js';
import { avListQuerySchema, makeAvListHandler, mediaIdParamSchema } from './mediaShared.js';

const router = Router();

router.get('/video/albums', cacheResponse(120), validate(z.object({})), async (_req, res, next) => {
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

router.get(
  '/video/:id/thumbnail',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
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
  },
);

router.get(
  '/video/:id/stream',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
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
  },
);

export default router;
