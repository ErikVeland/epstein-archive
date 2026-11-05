import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PoolClient } from 'pg';
import { getApiPool, drainPools } from '../server/db/connection.js';
import { intelligenceRepository } from '../server/db/intelligenceRepository.js';

describe('intelligence summary semantics', () => {
  const pool = getApiPool();
  let client: PoolClient;
  beforeAll(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(`
      CREATE TEMP TABLE entities (id bigint PRIMARY KEY, full_name text, risk_level text) ON COMMIT DROP;
      CREATE TEMP TABLE documents (id bigint PRIMARY KEY, file_name text) ON COMMIT DROP;
      CREATE TEMP TABLE entity_mentions (id text PRIMARY KEY, entity_id bigint, document_id bigint) ON COMMIT DROP;
      CREATE TEMP TABLE document_ocr_results (document_id bigint, confidence_score real, quality_flag text) ON COMMIT DROP;
      INSERT INTO entities VALUES (10,'Thin','HIGH'),(11,'Documented','HIGH'),(12,'Empty','HIGH'),(13,'Low risk','LOW');
      INSERT INTO documents VALUES (1,'one'),(2,'two'),(3,'three'),(4,'four');
      INSERT INTO entity_mentions VALUES ('a',10,1),('b',10,1),('c',10,2),('d',11,1),('e',11,2),('f',11,3);
      INSERT INTO document_ocr_results VALUES (1,0.1,NULL),(2,0.2,NULL),(3,0.9,NULL);
    `);
    vi.spyOn(pool, 'query').mockImplementation(client.query.bind(client) as typeof pool.query);
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    await drainPools();
  });

  it('counts mentions separately from distinct documents and excludes the third document', async () => {
    const summary = await intelligenceRepository.getThinHighRiskSummary();
    expect(summary).toEqual({
      total: 2,
      items: [
        {
          entityId: 12,
          entityName: 'Empty',
          riskLevel: 'HIGH',
          evidenceCount: 0,
          documentCount: 0,
        },
        { entityId: 10, entityName: 'Thin', riskLevel: 'HIGH', evidenceCount: 3, documentCount: 2 },
      ],
    });
  });

  it('keeps the exact weak-provenance total for zero, one and repeated mentions', async () => {
    expect(await intelligenceRepository.countWeakProvenanceDocs()).toBe(2);
  });

  it('counts all qualifying OCR documents', async () => {
    expect(await intelligenceRepository.getLowOcrDocs()).toHaveLength(2);
    expect(await intelligenceRepository.countLowOcrDocs()).toBe(2);
  });
});
