import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';

const { exec, infer } = vi.hoisted(() => ({ exec: vi.fn(), infer: vi.fn() }));
vi.mock('node:util', () => ({ promisify: () => exec }));
vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/tmp/redaction-test'),
  readFile: vi.fn().mockResolvedValue('{"spans":[]}'),
  rm: vi.fn(),
}));
vi.mock('../server/services/AIEnrichmentService.js', () => ({
  AIEnrichmentService: { inferRedactionCandidate: infer },
}));
import { processRedactionDocument } from '../../scripts/backfill_redaction_intelligence.js';

describe('redaction backfill scan failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves a missing-PDF error and does not run context work that requeues the row', async () => {
    exec.mockRejectedValueOnce(new Error('FileNotFoundError: No PDF input found'));
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const connect = vi.fn();
    const pool = { query, connect } as unknown as Pool;
    expect(
      await processRedactionDocument(
        pool,
        {
          id: '103304',
          file_path: '/missing.pdf',
          content: '[REDACTED]',
          content_refined: null,
          content_hash: 'source',
        },
        'all',
      ),
    ).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('error_text = EXCLUDED.error_text');
    expect(query.mock.calls[0][1][2]).toContain('FileNotFoundError');
    expect(connect).not.toHaveBeenCalled();
    expect(infer).not.toHaveBeenCalled();
  });

  it('still completes a successful PDF scan', async () => {
    exec.mockResolvedValueOnce({ stdout: '' });
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const pool = {
      query,
      connect: vi.fn().mockResolvedValue({ query, release }),
    } as unknown as Pool;
    expect(
      await processRedactionDocument(
        pool,
        {
          id: '1',
          file_path: '/available.pdf',
          content: 'No redacted spans',
          content_refined: null,
          content_hash: 'source',
        },
        'all',
      ),
    ).toBe(true);
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalled();
  });
});
