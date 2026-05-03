import type { Page, Route } from '@playwright/test';

export const FIXTURE_ENTITY_ID = '101';
export const FIXTURE_DOCUMENT_ID = 'fixture-doc-1';
export const FIXTURE_THREAD_ID = 'thread-fixture-1';
export const FIXTURE_MESSAGE_ID = 'message-fixture-1';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

export const prepareDesktopPage = async (page: Page) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
    window.localStorage.setItem('board_onboarding_seen', 'true');
  });
};

export const prepareMobilePage = async (page: Page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
    window.localStorage.setItem('board_onboarding_seen', 'true');
  });
};

export const mockHealthyApi = async (page: Page) => {
  const readinessPayload = {
    status: 'ok',
    timestamp: '2024-01-01T00:00:00.000Z',
    checks: {
      db: { ok: true, latencyMs: 1, dialect: 'postgres' },
      data: { ok: true, entities: 1, documents: 1, latencyMs: 1 },
      pool: { total: 1, idle: 1, waiting: 0, max: 10 },
      readiness: { mode: 'normal', timeoutMs: 1000 },
    },
    durationMs: 1,
  };

  await page.route('**/api/health/ready', (route) => json(route, readinessPayload));
  await page.route('**/api/health', (route) =>
    json(route, {
      status: 'ok',
      timestamp: '2024-01-01T00:00:00.000Z',
    }),
  );
};

const subjectsFixture = {
  subjects: [
    {
      id: FIXTURE_ENTITY_ID,
      name: 'Ada Lovelace',
      role: 'Analyst',
      shortBio: 'Fixture-backed entity for deterministic route tests.',
      stats: {
        mentions: 12,
        documents: 3,
        distinctSources: 2,
        verifiedMedia: 0,
      },
      forensics: {
        riskLevel: 'MEDIUM',
        evidenceLadder: 'L2',
        redFlagObjective: 2,
        redFlagSubjective: 1,
        signalStrength: {
          exposure: 0.6,
          connectivity: 0.4,
          corroboration: 0.7,
        },
        driverLabels: ['fixture'],
      },
    },
  ],
  total: 1,
};

const entityFixture = {
  id: FIXTURE_ENTITY_ID,
  fullName: 'Ada Lovelace',
  primaryRole: 'Analyst',
  bio: 'Fixture-backed bio',
  description: 'Fixture-backed description',
  mentions: 12,
  likelihoodLevel: 'MEDIUM',
  redFlagRating: 2,
  fileReferences: [],
  significantPassages: [],
  photos: [],
  evidenceTypes: ['correspondence'],
  blackBookEntries: [],
  birthDate: null,
  deathDate: null,
};

const entityEvidenceFixture = {
  entity: {
    id: FIXTURE_ENTITY_ID,
    name: 'Ada Lovelace',
  },
  evidence: [],
  stats: {
    totalEvidence: 0,
    typeBreakdown: [],
  },
};

const documentListItemFixture = {
  id: FIXTURE_DOCUMENT_ID,
  fileName: 'fixture-doc-1.txt',
  title: 'Fixture Document',
  fileType: 'text/plain',
  fileSize: 1024,
  dateCreated: '2024-01-01T00:00:00.000Z',
  evidenceType: 'report',
  metadata: {},
  redFlagRating: 1,
  wordCount: 120,
  entitiesCount: 1,
  keyEntities: [{ id: FIXTURE_ENTITY_ID, name: 'Ada Lovelace' }],
  sourceType: 'fixture',
  previewText: 'Fixture preview text',
  previewKind: 'fallback',
  whyFlagged: 'Fixture route coverage',
  sourceDocumentId: null,
  sourceHash: null,
  extractionMethod: 'manual',
  confidence: 1,
  reviewState: 'accepted',
  lastVerifiedAt: '2024-01-01T00:00:00.000Z',
  provenanceStatus: 'complete',
};

const documentDetailFixture = {
  id: FIXTURE_DOCUMENT_ID,
  fileName: 'fixture-doc-1.txt',
  filePath: '/fixtures/fixture-doc-1.txt',
  fileType: 'text/plain',
  fileSize: 1024,
  dateCreated: '2024-01-01T00:00:00.000Z',
  title: 'Fixture Document',
  content: 'Fixture document body.\n\nThis is enough text to render clean mode.',
  contentRefined: 'Fixture document body.\n\nThis is enough text to render clean mode.',
  contentPreview: 'Fixture document body',
  metadata: {},
  evidenceType: 'report',
  redFlagRating: 1,
  sourceCollection: 'fixture',
  fileUrl: null,
  originalFileUrl: null,
  entities: [{ id: FIXTURE_ENTITY_ID, name: 'Ada Lovelace', mentions: 1, contexts: [] }],
  sourceDocumentId: null,
  sourceHash: null,
  extractionMethod: 'manual',
  confidence: 1,
  reviewState: 'accepted',
  lastVerifiedAt: '2024-01-01T00:00:00.000Z',
  provenanceStatus: 'complete',
};

export const emailEvidenceDocumentFixture = {
  ...documentDetailFixture,
  id: FIXTURE_MESSAGE_ID,
  fileName: 'fixture-email.eml',
  filePath: '/fixtures/fixture-email.eml',
  title: 'Fixture Email Evidence',
  content: 'Email body content for deterministic navigation coverage.',
  contentRefined: 'Email body content for deterministic navigation coverage.',
  contentPreview: 'Email body content',
  evidenceType: 'email',
};

