import { describe, expect, it } from 'vitest';

import { assertSafeAssetPath } from '../../scripts/media_catalog_release';

describe('media catalog release asset paths', () => {
  it('accepts canonical repository-relative data paths', () => {
    expect(assertSafeAssetPath('data/media/extracted/example.jpg')).toMatch(
      /data\/media\/extracted\/example\.jpg$/,
    );
  });

  it.each([
    '',
    '/tmp/example.jpg',
    '../data/example.jpg',
    'media/example.jpg',
    'data/media/../example.jpg',
    'data/media/example.jpg\nsecond.jpg',
  ])('rejects unsafe path %j', (assetPath) => {
    expect(() => assertSafeAssetPath(assetPath)).toThrow();
  });
});
