import { test, expect } from '@playwright/test';
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

const waitForOk = async (
  request: Parameters<Parameters<typeof test.beforeAll>[0]>[0]['request'],
  url: string,
  attempts = 4,
) => {
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
});
