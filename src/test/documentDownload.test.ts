import { describe, expect, it } from 'vitest';
import { getOriginalDocumentUrl } from '../client/utils/documentDownload';

describe('original document download URLs', () => {
  it('requests the original variant and an attachment response', () => {
    expect(getOriginalDocumentUrl('doc/42', { download: true })).toBe(
      '/api/documents/doc%2F42/file?variant=original&download=1',
    );
  });

  it('pins cited downloads to their verified source asset', () => {
    const sha256 = 'a'.repeat(64);
    expect(getOriginalDocumentUrl(42, { download: true, assetSha256: sha256 })).toBe(
      `/api/documents/42/file?variant=original&assetSha256=${sha256}&download=1`,
    );
  });
});
