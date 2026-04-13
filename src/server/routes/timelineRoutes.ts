import { Router } from 'express';
import { timelineRepository } from '../db/timelineRepository.js';

const router = Router();

// Public investigation timeline feed used by /timeline page.
router.get('/:id/support', async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid timeline event id' });
    }

    const support = await timelineRepository.getTimelineEventSupport(eventId);
    if (!support) {
      return res.status(404).json({ error: 'Timeline event not found' });
    }

    return res.json(support);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const startDateRaw = String((req.query.startDate as string | undefined) || '').trim();
    const endDateRaw = String((req.query.endDate as string | undefined) || '').trim();
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    const events = await timelineRepository.getTimelineEvents({
      startDate: datePattern.test(startDateRaw) ? startDateRaw : undefined,
      endDate: datePattern.test(endDateRaw) ? endDateRaw : undefined,
    });

    res.json(events);
  } catch (error) {
    next(error);
  }
});

export default router;
