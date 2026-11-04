import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import mediaPdfRoutes from '../server/routes/mediaPdf';

const buildApp = () => {
  const app = express();
  app.use('/api/media', mediaPdfRoutes);
  return app;
};

const filename = "Researcher's source.pdf";
const pdf = Buffer.from('%PDF-1.4\n% Synthetic download fixture\n%%EOF\n');
let fixtureDirectory: string;
let filePath: string;

beforeAll(() => {
  const dataRoot = path.resolve('data');
  mkdirSync(dataRoot, { recursive: true });
  fixtureDirectory = mkdtempSync(path.join(dataRoot, 'pdf-download-test-'));
  filePath = path.join(fixtureDirectory, filename);
  writeFileSync(filePath, pdf);
});

afterAll(() => {
  if (fixtureDirectory) rmSync(fixtureDirectory, { recursive: true, force: true });
});

describe('media PDF downloads', () => {
  it('serves a preserved source PDF as an attachment with its filename', async () => {
    const response = await request(buildApp()).head('/api/media/pdf').query({
      filePath,
      download: '1',
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe(`attachment; filename="${filename}"`);
  });

  it('downloads the original bytes without changing the source', async () => {
    const response = await request(buildApp()).get('/api/media/pdf').query({
      filePath,
      download: '1',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(pdf);
    expect(readFileSync(filePath)).toEqual(pdf);
  });
});
