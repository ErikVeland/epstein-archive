import { Router } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { cacheResponse } from '../middleware/cache.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { mediaStreamLimiter } from '../middleware/rateLimit.js';
import { findFirstExistingPath } from '../utils/pathResolver.js';
import path from 'path';
import { avListQuerySchema, makeAvListHandler, mediaIdParamSchema } from './mediaShared.js';

const router = Router();

router.get('/audio/albums', cacheResponse(120), validate(z.object({})), async (_req, res, next) => {
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

router.get(
  '/audio/:id/stream',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
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
  },
);

router.get(
  '/audio/:id/thumbnail',
  mediaStreamLimiter,
  validate(mediaIdParamSchema),
  async (req, res, next) => {
    try {
      const item = await mediaRepository.getMediaItemById(Number(req.params.id));
      if (!item) return res.status(404).json({ error: 'Audio item not found' });

      const thumbnailPath = findFirstExistingPath([String(item.thumbnailPath || '')]);
      if (!thumbnailPath) {
        return res.status(404).json({ error: 'Audio thumbnail not available' });
      }

      res.type(path.extname(thumbnailPath) || 'image/jpeg');
      return res.sendFile(thumbnailPath);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
