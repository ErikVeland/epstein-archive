import { afterEach, describe, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../server/db/connection.js', () => ({ getApiPool: () => ({ query }) }));
import { DatasetRevisionManager } from '../server/revisionManager.js';

afterEach(() => {
  vi.useRealTimers();
  query.mockReset();
});

describe('dataset revision refresh', () => {
  it('shares an unfinished lookup across concurrent callers', async () => {
    let finish!: (value: { rows: { ingest_run_id: string }[] }) => void;
    query
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({ rows: [{ max_ts: '2026-11-05' }] });
    const manager = new DatasetRevisionManager();
    const pending = Array.from({ length: 20 }, () => manager.getRevisionToken());
    expect(query).toHaveBeenCalledTimes(1);
    finish({ rows: [{ ingest_run_id: 'synthetic' }] });
    const revisions = await Promise.all(pending);
    expect(new Set(revisions.map((revision) => revision.token)).size).toBe(1);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('keeps the full cache lifetime after a slow lookup finishes', async () => {
    vi.useFakeTimers();
    let finish!: (value: { rows: { ingest_run_id: string }[] }) => void;
    query
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ rows: [{ max_ts: '2026-11-05' }] });
    const manager = new DatasetRevisionManager();
    const pending = manager.getRevisionToken();
    vi.advanceTimersByTime(6_000);
    finish({ rows: [{ ingest_run_id: 'synthetic' }] });
    await pending;
    await manager.getRevisionToken();
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('allows a fresh lookup after a database failure', async () => {
    query
      .mockRejectedValueOnce(new Error('Synthetic database failure'))
      .mockResolvedValueOnce({ rows: [{ ingest_run_id: 'synthetic' }] })
      .mockResolvedValueOnce({ rows: [{ max_ts: '2026-11-05' }] });
    const manager = new DatasetRevisionManager();
    await expect(manager.getRevisionToken()).rejects.toThrow('Synthetic database failure');
    await expect(manager.getRevisionToken()).resolves.toHaveProperty('token');
    expect(query).toHaveBeenCalledTimes(3);
  });
});
