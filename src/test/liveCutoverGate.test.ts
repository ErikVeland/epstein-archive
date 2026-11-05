import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { describe, expect, it } from 'vitest';

async function runGate(degraded = false, evidenceFails = false) {
  const server = createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    let body: unknown = {};
    let status = 200;
    if (url.pathname === '/api/health/ready')
      body = { status: 'ok', checks: { data: { entities: 2, documents: 1 } } };
    else if (url.pathname === '/api/health') body = { status: 'ok' };
    else if (url.pathname === '/api/_meta/db') body = { dialect: 'postgres' };
    else if (url.pathname === '/api/analytics/enhanced')
      body = { totalCounts: { entities: 2, documents: 1 } };
    else if (url.pathname === '/api/documents') body = { data: [{ id: '42' }], total: 1 };
    else if (url.pathname === '/api/emails/threads')
      body = { data: [{ id: '1' }], meta: { total: 1 } };
    else if (url.pathname === '/api/entities/subjects')
      body = { data: [{ name: 'Jeffrey Epstein' }, { name: 'Donald Trump' }] };
    else if (url.pathname === '/api/search') body = { entities: [] };
    else if (url.pathname === '/api/stats/health/deep')
      body = {
        status: degraded ? 'degraded' : 'healthy',
        checks: {
          memory: { status: degraded ? 'warn' : 'pass' },
          backup_status: { status: 'pass' },
        },
      };
    else if (url.pathname === '/api/evidence/42') {
      body = { id: '42' };
      status = evidenceFails ? 500 : 200;
    } else status = 404;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address');
    return await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ['--import', 'tsx/esm', 'scripts/verify_live_cutover.ts'],
        {
          env: { ...process.env, DEPLOY_VERIFY_URL: `http://127.0.0.1:${address.port}` },
        },
      );
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += String(chunk);
      });
      child.stderr.on('data', (chunk) => {
        output += String(chunk);
      });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, output }));
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('live release verification', () => {
  it('passes only when the full public contract is healthy', async () => {
    expect((await runGate()).code).toBe(0);
  });
  it('rejects degraded deep health even when HTTP status is 200', async () => {
    expect((await runGate(true)).code).toBe(1);
  });
  it('rejects an evidence-access failure despite healthy aggregate endpoints', async () => {
    expect((await runGate(false, true)).code).toBe(1);
  });
});
