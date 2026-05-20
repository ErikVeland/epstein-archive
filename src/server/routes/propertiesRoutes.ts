import express from 'express';
import { propertiesRepository } from '../db/propertiesRepository.js';
import { validate, propertiesQuerySchema, numericIdParamSchema } from '../middleware/validate.js';
import { rejectDeepOffset } from '../utils/paginationGuards.js';

const router = express.Router();

router.get('/', validate(propertiesQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(500, Math.max(1, Number(q.limit || 50)));
    if (rejectDeepOffset(res, 'Property', page, limit)) return;

    const sortByRaw = String(q.sortBy || '').trim();
    const sortByParam: 'value' | 'owner' | 'year' | undefined =
      sortByRaw === 'value' || sortByRaw === 'owner' || sortByRaw === 'year'
        ? sortByRaw
        : undefined;

    const sortOrderRaw = String(q.sortOrder || '').trim();
    const sortOrderParam: 'asc' | 'desc' | undefined =
      sortOrderRaw === 'asc' || sortOrderRaw === 'desc' ? sortOrderRaw : undefined;

    const payload = await propertiesRepository.getProperties({
      page,
      limit,
      ownerSearch: String(q.search || '').trim() || undefined,
      minValue: q.minValue !== undefined ? Number(q.minValue) : undefined,
      maxValue: q.maxValue !== undefined ? Number(q.maxValue) : undefined,
      propertyUse: String(q.type || '').trim() || undefined,
      knownAssociatesOnly: String(q.associatesOnly || '').toLowerCase() === 'true',
      sortBy: sortByParam,
      sortOrder: sortOrderParam,
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await propertiesRepository.getPropertyStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/value-distribution', async (_req, res, next) => {
  try {
    const rows = await propertiesRepository.getValueDistribution();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/top-owners', async (req, res, next) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, Number((req.query as Record<string, string | undefined>).limit || 20)),
    );
    const rows = await propertiesRepository.getTopOwners(limit);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/known-associates', async (_req, res, next) => {
  try {
    const rows = await propertiesRepository.getKnownAssociateProperties();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const property = await propertiesRepository.getPropertyById(id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (error) {
    next(error);
  }
});

export default router;
