import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupService } from '../server/services/BackupService.js';

vi.mock('../server/db/healthQueries.js', () => ({
  pingDatabase: async () => undefined,
  getEntityAndDocumentCounts: async () => ({ entities: 10, documents: 20 }),
  getSampleEntityWithMentions: async () => ({ id: 1 }),
  getCurrentDatabaseSizeBytes: async () => 1024,
  getCriticalTableCounts: async (tables: string[]) =>
    Object.fromEntries(tables.map((table) => [table, { ok: true, count: 10 }])),
}));
vi.mock('node:v8', () => ({ getHeapStatistics: () => ({ heap_size_limit: 512 * 1024 * 1024 }) }));

describe('deep health', async () => {
  vi.stubEnv('JWT_SECRET', 'deep-health-regression-test');
  const { default: statsRoutes } = await import('../server/routes/stats.js');
  const app = express().use('/api/stats', statsRoutes);
  const MB = 1024 * 1024;

  beforeEach(() => {
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      heapUsed: 95 * MB,
      heapTotal: 100 * MB,
      rss: 200 * MB,
      external: 0,
      arrayBuffers: 0,
    });
    vi.spyOn(BackupService, 'listBackups').mockReturnValue([
      { filename: 'backup.zip', size: 100, createdAt: new Date().toISOString() },
    ]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps a small heap healthy when V8 has room to grow', async () => {
    const response = await request(app).get('/api/stats/health/deep');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.checks.memory.status).toBe('pass');
  });

  it('reports real heap pressure against the V8 heap limit', async () => {
    vi.mocked(process.memoryUsage).mockReturnValue({
      heapUsed: 500 * MB,
      heapTotal: 510 * MB,
      rss: 700 * MB,
      external: 0,
      arrayBuffers: 0,
    });
    const response = await request(app).get('/api/stats/health/deep');
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.memory.status).toBe('warn');
  });

  it('reports high resident memory even when the heap is small', async () => {
    vi.mocked(process.memoryUsage).mockReturnValue({
      heapUsed: 95 * MB,
      heapTotal: 100 * MB,
      rss: 1450 * MB,
      external: 0,
      arrayBuffers: 0,
    });
    const response = await request(app).get('/api/stats/health/deep');
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.memory.status).toBe('warn');
  });

  it('reports missing backups as degraded rather than healthy', async () => {
    vi.mocked(BackupService.listBackups).mockReturnValue([]);
    const response = await request(app).get('/api/stats/health/deep');
    expect(response.body.status).toBe('degraded');
    expect(response.body.checks.backup_status.status).toBe('warn');
  });
});
