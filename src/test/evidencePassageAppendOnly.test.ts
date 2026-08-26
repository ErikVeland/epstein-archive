import { describe, expect, it, vi } from 'vitest';
import { EVIDENCE_PASSAGE_INSERT_CONFLICT_SQL } from '../../scripts/backfill_evidence_passages.js';
import {
  down,
  up,
} from '../server/db/postgres/migrations/1757100000004_append_only_evidence_passages.js';

describe('append-only evidence passage migration', () => {
  it('rejects every row update and delete at the database boundary', async () => {
    const sql = vi.fn();

    await up({ sql });

    expect(sql).toHaveBeenCalledTimes(1);
    const statement = String(sql.mock.calls[0]?.[0]);
    expect(statement).toContain(
      'CREATE OR REPLACE FUNCTION public.reject_evidence_passage_mutation()',
    );
    expect(statement).toContain('RAISE EXCEPTION USING');
    expect(statement).toContain("MESSAGE = 'evidence_passages is append-only'");
    expect(statement).toContain('BEFORE UPDATE OR DELETE ON public.evidence_passages');
    expect(statement).toContain('FOR EACH ROW');
    expect(statement).toContain('EXECUTE FUNCTION public.reject_evidence_passage_mutation()');
  });

  it('removes the trigger before removing its function on rollback', async () => {
    const sql = vi.fn();

    await down({ sql });

    const statement = String(sql.mock.calls[0]?.[0]);
    const triggerDrop = statement.indexOf('DROP TRIGGER IF EXISTS');
    const functionDrop = statement.indexOf('DROP FUNCTION IF EXISTS');
    expect(triggerDrop).toBeGreaterThanOrEqual(0);
    expect(functionDrop).toBeGreaterThan(triggerDrop);
  });
});

describe('evidence passage backfill conflict policy', () => {
  it('makes citation reruns insert-only and idempotent', () => {
    expect(EVIDENCE_PASSAGE_INSERT_CONFLICT_SQL).toBe('ON CONFLICT (citation_id) DO NOTHING');
    expect(EVIDENCE_PASSAGE_INSERT_CONFLICT_SQL).not.toMatch(/DO UPDATE/i);
  });
});
