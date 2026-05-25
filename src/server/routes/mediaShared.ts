import { Request, Response, NextFunction } from 'express';
import { mediaRepository } from '../db/mediaRepository.js';
import { z } from 'zod';
import { rejectDeepOffset } from '../utils/paginationGuards.js';

export const mediaIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const avListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(24),
    albumId: z.coerce.number().int().optional(),
    sortBy: z.enum(['title', 'date', 'rating', 'date_taken']).optional(),
    transcriptQuery: z.string().optional(),
    hasPeople: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
  }),
});

export const makeAvListHandler =
  (fileType: 'audio' | 'video') => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as Record<string, string | undefined>;
      const { page, limit, albumId, sortBy, transcriptQuery, hasPeople } = query;
      const pageNumber = Number(page || 1);
      const limitNumber = Number(limit || 24);
      if (
        rejectDeepOffset(
          res,
          `${fileType === 'audio' ? 'Audio' : 'Video'} media`,
          pageNumber,
          limitNumber,
        )
      ) {
        return;
      }
      const result = await mediaRepository.getMediaItemsPaginated(pageNumber, limitNumber, {
        fileType,
        albumId: albumId ? Number(albumId) : undefined,
        sortBy: (sortBy as 'title' | 'date' | 'rating' | 'date_taken') ?? 'title',
        transcriptQuery: transcriptQuery || undefined,
        hasPeople: hasPeople === 'true',
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