const mailboxesFixture = {
  revisionKey: 'fixture-rev-1',
  data: [
    {
      mailboxId: 'all',
      entityId: null,
      displayName: 'All',
      totalThreads: 1,
      totalMessages: 1,
      lastActivityAt: '2024-01-01T00:00:00.000Z',
      riskSummary: 'low',
      isJunkSuppressed: false,
      isVip: false,
      isVerified: true,
    },
  ],
};

const threadsFixture = {
  data: [
    {
      threadId: FIXTURE_THREAD_ID,
      subject: 'Fixture thread subject',
      participants: ['ada@example.test', 'archive@example.test'],
      participantCount: 2,
      lastMessageAt: '2024-01-01T00:00:00.000Z',
      snippet: 'Fixture thread snippet',
      messageCount: 1,
      hasAttachments: false,
      linkedEntityIds: [Number(FIXTURE_ENTITY_ID)],
      risk: 1,
      ladder: 'L2',
      confidence: 0.9,
    },
  ],
  meta: {
    total: 1,
    limit: 50,
    hasMore: false,
    nextCursor: null,
  },
};

const threadDetailFixture = {
  threadId: FIXTURE_THREAD_ID,
  subject: 'Fixture thread subject',
  messages: [
    {
      messageId: FIXTURE_MESSAGE_ID,
      threadId: FIXTURE_THREAD_ID,
      subject: 'Fixture thread subject',
      from: 'ada@example.test',
      to: ['archive@example.test'],
      cc: [],
      date: '2024-01-01T00:00:00.000Z',
      snippet: 'Fixture thread snippet',
      flags: { hasAttachments: false },
      attachmentsMeta: [],
      linkedEntities: [
        {
          entityId: Number(FIXTURE_ENTITY_ID),
          name: 'Ada Lovelace',
          role: 'Author',
        },
      ],
      ingestRunId: 101,
      pipelineVersion: 'fixture',
      confidence: 0.9,
      ladder: 'L2',
      wasAgentic: false,
      redFlagRating: 1,
    },
  ],
};

const messageBodyFixture = {
  messageId: FIXTURE_MESSAGE_ID,
  cleanedText: 'Fixture cleaned email body',
  cleanedHtml: '<p>Fixture cleaned email body</p>',
  extractedLinks: [],
  extractedEntities: [],
  mimeWarnings: [],
  parseStatus: 'success',
  ingestRunId: 101,
  pipelineVersion: 'fixture',
  sourceFile: { fileName: 'fixture-email.eml', filePath: '/fixtures/fixture-email.eml' },
  rawAvailable: true,
};

export const mockPeopleEntityApis = async (page: Page) => {
  await page.route('**/api/subjects**', (route) => json(route, subjectsFixture));
  await page.route(`**/api/entities/${FIXTURE_ENTITY_ID}/evidence**`, (route) =>
    json(route, entityEvidenceFixture),
  );
  await page.route(`**/api/entities/${FIXTURE_ENTITY_ID}/media`, (route) => json(route, []));
  await page.route(`**/api/entities/${FIXTURE_ENTITY_ID}/documents**`, (route) =>
    json(route, { data: [], total: 0 }),
  );
  await page.route(`**/api/entities/${FIXTURE_ENTITY_ID}/investigations**`, (route) =>
    json(route, []),
  );
  await page.route(`**/api/entities/${FIXTURE_ENTITY_ID}`, (route) => json(route, entityFixture));
};

export const mockDocumentApis = async (
  page: Page,
  options: { id?: string; detail?: Record<string, unknown> } = {},
) => {
  const documentId = options.id || FIXTURE_DOCUMENT_ID;
  const detail = options.detail || documentDetailFixture;

  await page.route('**/api/documents?page=**', (route) =>
    json(route, {
      data: [documentListItemFixture],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      searchMeta: {
        requestedMode: 'lexical',
        effectiveMode: 'lexical',
        semanticAvailable: false,
      },
    }),
  );
  await page.route(`**/api/documents/${documentId}/related**`, (route) => json(route, []));
  await page.route(`**/api/documents/${documentId}/thread**`, (route) =>
    json(route, { threadId: FIXTURE_THREAD_ID, messages: [] }),
  );
  await page.route(`**/api/documents/${documentId}`, (route) => json(route, detail));
};

export const mockEmailApis = async (page: Page) => {
  await page.route('**/api/emails/mailboxes**', (route) => json(route, mailboxesFixture));
  await page.route('**/api/emails/threads?**', (route) => json(route, threadsFixture));
  await page.route(`**/api/emails/threads/${FIXTURE_THREAD_ID}`, (route) =>
    json(route, threadDetailFixture),
  );
  await page.route(`**/api/emails/messages/${FIXTURE_MESSAGE_ID}/body**`, (route) =>
    json(route, messageBodyFixture),
  );
  await page.route(`**/api/emails/messages/${FIXTURE_MESSAGE_ID}/thread`, (route) =>
    json(route, { messageId: FIXTURE_MESSAGE_ID, threadId: FIXTURE_THREAD_ID }),
  );
};
