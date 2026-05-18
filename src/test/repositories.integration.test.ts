/**
 * Repository integration tests — require a live PostgreSQL database.
 *
 * These tests require a live PostgreSQL database and fail closed when
 * DATABASE_URL is absent. They verify that:
 *
 *   1. Repository functions return the expected data shapes (schema conformance)
 *   2. Functions fixed in Phase 1 (silent-failure removal) now propagate errors
 *      instead of swallowing them
 *   3. The DegradedResult<T> pattern works correctly for optional sub-queries
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const describeIntegration = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;

// ── Schema fixtures ──────────────────────────────────────────────────────────
// Minimal shapes — enough to catch regressions without over-specifying.

const flightShape = z.object({
  id: z.number(),
  date: z.string().nullable(),
  passengers: z.array(z.object({ id: z.number() })).optional(),
});

const timelineEventShape = z.object({
  id: z.string().startsWith('evt-'),
  title: z.string(),
  type: z.string(),
  entities: z.array(z.unknown()),
});

const blackBookEntryShape = z.object({
  id: z.number(),
  entryText: z.string().nullable().optional(),
  entry_text: z.string().optional(),
});

const degradedResultShape = z.object({
  data: z.array(z.unknown()),
  degraded: z.literal(true),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function assertSchema<T>(schema: z.ZodSchema<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`[Integration] ${label} failed schema: ${details}`);
  }
  return result.data;
}

// ── Suite ────────────────────────────────────────────────────────────────────

describeIntegration('repository integration tests', () => {
  // Lazy-import repositories only when we actually have a DB connection.
  // This prevents pool initialization errors during regular unit test runs.
  let flightsRepository: typeof import('../server/db/flightsRepository.js').flightsRepository;
  let timelineRepository: typeof import('../server/db/timelineRepository.js').timelineRepository;
  let blackBookRepository: typeof import('../server/db/blackBookRepository.js').blackBookRepository;
  let analyticsRepository: typeof import('../server/db/analyticsRepository.js').analyticsRepository;
  let statsRepository: typeof import('../server/db/statsRepository.js').statsRepository;
  let withSafeStatsContract: typeof import('../server/utils/stats.js').withSafeStatsContract;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set when RUN_INTEGRATION=1');
    }
    ({ flightsRepository } = await import('../server/db/flightsRepository.js'));
    ({ timelineRepository } = await import('../server/db/timelineRepository.js'));
    ({ blackBookRepository } = await import('../server/db/blackBookRepository.js'));
    ({ analyticsRepository } = await import('../server/db/analyticsRepository.js'));
    ({ statsRepository } = await import('../server/db/statsRepository.js'));
    ({ withSafeStatsContract } = await import('../server/utils/stats.js'));
  });

  // ── Flights ───────────────────────────────────────────────────────────────

  describe('flightsRepository', () => {
    it('getFlights returns { flights, total } shape', async () => {
      const result = await flightsRepository.getFlights({ page: 1, limit: 5 });
      expect(result).toHaveProperty('flights');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.flights)).toBe(true);

      if (result.flights.length > 0) {
        assertSchema(flightShape, result.flights[0], 'flight item');
      }
    });

    it('getFlights with passenger filter still returns valid shape', async () => {
      const result = await flightsRepository.getFlights({
        page: 1,
        limit: 5,
        passenger: 'Epstein',
      });
      expect(Array.isArray(result.flights)).toBe(true);
    });

    it('getFlightById returns null for non-existent ID', async () => {
      const result = await flightsRepository.getFlightById(999_999_999);
      expect(result).toBeNull();
    });

    it('getAirportCoords returns an array', async () => {
      const result = await flightsRepository.getAirportCoords();
      expect(result).toBeTypeOf('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
      const firstAirport = Object.values(result)[0] as Record<string, unknown>;
      expect(typeof firstAirport.lat).toBe('number');
      expect(typeof firstAirport.lng).toBe('number');
      expect(typeof firstAirport.city).toBe('string');
    });

    it('getUniquePassengers returns passenger summary rows', async () => {
      const result = await flightsRepository.getUniquePassengers();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(typeof result[0].name).toBe('string');
        expect(typeof result[0].flight_count).toBe('number');
        expect(
          result[0].entity_id === null || typeof result[0].entity_id === 'number',
        ).toBeTruthy();
      }
    });
  });

  // ── Timeline ─────────────────────────────────────────────────────────────

  describe('timelineRepository', () => {
    it('getTimelineEvents returns an array', async () => {
      const events = await timelineRepository.getTimelineEvents();
      expect(Array.isArray(events)).toBe(true);

      if (events.length > 0) {
        assertSchema(timelineEventShape, events[0], 'timeline event[0]');
      }
    });

    it('getTimelineEvents with date filter returns a subset', async () => {
      const all = await timelineRepository.getTimelineEvents();
      const filtered = await timelineRepository.getTimelineEvents({
        startDate: '2010-01-01',
        endDate: '2015-12-31',
      });
      // Filtered result should be <= full result
      expect(filtered.length).toBeLessThanOrEqual(all.length);
    });

    it('getTimelineEventSupport returns null for non-existent ID', async () => {
      const result = await timelineRepository.getTimelineEventSupport(999_999_999);
      expect(result).toBeNull();
    });

    it('throws on real DB errors (no silent swallow)', async () => {
      // Simulate a DB error by temporarily replacing the query function on the pool
      const { getApiPool } = await import('../server/db/connection.js');
      const pool = getApiPool();
      const originalQuery = pool.query.bind(pool);
      const queryError = new Error('Simulated DB failure');

      // Patch query to throw
      pool.query = vi.fn().mockRejectedValue(queryError) as typeof pool.query;

      await expect(timelineRepository.getTimelineEvents()).rejects.toThrow('Simulated DB failure');

      // Restore
      pool.query = originalQuery;
    });
  });

  // ── BlackBook ────────────────────────────────────────────────────────────

  describe('blackBookRepository', () => {
    it('getBlackBookEntries returns entries for letter A', async () => {
      const entries = await blackBookRepository.getBlackBookEntries({
        letter: 'A',
        limit: 10,
      });
      expect(Array.isArray(entries)).toBe(true);

      if (entries.length > 0) {
        assertSchema(blackBookEntryShape, entries[0], 'blackBook entry[0]');
      }
    });

    it('getBlackBookEntries with ALL letter returns entries', async () => {
      const entries = await blackBookRepository.getBlackBookEntries({ limit: 5 });
      expect(Array.isArray(entries)).toBe(true);
    });

    it('getBlackBookReviewStats throws on DB error (Phase 1 fix)', async () => {
      const { getApiPool } = await import('../server/db/connection.js');
      const pool = getApiPool();
      const originalQuery = pool.query.bind(pool);

      pool.query = vi.fn().mockRejectedValue(new Error('DB error')) as typeof pool.query;

      await expect(blackBookRepository.getBlackBookReviewStats()).rejects.toThrow('DB error');

      pool.query = originalQuery;
    });
  });

  // ── Analytics / DegradedResult ───────────────────────────────────────────

  describe('analyticsRepository (DegradedResult pattern)', () => {
    it('getHighRiskFinancialTransactions returns array or DegradedResult', async () => {
      const result = await analyticsRepository.getHighRiskFinancialTransactions();
      if (Array.isArray(result)) {
        // Happy path — nothing to assert beyond it being an array
      } else {
        assertSchema(degradedResultShape, result, 'highRiskTxs degraded result');
      }
    });

    it('getFlightCommunications returns array or DegradedResult', async () => {
      const result = await analyticsRepository.getFlightCommunications(1);
      if (Array.isArray(result)) {
        // Happy path
      } else {
        assertSchema(degradedResultShape, result, 'flightComms degraded result');
      }
    });

    it('getHighRiskFinancialTransactions returns DegradedResult on DB error', async () => {
      const { getApiPool } = await import('../server/db/connection.js');
      const pool = getApiPool();
      const originalQuery = pool.query.bind(pool);

      pool.query = vi.fn().mockRejectedValue(new Error('injected')) as typeof pool.query;

      const result = await analyticsRepository.getHighRiskFinancialTransactions();
      expect(Array.isArray(result)).toBe(false);
      expect((result as { degraded: boolean }).degraded).toBe(true);

      pool.query = originalQuery;
    });
  });

  // ── Stats ────────────────────────────────────────────────────────────────

  describe('statsRepository + withSafeStatsContract', () => {
    it('getStatistics resolves and withSafeStatsContract produces valid shape', async () => {
      const raw = await statsRepository.getStatistics();
      const safe = withSafeStatsContract(raw);

      expect(typeof safe.totalEntities).toBe('number');
      expect(typeof safe.totalDocuments).toBe('number');
      expect(Array.isArray(safe.likelihoodDistribution)).toBe(true);
      expect(safe.likelihoodDistribution.map((d) => d.level)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
      expect(safe._meta).toHaveProperty('degraded');
    });
  });
});
