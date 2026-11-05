import 'dotenv/config';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { DatasetRevisionManager } from '../server/revisionManager.js';
import { getApiPool, drainPools } from '../server/db/connection.js';

describe('revision lookup plans', () => {
  afterAll(() => drainPools());
  it('can resolve every revision timestamp through an index', async () => {
    const pool = getApiPool();
    const queries: string[] = [];
    const original = pool.query.bind(pool);
    const spy = vi.spyOn(pool, 'query').mockImplementation((async (sql: string) => {
      queries.push(sql);
      return original(sql);
    }) as typeof pool.query);
    try {
      await new DatasetRevisionManager().getRevisionToken();
    } finally {
      spy.mockRestore();
    }
    expect(queries).toHaveLength(2);
    const client = await pool.connect();
    try {
      await client.query('SET enable_seqscan = off');
      for (const sql of queries) {
        const result = await client.query('EXPLAIN (FORMAT JSON) ' + sql);
        const scans: string[] = [];
        const walk = (node: Record<string, unknown>) => {
          if (node['Node Type'] === 'Seq Scan') scans.push(String(node['Relation Name']));
          for (const child of (node.Plans || []) as Record<string, unknown>[]) walk(child);
        };
        walk(result.rows[0]['QUERY PLAN'][0].Plan);
        expect(scans).toEqual([]);
      }
    } finally {
      await client.query('RESET enable_seqscan');
      client.release();
    }
  });
});
