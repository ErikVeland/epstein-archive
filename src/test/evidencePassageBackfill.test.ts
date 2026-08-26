import { describe, expect, it, vi } from 'vitest';
import {
  findExactTextOffsets,
  parseBackfillOptions,
  resolveDocumentHashIdentity,
  runEvidencePassageBackfill,
  toPassage,
  type BackfillDependencies,
  type BackfillOptions,
  type SourceSentenceRow,
} from '../../scripts/backfill_evidence_passages.js';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const SHA_C = 'c'.repeat(64);

function sentenceRow(sentenceId: string): SourceSentenceRow {
  return {
    sentence_id: sentenceId,
    document_id: '100',
    original_file_id: null,
    page_id: '200',
    page_number: 1,
    page_text: `Evidence sentence ${sentenceId}.`,
    identical_sentence_ordinal: 0,
    identical_document_sentence_ordinal: 0,
    sentence_index: Number(sentenceId),
    sentence_text: `Evidence sentence ${sentenceId}.`,
    ocr_confidence: 0.98,
    normalized_text_sha256: SHA_A,
    content_sha256: SHA_B,
    asset_id: '300',
    asset_sha256: SHA_C,
    source_collection: 'Test release',
    source_release: 'Test release 1',
    provenance_status: 'substantial',
  };
}

function dependenciesFor(rows: SourceSentenceRow[]) {
  const insertBatch = vi.fn(async (passages: unknown[]) => passages.length);
  const dependencies: BackfillDependencies = {
    assertSchema: vi.fn(async () => undefined),
    loadBatch: vi.fn(async (afterId, limit) => {
      return rows.filter((row) => BigInt(row.sentence_id) > BigInt(afterId)).slice(0, limit);
    }),
    insertBatch,
    log: vi.fn(),
  };
  return { dependencies, insertBatch };
}

describe('evidence passage backfill options', () => {
  it('uses one bounded batch for the default invocation', () => {
    expect(parseBackfillOptions([])).toEqual({
      batchSize: 250,
      limit: 250,
      afterId: '0',
      dryRun: false,
    });
  });

  it('requires an explicit --all flag for an unlimited run', () => {
    expect(parseBackfillOptions(['--all', '--batch-size', '500'])).toMatchObject({
      batchSize: 500,
      limit: null,
    });
    expect(() => parseBackfillOptions(['--limit', '0'])).toThrow('Use --all');
    expect(() => parseBackfillOptions(['--all', '--limit', '10'])).toThrow(
      'either --all or --limit',
    );
    expect(() => parseBackfillOptions(['--limit', '--dry-run'])).toThrow(
      '--limit requires a value',
    );
  });
});

describe('evidence passage source identity', () => {
  it('keeps real source hashes separate from a synthetic revision fallback', () => {
    const synthetic = resolveDocumentHashIdentity({
      document_id: '42',
      normalized_text_sha256: null,
      content_sha256: 'legacy-content-hash',
      asset_sha256: null,
    });

    expect(synthetic).toMatchObject({
      documentSha256: null,
      assetSha256: null,
      syntheticRevision: true,
    });
    expect(synthetic.documentRevisionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      resolveDocumentHashIdentity({
        document_id: '42',
        normalized_text_sha256: null,
        content_sha256: 'legacy-content-hash',
        asset_sha256: null,
      }),
    ).toEqual(synthetic);

    expect(
      resolveDocumentHashIdentity({
        document_id: '42',
        normalized_text_sha256: `sha256:${SHA_A.toUpperCase()}`,
        content_sha256: SHA_B,
        asset_sha256: SHA_C,
      }),
    ).toEqual({
      documentRevisionHash: SHA_A,
      documentSha256: SHA_B,
      assetSha256: SHA_C,
      syntheticRevision: false,
    });
  });
});

describe('evidence passage text offsets', () => {
  it('finds the ordered exact occurrence and does not invent a coordinate', () => {
    const pageText = 'Same sentence. Middle. Same sentence.';

    expect(findExactTextOffsets(pageText, 'Same sentence.', 1)).toEqual({
      textStart: 23,
      textEnd: 37,
    });
    expect(findExactTextOffsets(pageText, 'Missing sentence.', 0)).toBeNull();
    expect(findExactTextOffsets(pageText, 'Same sentence.', null)).toBeNull();
  });

  it('maps the document-level repeated quote ordinal to quoteOccurrence', () => {
    expect(
      toPassage({
        ...sentenceRow('7'),
        identical_document_sentence_ordinal: 3,
      }).quoteOccurrence,
    ).toBe(3);
  });
});

describe('evidence passage backfill progress', () => {
  const boundedOptions: BackfillOptions = {
    batchSize: 2,
    limit: 2,
    afterId: '0',
    dryRun: false,
  };

  it('returns an accurate resume cursor and incomplete status when more rows remain', async () => {
    const { dependencies, insertBatch } = dependenciesFor([
      sentenceRow('1'),
      sentenceRow('2'),
      sentenceRow('3'),
    ]);

    await expect(runEvidencePassageBackfill(boundedOptions, dependencies)).resolves.toEqual({
      complete: false,
      dryRun: false,
      examined: 2,
      inserted: 2,
      resumeAfterId: '2',
      stopReason: 'limit-reached',
    });
    expect(insertBatch).toHaveBeenCalledTimes(1);
    expect(dependencies.loadBatch).toHaveBeenLastCalledWith('2', 1);
  });

  it('returns complete only after an exhaustion check finds no next row', async () => {
    const { dependencies } = dependenciesFor([sentenceRow('1'), sentenceRow('2')]);

    await expect(runEvidencePassageBackfill(boundedOptions, dependencies)).resolves.toMatchObject({
      complete: true,
      resumeAfterId: '2',
      stopReason: 'corpus-exhausted',
    });
    expect(dependencies.loadBatch).toHaveBeenLastCalledWith('2', 1);
  });

  it('does not write during a dry run', async () => {
    const { dependencies, insertBatch } = dependenciesFor([sentenceRow('9')]);

    await runEvidencePassageBackfill({ ...boundedOptions, limit: 1, dryRun: true }, dependencies);

    expect(insertBatch).not.toHaveBeenCalled();
  });
});
