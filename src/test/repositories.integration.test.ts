import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { analyticsRepository } from '../server/db/analyticsRepository.js';
import { blackBookRepository } from '../server/db/blackBookRepository.js';
import { drainPools, getApiPool } from '../server/db/connection.js';
import { flightsRepository } from '../server/db/flightsRepository.js';
import { statsRepository } from '../server/db/statsRepository.js';
import { timelineRepository } from '../server/db/timelineRepository.js';
import { withSafeStatsContract } from '../server/utils/stats.js';

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

function assertSchema<T>(schema: z.ZodSchema<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`[Integration] ${label} failed schema: ${details}`);
  }
  return result.data;
}

describe('repository integration tests', () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error('Set DATABASE_URL to a migrated PostgreSQL test database.');
    }
  });

  afterEach(() => vi.restoreAllMocks());
  afterAll(() => drainPools());

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

    it('getAirportCoords returns airport coordinates by code', async () => {
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

    it('propagates query errors', async () => {
      vi.spyOn(getApiPool(), 'query').mockRejectedValue(new Error('Simulated DB failure'));
      await expect(timelineRepository.getTimelineEvents()).rejects.toThrow('Simulated DB failure');
    });
  });

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

    it('getBlackBookReviewStats propagates query errors', async () => {
      vi.spyOn(getApiPool(), 'query').mockRejectedValue(new Error('DB error'));
      await expect(blackBookRepository.getBlackBookReviewStats()).rejects.toThrow('DB error');
    });
  });

  describe('analyticsRepository (DegradedResult pattern)', () => {
    it('getHighRiskFinancialTransactions reads the migrated schema', async () => {
      expect(Array.isArray(await analyticsRepository.getHighRiskFinancialTransactions())).toBe(
        true,
      );
    });

    it('returns each visible linked flight email once', async () => {
      const pool = getApiPool();
      const suffix = randomUUID();
      const {
        rows: [entity],
      } = await pool.query('INSERT INTO entities (full_name) VALUES ($1) RETURNING id', [
        `Synthetic ${suffix}`,
      ]);
      const documentPaths = ['flight', 'other', 'unlinked', 'hidden', 'sensitive', 'review'].map(
        (name) => `${suffix}/${name}`,
      );
      try {
        const {
          rows: [flight, other, , hidden, sensitive, review],
        } = await pool.query(
          `INSERT INTO documents (file_name, file_path, evidence_type, content, metadata_json, is_hidden, is_sensitive)
          VALUES ('flight.txt', $1, 'email', 'Flight details', $7, 0, false),
                 ('other.txt', $2, 'email', 'Meeting details', '{}', 0, false),
                 ('unlinked.txt', $3, 'email', 'Flight details', '{}', 0, false),
                 ('hidden.txt', $4, 'email', 'Flight details', '{}', 1, false),
                 ('sensitive.txt', $5, 'email', 'Flight details', '{}', 0, true),
                 ('review.txt', $6, 'email', 'Flight details', '{"evidenceRole":"claim_review"}', 0, false)
          RETURNING id`,
          [...documentPaths, { From: 'Synthetic Sender', To: ['Recipient A', 'Recipient B'] }],
        );
        const linkedIds = [flight.id, flight.id, other.id, hidden.id, sensitive.id, review.id];
        await pool.query(
          `INSERT INTO entity_mentions (id, entity_id, document_id)
          SELECT mention_id, $1, document_id
          FROM UNNEST($2::text[], $3::bigint[]) AS links(mention_id, document_id)`,
          [entity.id, linkedIds.map(() => randomUUID()), linkedIds],
        );

        expect(await analyticsRepository.getFlightCommunications(entity.id)).toEqual([
          { from: 'Synthetic Sender', to: ['Recipient A', 'Recipient B'] },
        ]);
      } finally {
        await pool.query('DELETE FROM documents WHERE file_path = ANY($1::text[])', [
          documentPaths,
        ]);
        await pool.query('DELETE FROM entities WHERE id = $1', [entity.id]);
      }
    });

    it('getHighRiskFinancialTransactions returns DegradedResult on DB error', async () => {
      vi.spyOn(getApiPool(), 'query').mockRejectedValue(new Error('injected'));
      const result = await analyticsRepository.getHighRiskFinancialTransactions();
      assertSchema(degradedResultShape, result, 'high-risk transactions fallback');
    });
  });

  it('serves authenticated correlations against the migrated schema', async () => {
    const secret = 'synthetic-correlation-regression-key';
    vi.stubEnv('JWT_SECRET', secret);
    try {
      const { default: routes } = await import('../server/routes/analytics.js');
      const app = express().use('/api/analytics', routes);
      const token = jwt.sign({ id: 'synthetic-investigator', role: 'investigator' }, secret, {
        expiresIn: '1m',
      });
      const response = await request(app)
        .get('/api/analytics/correlations')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        dataSources: expect.arrayContaining([expect.objectContaining({ id: 'documents' })]),
        correlations: expect.any(Array),
        rules: expect.any(Array),
      });
    } finally {
      vi.unstubAllEnvs();
    }
  }, 30_000);

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
