import { test, expect, type APIRequestContext } from '@playwright/test';
import { ZodSchema } from 'zod';
import {
  documentsListResponseSchema,
  documentDetailSchema,
  emailMailboxesResponseSchema,
  emailThreadsResponseSchema,
  entityDetailSchema,
  graphGlobalResponseSchema,
  investigationEvidenceByTypeResponseSchema,
  investigationEvidenceListResponseSchema,
  subjectsListResponseSchema,
  flightsListResponseSchema,
  flightCoOccurrencesResponseSchema,
  timelineEventsResponseSchema,
  blackBookListResponseSchema,
  propertiesListResponseSchema,
  propertyStatsResponseSchema,
  statsResponseSchema,
  healthResponseSchema,
} from '../src/shared/schemas';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const API_BASE_URL = process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`;

const assertSchema = <T>(schema: ZodSchema<T>, payload: unknown, label: string): T => {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
    .join('; ');
  throw new Error(`[DTO contract] ${label} failed schema validation: ${details}`);
};

const waitForOk = async (request: APIRequestContext, url: string, attempts = 4) => {
  let lastStatus: number | null = null;
  for (let index = 0; index < attempts; index += 1) {
    const response = await request.get(url, { timeout: 15000 });
    if (response.ok()) {
      return response;
    }
    lastStatus = response.status();
    if (index < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  throw new Error(`Expected OK from ${url}, last status was ${lastStatus ?? 'unknown'}`);
};

test.describe('API DTO Contracts', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ request }) => {
    test.setTimeout(90_000);
    await waitForOk(request, `${API_BASE_URL}/api/subjects?page=1&limit=1`);
  });

  test('subjects list endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/subjects?page=1&limit=24&sortBy=red_flag&entityType=person`,
    );
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const parsed = assertSchema(subjectsListResponseSchema, body, 'GET /api/subjects');

    expect(Array.isArray(parsed.subjects)).toBe(true);
    expect(typeof parsed.total).toBe('number');
  });

  test('documents list endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/documents?page=1&limit=50&sortBy=red_flag&sortOrder=desc`,
    );
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const parsed = assertSchema(documentsListResponseSchema, body, 'GET /api/documents');

    expect(Array.isArray(parsed.data)).toBe(true);
    expect(parsed.page).toBeGreaterThanOrEqual(1);
  });

  test('investigation case-folder evidence endpoints match shared DTO schemas', async ({
    request,
  }) => {
    test.setTimeout(45_000);
    const invResponse = await request.get(`${API_BASE_URL}/api/investigations?page=1&limit=1`);
    expect(invResponse.ok()).toBeTruthy();
    const invBody = await invResponse.json();
    const investigations = Array.isArray(invBody?.data)
      ? invBody.data
      : Array.isArray(invBody)
        ? invBody
        : [];

    if (investigations.length === 0) {
      test.skip(true, 'No investigations available in test dataset');
      return;
    }

    const investigationId = String(investigations[0].id);

    const listResponse = await request.get(
      `${API_BASE_URL}/api/investigations/${investigationId}/evidence?limit=25&offset=0`,
    );
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();

    if (Array.isArray(listBody)) {
      // Back-compat unpaginated mode: validate as paginated shape after wrapping.
      assertSchema(
        investigationEvidenceListResponseSchema,
        { data: listBody, total: listBody.length, limit: listBody.length, offset: 0 },
        'GET /api/investigations/:id/evidence (array back-compat)',
      );
    } else {
      assertSchema(
        investigationEvidenceListResponseSchema,
        listBody,
        'GET /api/investigations/:id/evidence',
      );
    }

    const byTypeResponse = await request.get(
      `${API_BASE_URL}/api/investigations/${investigationId}/evidence-by-type`,
    );
    expect(byTypeResponse.ok()).toBeTruthy();
    const byTypeBody = await byTypeResponse.json();
    assertSchema(
      investigationEvidenceByTypeResponseSchema,
      byTypeBody,
      'GET /api/investigations/:id/evidence-by-type',
    );
  });

  test('email list/thread metadata endpoints match shared DTO schemas', async ({ request }) => {
    test.setTimeout(60_000);
    const mailboxesResponse = await request.get(`${API_BASE_URL}/api/emails/mailboxes`);
    expect(mailboxesResponse.ok()).toBeTruthy();
    const mailboxesBody = await mailboxesResponse.json();
    const parsedMailboxes = assertSchema(
      emailMailboxesResponseSchema,
      mailboxesBody,
      'GET /api/emails/mailboxes',
    );

    const mailboxId =
      parsedMailboxes.data.find((mailbox) => mailbox.mailboxId !== 'all')?.mailboxId || 'all';
    const threadsResponse = await request.get(
      `${API_BASE_URL}/api/emails/threads?mailboxId=${encodeURIComponent(mailboxId)}&tab=all&limit=25`,
    );
    expect(threadsResponse.ok()).toBeTruthy();
    const threadsBody = await threadsResponse.json();
    const parsedThreads = assertSchema(
      emailThreadsResponseSchema,
      threadsBody,
      'GET /api/emails/threads',
    );

    expect(Array.isArray(parsedThreads.data)).toBe(true);
  });

  test('entity detail endpoint matches shared DTO schema', async ({ request }) => {
    // Fetch first entity ID from the list endpoint
    const listResponse = await request.get(`${API_BASE_URL}/api/entities?page=1&limit=1`);
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    const entities = Array.isArray(listBody?.data)
      ? listBody.data
      : Array.isArray(listBody)
        ? listBody
        : [];
    if (entities.length === 0) {
      test.skip(true, 'No entities available in test dataset');
      return;
    }
    const entityId = String(entities[0].id);

    const response = await request.get(`${API_BASE_URL}/api/entities/${entityId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    assertSchema(entityDetailSchema, body, `GET /api/entities/${entityId}`);
  });

  test('evidence detail endpoint matches shared DTO schema', async ({ request }) => {
    // Fetch first document ID from the list endpoint
    const listResponse = await request.get(`${API_BASE_URL}/api/documents?page=1&limit=1`);
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    const docs = Array.isArray(listBody?.data) ? listBody.data : [];
    if (docs.length === 0) {
      test.skip(true, 'No documents available in test dataset');
      return;
    }
    const docId = String(docs[0].id);

    const response = await request.get(`${API_BASE_URL}/api/evidence/${docId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    assertSchema(documentDetailSchema, body, `GET /api/evidence/${docId}`);
  });

  test('graph global endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/graph/global?limit=10`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const parsed = assertSchema(graphGlobalResponseSchema, body, 'GET /api/graph/global');
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(Array.isArray(parsed.edges)).toBe(true);
  });

  test('flights list endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/flights?page=1&limit=10`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const parsed = assertSchema(flightsListResponseSchema, body, 'GET /api/flights');
    expect(Array.isArray(parsed.flights)).toBe(true);
    expect(typeof parsed.total).toBe('number');
  });

  test('flights co-occurrences endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/api/flights/co-occurrences?minFlights=2&limit=10`,
    );
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    assertSchema(flightCoOccurrencesResponseSchema, body, 'GET /api/flights/co-occurrences');
  });

  test('timeline events endpoint matches shared DTO schema', async ({ request }) => {
    test.setTimeout(30_000);
    const response = await request.get(`${API_BASE_URL}/api/timeline`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const events = assertSchema(timelineEventsResponseSchema, body, 'GET /api/timeline');
    expect(Array.isArray(events)).toBe(true);
    if (events.length > 0) {
      expect(typeof events[0].id).toBe('string');
      expect(typeof events[0].title).toBe('string');
    }
  });

  test('black book list endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/black-book?letter=A&limit=20`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const parsed = assertSchema(blackBookListResponseSchema, body, 'GET /api/black-book');
    expect(Array.isArray(parsed.data)).toBe(true);
    expect(typeof parsed.total).toBe('number');
  });

  test('properties list and stats endpoints match shared DTO schemas', async ({ request }) => {
    const listResponse = await request.get(`${API_BASE_URL}/api/properties?page=1&limit=10`);
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    const parsed = assertSchema(propertiesListResponseSchema, listBody, 'GET /api/properties');
    expect(Array.isArray(parsed.properties)).toBe(true);

    const statsResponse = await request.get(`${API_BASE_URL}/api/properties/stats`);
    expect(statsResponse.ok()).toBeTruthy();
    const statsBody = await statsResponse.json();
    assertSchema(propertyStatsResponseSchema, statsBody, 'GET /api/properties/stats');
  });

  test('stats endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/stats`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const parsed = assertSchema(statsResponseSchema, body, 'GET /api/stats');
    expect(parsed.totalEntities).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(parsed.likelihoodDistribution)).toBe(true);
    expect(typeof parsed._meta.degraded).toBe('boolean');
  });

  test('health endpoint matches shared DTO schema', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/stats/health`);
    // Health may return 200 or 503 (degraded) — both are valid responses
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    assertSchema(healthResponseSchema, body, 'GET /api/stats/health');
  });
});
