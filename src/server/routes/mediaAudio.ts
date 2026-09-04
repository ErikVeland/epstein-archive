import { Router } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { cacheResponse } from '../middleware/cache.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { mediaStreamLimiter } from '../middleware/rateLimit.js';
import { findFirstExistingPath } from '../utils/pathResolver.js';
import path from 'path';
import { avListQuerySchema, makeAvListHandler, mediaIdParamSchema } from './mediaShared.js';
import { getDojNativeSourceUrl } from '../../shared/utils/dojNativeSource.js';

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
      if (!resolvedPath) {
        const sourceUrl = getDojNativeSourceUrl(item.metadata);
        if (sourceUrl) return res.redirect(307, sourceUrl);
        return res.status(404).json({ error: 'Audio file not found on disk' });
      }

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
      if (!item) {
        // Cache the "not found" response so the browser and CDN don't hammer this endpoint.
        res.set('Cache-Control', 'public, max-age=3600');
        return res.status(404).json({ error: 'Audio item not found' });
      }

      const thumbnailPath = findFirstExistingPath([String(item.thumbnailPath || '')]);
      if (!thumbnailPath) {
        // Return a lightweight SVG placeholder instead of a 404 JSON body.
        // The browser treats it as a valid image, stops retrying, and the UI
        // can use it as a fallback without an onError handler.
        res.set('Cache-Control', 'public, max-age=86400');
        res.type('image/svg+xml');
        return res.send(
          `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">` +
            `<rect width="80" height="80" rx="8" fill="#1a1a2e"/>` +
            `<path d="M32 28v24l20-12z" fill="#4a4a6a"/>` +
            `</svg>`,
        );
      }

      res.set('Cache-Control', 'public, max-age=86400');
      res.type(path.extname(thumbnailPath) || 'image/jpeg');
      return res.sendFile(thumbnailPath);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
