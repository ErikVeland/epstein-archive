import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocumentLineage = vi.fn();

process.env.JWT_SECRET = 'test-secret-for-documents-routes';

vi.mock('../server/db/documentsRepository.js', () => ({
  documentsRepository: {
    getDocuments: vi.fn(),
    getDocumentById: vi.fn(),
    getRelatedDocuments: vi.fn(),
  },
}));

vi.mock('../server/db/documentPagesRepository.js', () => ({
  documentPagesRepository: {
    getDocumentPages: vi.fn(),
  },
}));

vi.mock('../server/db/documentAnnotationsRepository.js', () => ({
  documentAnnotationsRepository: {
    getByDocumentId: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../server/db/dataQualityRepository.js', () => ({
  dataQualityRepository: {
    getDocumentLineage,
  },
}));

vi.mock('../server/mappers/documentsDtoMapper.js', () => ({
  mapDocumentsListResponseDto: vi.fn((value) => value),
}));

describe('documentsRoutes lineage endpoint', async () => {
  const { default: documentsRoutes } = await import('../server/routes/documentsRoutes.js');

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/documents', documentsRoutes);
    app.use(
      (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        res.status(500).json({ error: err.message });
      },
    );
    return app;
  };

  beforeEach(() => {
    getDocumentLineage.mockReset();
  });

  it('returns lineage payload for a valid document id', async () => {
    getDocumentLineage.mockResolvedValue({
      document: { id: 42, file_name: 'record.pdf' },
      provenance: { status: 'verified', score: 90 },
      provenanceEvents: [{ id: 1, event_type: 'ingest_discovered' }],
      auditTrail: [],
      childDocuments: [],
      originalDocument: null,
    });

    const response = await request(buildApp()).get('/api/documents/42/lineage');

    expect(response.status).toBe(200);
    expect(getDocumentLineage).toHaveBeenCalledWith(42);
    expect(response.body.provenance.status).toBe('verified');
  });

  it('returns 404 when lineage is unavailable', async () => {
    getDocumentLineage.mockResolvedValue(null);

    const response = await request(buildApp()).get('/api/documents/42/lineage');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/lineage/i);
  });
});
