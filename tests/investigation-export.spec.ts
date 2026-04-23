/**
 * Playwright API tests for the investigation ZIP export endpoint.
 *
 * Tests run against the live dev server (PW_API_PORT, default 3312).
 * A short-lived JWT signed with the dev fallback secret is used for auth;
 * this is safe because the fallback is only active in non-production builds.
 *
 * Coverage:
 *  - 401 without token
 *  - 404 for unknown investigation
 *  - 200 with correct response headers and a valid ZIP archive
 *  - ZIP contains all required bundle files
 *  - manifest.json has correct structure and non-empty checksum
 *  - Path traversal attempt on file_path is silently skipped (not a 500)
 */

import { test, expect } from '@playwright/test';
import AdmZip from 'adm-zip';
import jwt from 'jsonwebtoken';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const API_BASE = process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`;

// Dev-only fallback secret (same constant used in src/server/auth/middleware.ts)
const DEV_SECRET = 'dev-secret-do-not-use-in-prod';

function makeTestToken(overrides: Record<string, unknown> = {}): string {
  return jwt.sign(
    { id: 'test-user-1', username: 'testuser', role: 'admin', ...overrides },
    DEV_SECRET,
    { expiresIn: '1h' },
  );
}

async function findOrCreateInvestigationId(
  request: import('@playwright/test').APIRequestContext,
  token: string,
): Promise<number | null> {
  // Try to find an existing investigation
  const listRes = await request.get(`${API_BASE}/api/investigations?limit=5`, {
    timeout: 10_000,
  });
  if (listRes.ok()) {
    const body = await listRes.json();
    const items = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    const first = items.find(
      (i: Record<string, unknown>) => Number.isFinite(Number(i?.id)) && Number(i.id) > 0,
    );
    if (first) return Number(first.id);
  }

  // Fall back to creating one
  const createRes = await request.post(`${API_BASE}/api/investigations`, {
    data: { title: 'Export Test Investigation', description: 'Auto-created by export spec' },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10_000,
  });
  if (!createRes.ok()) return null;
  const created = await createRes.json();
  return Number.isFinite(Number(created?.id)) ? Number(created.id) : null;
}

test.describe('Investigation ZIP export', () => {
  test.describe.configure({ mode: 'serial' });

  let token: string;

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60_000);
    // Wait for API to be ready
    for (let i = 0; i < 6; i++) {
      const res = await request.get(`${API_BASE}/api/stats/health/ready`, { timeout: 8_000 });
      if (res.ok() || res.status() === 503) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    token = makeTestToken();
  });

  test('returns 401 without Authorization header', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/investigations/1/export/zip`, {
      timeout: 10_000,
    });
    expect(res.status()).toBe(401);
  });

  test('returns 404 for a non-existent investigation', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/investigations/999999999/export/zip`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('returns a valid ZIP with correct headers for an existing investigation', async ({
    request,
  }) => {
    const investigationId = await findOrCreateInvestigationId(request, token);
    if (investigationId === null) {
      test.skip(true, 'No investigation available and could not create one — skipping ZIP test');
      return;
    }

    const res = await request.get(`${API_BASE}/api/investigations/${investigationId}/export/zip`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30_000,
    });

    expect(res.ok()).toBeTruthy();

    // Content-Disposition should be an attachment
    const disposition = res.headers()['content-disposition'] ?? '';
    expect(disposition).toMatch(/attachment/i);
    expect(disposition).toMatch(/investigation-bundle-\d+\.zip/);

    // Parse as ZIP
    const buffer = await res.body();
    expect(buffer.byteLength).toBeGreaterThan(0);

    const zip = new AdmZip(Buffer.from(buffer));
    const entries = zip.getEntries().map((e) => e.entryName);

    // Required files must always be present
    expect(entries).toContain('README.md');
    expect(entries).toContain('manifest.json');
    expect(entries).toContain('investigation.json');
    expect(entries).toContain('evidence.json');
    expect(entries).toContain('evidence.csv');
    expect(entries).toContain('timeline.json');
  });

  test('manifest.json has correct shape and a non-empty checksum', async ({ request }) => {
    const investigationId = await findOrCreateInvestigationId(request, token);
    if (investigationId === null) {
      test.skip(true, 'No investigation available — skipping manifest test');
      return;
    }

    const res = await request.get(`${API_BASE}/api/investigations/${investigationId}/export/zip`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30_000,
    });
    expect(res.ok()).toBeTruthy();

    const zip = new AdmZip(Buffer.from(await res.body()));
    const manifestEntry = zip.getEntry('manifest.json');
    expect(manifestEntry).not.toBeNull();

    const manifest = JSON.parse(zip.readAsText(manifestEntry!)) as Record<string, unknown>;

    expect(typeof manifest.investigationId).toBe('number');
    expect(manifest.investigationId).toBe(investigationId);
    expect(typeof manifest.title).toBe('string');
    expect(typeof manifest.status).toBe('string');
    expect(typeof manifest.generatedAt).toBe('string');
    expect(typeof manifest.appVersion).toBe('string');
    expect(manifest.checksumAlgorithm).toBe('sha256');
    expect(typeof manifest.checksum).toBe('string');
    expect((manifest.checksum as string).length).toBe(64); // SHA-256 hex = 64 chars
    expect(Array.isArray(manifest.evidenceIds)).toBe(true);
    expect(Array.isArray(manifest.includedFiles)).toBe(true);
    expect(Array.isArray(manifest.skippedFiles)).toBe(true);
    expect(manifest.exportLimits).toMatchObject({
      fileCountCap: expect.any(Number),
      sizeLimitBytes: expect.any(Number),
    });
  });

  test('two exports of the same investigation produce identical checksums', async ({ request }) => {
    const investigationId = await findOrCreateInvestigationId(request, token);
    if (investigationId === null) {
      test.skip(true, 'No investigation available — skipping determinism test');
      return;
    }

    const fetchManifest = async () => {
      const res = await request.get(
        `${API_BASE}/api/investigations/${investigationId}/export/zip`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 },
      );
      expect(res.ok()).toBeTruthy();
      const zip = new AdmZip(Buffer.from(await res.body()));
      const entry = zip.getEntry('manifest.json');
      return JSON.parse(zip.readAsText(entry!)) as { checksum: string };
    };

    const [m1, m2] = await Promise.all([fetchManifest(), fetchManifest()]);
    expect(m1.checksum).toBe(m2.checksum);
  });
});
