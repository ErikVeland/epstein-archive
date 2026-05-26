import { describe, expect, it } from 'vitest';
import { getCaseFolderEvidenceReturnPath } from '../../src/client/features/investigation/investigationRouteUtils';

describe('investigation route utilities', () => {
  it('clears route-pattern evidence deep links to the case folder', () => {
    expect(getCaseFolderEvidenceReturnPath('/investigations/abc/evidence/ev-1', '')).toBe(
      '/investigations/abc?tab=casefolder',
    );
    expect(getCaseFolderEvidenceReturnPath('/investigate/case/abc/evidence/ev-1', '')).toBe(
      '/investigations/abc?tab=casefolder',
    );
  });

  it('removes query evidenceId while preserving other case-folder params', () => {
    expect(getCaseFolderEvidenceReturnPath('/investigations/abc', '?evidenceId=ev-1&foo=bar')).toBe(
      '/investigations/abc?foo=bar&tab=casefolder',
    );
  });

  it('returns null for routes without an evidence deep-link trigger', () => {
    expect(getCaseFolderEvidenceReturnPath('/investigations/abc', '?tab=casefolder')).toBeNull();
  });
});
