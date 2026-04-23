import { Router } from 'express';
import { timelineRepository } from '../db/timelineRepository.js';
import { validate, numericIdParamSchema, timelineQuerySchema } from '../middleware/validate.js';

const router = Router();

// Public investigation timeline feed used by /timeline page.
router.get('/:id/support', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    const support = await timelineRepository.getTimelineEventSupport(eventId);
    if (!support) {
      return res.status(404).json({ error: 'Timeline event not found' });
    }

    return res.json(support);
  } catch (error) {
    next(error);
  }
});

router.get('/', validate(timelineQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | undefined>;

    const events = await timelineRepository.getTimelineEvents({
      startDate: q.startDate,
      endDate: q.endDate,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
