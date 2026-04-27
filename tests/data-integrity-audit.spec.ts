import { expect, test, type APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const API_BASE_URL = process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`;

/**
 * Helper to fetch a batch of entities.
 */
async function getEntitySample(request: APIRequestContext, limit: number = 20) {
  const res = await request.get(
    `${API_BASE_URL}/api/entities?limit=${limit}&sortBy=mentions&sortOrder=desc`,
  );
  expect(res.ok()).toBe(true);
  const body = await res.json();
  const items: Record<string, unknown>[] = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body)
      ? body
      : [];
  return items;
}

test.describe('Data Integrity Audits', () => {
  test.describe.configure({ mode: 'parallel' });
  test.setTimeout(120_000);

  test('Invariant 1: entities with verifiedMedia > 0 have non-empty /media endpoint', async ({
    request,
  }) => {
    const subjectsRes = await request.get(`${API_BASE_URL}/api/subjects?limit=50&sortBy=mentions`);
    expect(subjectsRes.ok()).toBe(true);
    const subjectsBody = await subjectsRes.json();
    const subjects: Record<string, unknown>[] = Array.isArray(subjectsBody?.subjects)
      ? subjectsBody.subjects
      : [];

    // Find subjects that report having verified media
    const withMedia = subjects
      .filter((subject) => {
        const stats = subject.stats as Record<string, unknown> | undefined;
        return Number(stats?.verifiedMedia || 0) > 0;
      })
      .slice(0, 10);

    if (withMedia.length === 0) {
      test.skip(true, 'No entities with verified media found in test sample');
      return;
    }

    for (const subject of withMedia) {
      const mediaRes = await request.get(`${API_BASE_URL}/api/entities/${subject.id}/media`);
      expect(mediaRes.ok()).toBe(true);
      const mediaBody = await mediaRes.json();
      expect(
        Array.isArray(mediaBody) && mediaBody.length > 0,
        `Entity ${String(subject.id)} (${String(subject.name)}) reports verifiedMedia but /media returned empty`,
      ).toBe(true);
    }
  });

  test('Invariant 2: every entity from list is individually retrievable', async ({ request }) => {
    const entities = await getEntitySample(request, 15);
    if (entities.length === 0) {
      test.skip(true, 'No entities available');
      return;
    }

    for (const entity of entities) {
      if (!entity.id) continue;
      const detailRes = await request.get(`${API_BASE_URL}/api/entities/${entity.id}`);
      expect(
        detailRes.status(),
        `Entity ${entity.id} from list should return 200 on detail route, got ${detailRes.status()}`,
      ).toBe(200);
    }
  });

  test('Invariant 3: flight-linked entities do not 500 on /flights tab', async ({ request }) => {
    // Just test that the flight endpoint resolves without error for top entities
    const entities = await getEntitySample(request, 10);
    if (entities.length === 0) return;

    for (const entity of entities) {
      if (!entity.id) continue;
      const flightRes = await request.get(`${API_BASE_URL}/api/entities/${entity.id}/flights`);
      expect(
        flightRes.status(),
        `Entity ${entity.id} returned ${flightRes.status()} on /flights`,
      ).not.toBe(500);
      expect(flightRes.ok()).toBe(true);
    }
  });

  test('Invariant 4: entity IDs from list are valid for all tab endpoints', async ({ request }) => {
    // This catches "mixed ID type confusion" where some routes expect a different format
    const entities = await getEntitySample(request, 3); // Test just top 3 to keep it fast
    if (entities.length === 0) return;

    for (const entity of entities) {
      if (!entity.id) continue;
      const endpoints = [
        `/api/entities/${entity.id}/media`,
        `/api/entities/${entity.id}/flights`,
        `/api/entities/${entity.id}/properties`,
        `/api/entities/${entity.id}/transactions`,
        `/api/entities/${entity.id}/claims`,
        `/api/entities/${entity.id}/documents`,
        `/api/entities/${entity.id}/investigations`,
      ];

      for (const endpoint of endpoints) {
        const res = await request.get(`${API_BASE_URL}${endpoint}`);
        expect(
          res.status(),
          `Endpoint ${endpoint} failed with status ${res.status()} for valid entity ID ${entity.id}`,
        ).not.toBe(500);
        expect(res.status()).toBe(200);
      }
    }
  });
});
