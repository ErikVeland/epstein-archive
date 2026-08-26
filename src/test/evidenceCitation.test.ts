import { describe, expect, it } from 'vitest';
import {
  buildEvidenceCitation,
  LEGACY_EVIDENCE_CITATION_SCHEMA,
  verifyEvidenceCitation,
} from '../shared/evidence/citation.js';

const DOCUMENT_HASH = 'a'.repeat(64);

describe('buildEvidenceCitation', () => {
  it('builds the same citation for the same evidence slice', () => {
    const input = {
      documentId: '123',
      documentVersionHash: DOCUMENT_HASH,
      pageNumber: 42,
      sentenceIndex: 7,
      text: 'A precise passage from the source.',
    };

    expect(buildEvidenceCitation(input)).toEqual(buildEvidenceCitation({ ...input }));
  });

  it('canonicalizes the document digest and returns an exact-text hash', () => {
    const lowerCase = buildEvidenceCitation({
      documentId: '123',
      documentVersionHash: DOCUMENT_HASH,
      pageNumber: null,
      sentenceIndex: 0,
      text: 'Exact text',
    });
    const upperCaseWithPrefix = buildEvidenceCitation({
      documentId: '123',
      documentVersionHash: `sha256:${DOCUMENT_HASH.toUpperCase()}`,
      pageNumber: null,
      sentenceIndex: 0,
      text: 'Exact text',
    });

    expect(upperCaseWithPrefix).toEqual(lowerCase);
    expect(lowerCase.citationId).toMatch(/^EA-P-[a-f0-9]{40}$/);
    expect(lowerCase.textSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    ['document occurrence', { documentId: '' }],
    ['document version', { documentVersionHash: 'not-a-hash' }],
    ['page', { pageNumber: 0 }],
    ['sentence index', { sentenceIndex: -1 }],
    ['passage text', { text: '   ' }],
  ])('rejects an invalid %s', (_label, override) => {
    expect(() =>
      buildEvidenceCitation({
        documentId: '123',
        documentVersionHash: DOCUMENT_HASH,
        pageNumber: 1,
        sentenceIndex: 0,
        text: 'Evidence',
        ...override,
      }),
    ).toThrow(TypeError);
  });

  it('changes the citation when any evidence coordinate changes', () => {
    const base = {
      documentId: '123',
      documentVersionHash: DOCUMENT_HASH,
      pageNumber: 3,
      sentenceIndex: 9,
      text: 'Evidence text',
    };
    const citationIds = [
      buildEvidenceCitation(base).citationId,
      buildEvidenceCitation({ ...base, documentId: '124' }).citationId,
      buildEvidenceCitation({ ...base, documentVersionHash: 'b'.repeat(64) }).citationId,
      buildEvidenceCitation({ ...base, pageNumber: 4 }).citationId,
      buildEvidenceCitation({ ...base, sentenceIndex: 10 }).citationId,
      buildEvidenceCitation({ ...base, text: 'Evidence text.' }).citationId,
    ];

    expect(new Set(citationIds)).toHaveLength(citationIds.length);
  });

  it('verifies current citations and rejects altered evidence', () => {
    const input = {
      documentId: '123',
      documentVersionHash: DOCUMENT_HASH,
      pageNumber: 3,
      sentenceIndex: 9,
      text: 'Evidence text',
    };
    const citation = buildEvidenceCitation(input);

    expect(verifyEvidenceCitation(input, citation)).toBe(true);
    expect(verifyEvidenceCitation({ ...input, text: 'Altered evidence' }, citation)).toBe(false);
    expect(verifyEvidenceCitation({ ...input, sentenceIndex: 10 }, citation)).toBe(false);
  });

  it('keeps legacy v1 citations verifiable without collapsing them into v2', () => {
    const input = {
      documentId: '126809',
      documentVersionHash: '1b198b131e50e4858904535669bd99291c20f408bfaf82ef3679b8a5e00bd803',
      pageNumber: 1,
      sentenceIndex: 0,
      text: "hops scntinel.tbinct.fbi'apps'cas mgmtiindtx-scrialsprevicw.htmrd...",
    };

    expect(
      verifyEvidenceCitation(input, {
        citationId: 'EA-P-b1b45bc95a686f0fa9d3d8b7d3a339de05fc8d99',
        citationSchema: LEGACY_EVIDENCE_CITATION_SCHEMA,
        textSha256: 'ee42f329a2326ceacf60798b031debb1f2cea0cbe12773c46959cfadc3887c28',
      }),
    ).toBe(true);
    expect(buildEvidenceCitation(input).citationId).not.toBe(
      'EA-P-b1b45bc95a686f0fa9d3d8b7d3a339de05fc8d99',
    );
  });
});
