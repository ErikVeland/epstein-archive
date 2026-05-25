import { Router } from 'express';
import { authenticateRequest } from '../auth/middleware.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { investigationsRepository } from '../db/investigationsRepository.js';

const router = Router();

// Schemas
const numericIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
});

const timelineEventSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    event_date: z.string().optional(),
    event_type: z.string().optional(),
  }),
});

const updateTimelineEventSchema = z.object({
  params: z.object({
    id: z.coerce.number().int(),
    eventId: z.coerce.number().int(),
  }),
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    event_date: z.string().optional(),
    event_type: z.string().optional(),
  }),
});

// --- Timeline Events ---

router.get('/:id/timeline-events', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const events = await investigationsRepository.getTimelineEvents(Number(id));
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/timeline-events',
  authenticateRequest,
  validate(timelineEventSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const eventId = await investigationsRepository.addTimelineEvent(Number(id), req.body);
      res.status(201).json({ id: eventId, ...req.body });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/:id/timeline-events/:eventId',
  authenticateRequest,
  validate(updateTimelineEventSchema),
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const success = await investigationsRepository.updateTimelineEvent(Number(eventId), req.body);
      if (!success) return res.status(404).json({ error: 'Event not found' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  '/:id/timeline-events/:eventId',
  authenticateRequest,
  validate(updateTimelineEventSchema),
  async (req, res, next) => {
    try {
      const { eventId } = req.params;
      const success = await investigationsRepository.deleteTimelineEvent(Number(eventId));
      if (!success) return res.status(404).json({ error: 'Event not found' });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
