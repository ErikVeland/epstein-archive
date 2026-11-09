import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pg from 'pg';
import sharp from 'sharp';
import { MediaService } from '../../../src/server/services/MediaService';

const roots: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('media thumbnail output paths', () => {
  it.each(['absolute', 'legacy-data'] as const)(
    'writes a thumbnail to the requested %s directory',
    async (format) => {
      const root = mkdtempSync(path.join(tmpdir(), 'media-thumbnail-'));
      roots.push(root);
      vi.spyOn(process, 'cwd').mockReturnValue(root);
      const imagePath = path.join(root, 'source.jpg');
      await sharp({ create: { width: 600, height: 400, channels: 3, background: '#336699' } })
        .jpeg()
        .toFile(imagePath);
      const expectedPath = path.join(root, 'data', 'thumbnails', 'thumb_source.jpg');
      const outputDir = format === 'absolute' ? path.dirname(expectedPath) : '/data/thumbnails';
      const pool = new pg.Pool();
      try {
        const service = new MediaService(pool);
        const result = await service.generateThumbnail(imagePath, outputDir);
        expect(path.resolve(root, result)).toBe(expectedPath);
        const thumbnail = await sharp(expectedPath).metadata();
        expect(thumbnail.width).toBe(300);
        expect(thumbnail.height).toBe(300);
      } finally {
        await pool.end();
      }
    },
  );
});
