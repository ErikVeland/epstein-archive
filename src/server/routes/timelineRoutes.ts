import { Router } from 'express';
import { timelineRepository } from '../db/timelineRepository.js';

const router = Router();

// Public investigation timeline feed used by /timeline page.
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
