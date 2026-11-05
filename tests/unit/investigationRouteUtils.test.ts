import { describe, expect, it } from 'vitest';
import {
  getCanonicalInvestigationPath,
  getSelectedCaseEvidenceId,
  getCaseFolderEvidenceReturnPath,
} from '../../src/client/features/investigation/investigationRouteUtils';

describe('investigation route utilities', () => {
  it('preserves evidence selection while normalising numeric and legacy case routes', () => {
    expect(getCanonicalInvestigationPath('/investigations/7/evidence/42', 'case-uuid')).toBe(
      '/investigations/case-uuid/evidence/42',
    );
    expect(getCanonicalInvestigationPath('/investigate/case/7/evidence/42', 'case-uuid')).toBe(
      '/investigations/case-uuid/evidence/42',
    );
    expect(getCanonicalInvestigationPath('/investigations/7', 'case-uuid')).toBe(
      '/investigations/case-uuid',
    );
  });

  it('resolves the same selected case by numeric ID or UUID without opening another case', () => {
    expect(
      getSelectedCaseEvidenceId('/investigations/case-uuid/evidence/42', '', '7', 'case-uuid'),
    ).toBe('42');
    expect(getSelectedCaseEvidenceId('/investigations/7', '?evidenceId=43', '7', 'case-uuid')).toBe(
      '43',
    );
    expect(
      getSelectedCaseEvidenceId('/investigations/other/evidence/42', '', '7', 'case-uuid'),
    ).toBeNull();
    expect(getSelectedCaseEvidenceId('/investigations/7', '?evidenceId=43', null)).toBeNull();
  });
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
