import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import mediaPdfRoutes from '../server/routes/mediaPdf';

const buildApp = () => {
  const app = express();
  app.use('/api/media', mediaPdfRoutes);
  return app;
};

describe('media PDF downloads', () => {
  it('serves a preserved source PDF as an attachment with its filename', async () => {
    const response = await request(buildApp()).head('/api/media/pdf').query({
      filePath: "data/originals/Jeffrey Epstein's Black Book.pdf",
      download: '1',
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="Jeffrey Epstein\'s Black Book.pdf"',
    );
  });
});
