import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { entityShareDetails } from '../../src/shared/entityShare';
import { renderEntityShareImage } from '../../src/server/services/entityShareImage';

describe('Individual archive sharing', () => {
  it('uses a stable profile URL, matching image, name and role', () => {
    const details = entityShareDetails({
      id: 17491,
      fullName: 'Chuck Schumer',
      primaryRole: 'Senator',
    });
    expect(details.url).toBe('https://epstein.academy/entity/17491');
    expect(details.image).toBe('https://epstein.academy/api/entities/17491/share-image');
    expect(details.title).toBe('Chuck Schumer · Senator');
    expect(details.description).toContain('does not establish wrongdoing');
    expect(
      entityShareDetails({ id: 12, fullName: 'Other Person', primaryRole: 'Unknown' }).title,
    ).toBe('Other Person');
  });
  it('renders a social-sized PNG with no portrait and XML-sensitive names', async () => {
    const image = await renderEntityShareImage({
      id: 12,
      fullName: 'A & B <Example>',
      primaryRole: 'Researcher',
    });
    expect(await sharp(image).metadata()).toMatchObject({
      width: 1200,
      height: 630,
      format: 'png',
    });
  });
  it('composites the portrait and tolerates a missing portrait file', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'archive-share-'));
    try {
      const portraitPath = path.join(directory, 'portrait.png');
      await writeFile(
        portraitPath,
        await sharp({ create: { width: 50, height: 50, channels: 3, background: '#ff0000' } })
          .png()
          .toBuffer(),
      );
      const entity = {
        id: 12,
        fullName: 'A long profile name that needs wrapping safely',
        primaryRole: 'Archive profile',
      };
      const image = await renderEntityShareImage(entity, portraitPath);
      const pixel = await sharp(image)
        .extract({ left: 200, top: 200, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer();
      expect([...pixel]).toEqual([255, 0, 0]);
      const fallback = await renderEntityShareImage(entity, path.join(directory, 'missing.png'));
      expect(await sharp(fallback).metadata()).toMatchObject({ width: 1200, height: 630 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
