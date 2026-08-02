import { describe, expect, it } from 'vitest';
import {
  evidenceRoleForCollection,
  normalMediaEvidenceWhereSql,
} from '../server/db/mediaEvidenceScope.js';

describe('media evidence scope', () => {
  it('classifies rebuttal collections as non-evidence', () => {
    expect(evidenceRoleForCollection('Confirmed Fake')).toBe('debunking');
    expect(evidenceRoleForCollection('Unconfirmed Claims')).toBe('claim_review');
    expect(evidenceRoleForCollection('DOJ Data Set 10')).toBe('evidence');
  });

  it('covers current and legacy collection markers', () => {
    const predicate = normalMediaEvidenceWhereSql('media');

    expect(predicate).toContain("media.metadata_json->>'evidenceRole'");
    expect(predicate).toContain("media.metadata_json->>'sourceCollection'");
    expect(predicate).toContain("media.file_path, '') ILIKE '%Confirmed Fake%'");
    expect(predicate).toContain('evidence_scope_album.id = media.album_id');
    expect(predicate).toContain("'Confirmed Fake', 'Unconfirmed Claims'");
  });
});
