import { describe, expect, it } from 'vitest';

import {
  assertSafeAssetPath,
  mediaReleaseVerificationPlan,
} from '../../scripts/media_catalog_release';

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

describe('media catalog release verification transaction', () => {
  it('creates its temporary workspace before entering read-only mode', () => {
    const [prepareTemporaryIds, beginReadOnly] = mediaReleaseVerificationPlan();

    expect(prepareTemporaryIds).toContain('CREATE TEMP TABLE media_release_ids');
    expect(prepareTemporaryIds).toContain('ON COMMIT PRESERVE ROWS');
    expect(beginReadOnly).toBe('BEGIN READ ONLY');
  });
});
