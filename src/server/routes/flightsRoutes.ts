import express from 'express';
import { z } from 'zod';
import { flightsRepository } from '../db/flightsRepository.js';
import { validate, flightsQuerySchema, numericIdParamSchema } from '../middleware/validate.js';

const router = express.Router();

const coOccurrenceQuerySchema = z.object({
  query: z.object({
    minFlights: z.coerce.number().int().min(1).default(2),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  }),
});

router.get('/', validate(flightsQuerySchema), async (req, res, next) => {
  try {
    const q = req.query as Record<string, string | undefined>;
    const page = Math.max(1, Number(q.page || 1));
    const limit = Math.min(500, Math.max(1, Number(q.limit || 50)));
    const startDate = String(q.startDate || '').trim() || undefined;
    const endDate = String(q.endDate || '').trim() || undefined;
    const passenger = String(q.passenger || '').trim() || undefined;
    const airport = String(q.airport || '').trim() || undefined;

    const payload = await flightsRepository.getFlights({
      page,
      limit,
      startDate,
      endDate,
      passenger,
      airport,
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/stats', validate(z.object({})), async (_req, res, next) => {
  try {
    const stats = await flightsRepository.getFlightStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

router.get('/airports', validate(z.object({})), async (_req, res, next) => {
  try {
    const airports = await flightsRepository.getAirportCoords();
    res.json(airports);
  } catch (error) {
    next(error);
  }
});

router.get('/passengers', validate(z.object({})), async (_req, res, next) => {
  try {
    const passengers = await flightsRepository.getUniquePassengers();
    res.json(passengers);
  } catch (error) {
    next(error);
  }
});

router.get('/co-occurrences', validate(coOccurrenceQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as Record<string, string | string[] | undefined>;
    const minFlights = Math.max(1, Number(query.minFlights || 2));
    const limit = Math.min(200, Math.max(1, Number(query.limit || 100)));
    const rows = await flightsRepository.getPassengerCoOccurrences(minFlights);
    const shaped = rows.slice(0, limit).map((r: Record<string, unknown>) => ({
      passenger1: String(r.passenger1 || ''),
      passenger2: String(r.passenger2 || ''),
      entity_id_1: r.entity_id_1 != null ? Number(r.entity_id_1) : null,
      entity_id_2: r.entity_id_2 != null ? Number(r.entity_id_2) : null,
      flights_together: Number(r.flightsTogether || 0),
      first_flight: r.firstFlight || null,
      last_flight: r.lastFlight || null,
    }));
    res.json(shaped);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validate(numericIdParamSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const flight = await flightsRepository.getFlightById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    res.json(flight);
  } catch (error) {
    next(error);
  }
});

export default router;
