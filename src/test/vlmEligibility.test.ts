import { describe, expect, it } from 'vitest';
import {
  isVerifiedPhotographForVlm,
  verifiedPhotographForVlmWhereSql,
} from '../../scripts/pipeline/vlmEligibility.js';

describe('VLM photograph eligibility', () => {
  it.each(['verified', 'source_verified'])(
    'accepts a probable photograph with %s provenance',
    (verificationStatus) => {
      expect(
        isVerifiedPhotographForVlm({
          fileType: 'image/jpeg',
          verificationStatus,
          metadata: { visual_classification: 'probable_photograph' },
        }),
      ).toBe(true);
    },
  );

  it.each(['document_scan', 'graphic', 'unknown'])(
    'rejects %s media before VLM processing',
    (visualClassification) => {
      expect(
        isVerifiedPhotographForVlm({
          fileType: 'image/jpeg',
          verificationStatus: 'verified',
          metadata: { visual_classification: visualClassification },
        }),
      ).toBe(false);
    },
  );

  it('rejects probable photographs that are unverified or missing', () => {
    expect(
      isVerifiedPhotographForVlm({
        fileType: 'image/jpeg',
        verificationStatus: 'unverified',
        metadata: { visual_classification: 'probable_photograph' },
      }),
    ).toBe(false);
    expect(
      isVerifiedPhotographForVlm({
        fileType: 'image/jpeg',
        verificationStatus: 'verified',
        metadata: {
          visual_classification: 'probable_photograph',
          source_file_status: 'missing',
        },
      }),
    ).toBe(false);
  });

  it('builds a fail-closed SQL predicate for the worker query', () => {
    const sql = verifiedPhotographForVlmWhereSql('media');
    expect(sql).toContain("media.metadata_json->>'visual_classification' = 'probable_photograph'");
    expect(sql).toContain("media.verification_status IN ('verified', 'source_verified')");
    expect(sql).toContain("media.metadata_json->>'source_file_status'");
    expect(() => verifiedPhotographForVlmWhereSql('media; DROP TABLE media_items')).toThrow(
      'Invalid SQL alias',
    );
  });
});
