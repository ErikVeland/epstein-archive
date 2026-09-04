import { describe, expect, it } from 'vitest';
import { getDojNativeSourceUrl } from '../../src/shared/utils/dojNativeSource';

describe('official native source fallback', () => {
  const url = 'https://www.justice.gov/epstein/files/DataSet%209/EFTA00239788.vob';

  it('retains the corrected native extension and source identity', () => {
    expect(getDojNativeSourceUrl({ doj_url: url, source_id: 'EFTA00239788' })).toBe(url);
    expect(getDojNativeSourceUrl({ doj_url: url, source_id: 'EFTA00239789' })).toBeNull();
  });

  it.each([
    url.replace('https:', 'http:'),
    url.replace('www.justice.gov', 'www.justice.gov.example.com'),
    url.replace('www.justice.gov', 'name:password@www.justice.gov'),
    url.replace('www.justice.gov', 'www.justice.gov:8443'),
    url + '?redirect=https://example.com',
    url + '#fragment',
    url.replace('EFTA00239788.vob', 'EFTA00239788.pdf'),
    url.replace('EFTA00239788.vob', '%2e%2e%2fother.vob'),
    'javascript:alert(1)',
  ])('rejects an untrusted or mismatched locator: %s', (candidate) => {
    expect(getDojNativeSourceUrl({ doj_url: candidate })).toBeNull();
  });
});
