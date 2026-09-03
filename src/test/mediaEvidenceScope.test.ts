import { describe, expect, it } from 'vitest';
import {
  browsableVisualMediaWhereSql,
  evidenceRoleForCollection,
  normalDocumentEvidenceWhereSql,
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

  it('prevents rebuttal media documents from entering entity evidence', () => {
    const predicate = normalDocumentEvidenceWhereSql('document');

    expect(predicate).toContain("document.metadata_json->>'evidenceRole'");
    expect(predicate).toContain("document.file_path, '') ILIKE '%Confirmed Fake%'");
    expect(predicate).toContain('evidence_scope_media.document_id = document.id');
    expect(predicate).toContain('evidence_scope_media.file_path = document.file_path');
    expect(predicate).toContain('evidence_scope_document_album.id = evidence_scope_media.album_id');
  });

  it('hides scans and graphics and fails closed for unclassified PDF extracts', () => {
    const predicate = browsableVisualMediaWhereSql('media');

    expect(predicate).toContain("visual_classification', '') IN ('document_scan', 'graphic')");
    expect(predicate).toContain("source_file_status', '') = 'missing'");
    expect(predicate).toContain("file_path, '') ILIKE '%/media/extracted/%'");
    expect(predicate).toContain("visual_classification', '') <> 'probable_photograph'");
  });
});
