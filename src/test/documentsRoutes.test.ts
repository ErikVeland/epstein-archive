import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocumentLineage = vi.fn();
const getDocumentById = vi.fn();
const getDocuments = vi.fn();

process.env.JWT_SECRET = 'test-secret-for-documents-routes';

vi.mock('../server/db/documentsRepository.js', () => ({
  documentsRepository: {
    getDocuments,
    getDocumentById,
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
    getDocumentById.mockReset();
    getDocuments.mockReset();
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

  it('passes a source collection as an exact filter instead of full-text search', async () => {
    getDocuments.mockResolvedValue({ documents: [], total: 0, page: 1, pageSize: 50 });

    const response = await request(buildApp()).get('/api/documents?source=Court%20Case%20Evidence');

    expect(response.status).toBe(200);
    expect(getDocuments).toHaveBeenCalledWith(
      1,
      50,
      expect.objectContaining({ source: 'Court Case Evidence', search: undefined }),
    );
  });

  it('forces an attachment filename for original-document downloads', async () => {
    getDocumentById.mockResolvedValue({
      id: 42,
      fileName: 'source-email.eml',
      evidenceType: 'email',
      content: 'Archived email body',
      metadata: { subject: 'Archived message' },
    });

    const response = await request(buildApp()).get(
      '/api/documents/42/file?variant=original&download=1',
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment;');
    expect(response.headers['content-disposition']).toContain('source-email.eml');
  });
});
