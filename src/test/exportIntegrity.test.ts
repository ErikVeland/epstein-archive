import assert from 'node:assert/strict';
import {
  buildEvidenceCsv,
  buildExportIntegrityMeta,
  buildTimelineExportJson,
  prependMarkdownMetadata,
} from '../utils/investigationExportIntegrity';
import type { EvidenceItem, TimelineEvent } from '../types/investigation';

console.log('Running export integrity tests...');

const evidence = [
  {
    id: '9',
    title: 'B item',
    type: 'email',
    relevance: 'high',
    credibility: 'verified',
    source: '/emails/9',
    authenticityScore: 88,
    metadata_json: JSON.stringify({ ingest_run_id: 'run-1' }),
  },
  {
    id: '2',
    title: 'A item',
    type: 'document',
    relevance: 'medium',
    credibility: 'unverified',
    source: '/docs/2',
    authenticityScore: 51,
    metadata_json: JSON.stringify({ ingest_run_id: 'run-1' }),
  },
] as unknown as EvidenceItem[];

const generatedAt = '2026-02-16T12:00:00.000Z';
const meta = await buildExportIntegrityMeta({
  caseId: '42',
  generatedAt,
  evidence,
  pipelineVersion: 'commit-abc123',
  timelineOrderingMode: 'chronological',
});

assert.deepEqual(meta.evidenceIds, ['2', '9'], 'evidence ids should be sorted deterministically');
assert.ok(meta.checksum.length > 0, 'checksum should be present');
assert.equal(meta.pipelineVersion, 'commit-abc123');

const markdown = prependMarkdownMetadata('# body', meta);
assert.ok(
  markdown.includes('investigation_export_metadata'),
  'markdown should embed metadata block',
);
assert.ok(markdown.includes('checksum_algorithm'), 'markdown should include checksum algorithm');

const csv = buildEvidenceCsv(evidence, meta);
const dataLines = csv
  .split('\n')
  .filter((line) => line.length > 0 && !line.startsWith('#'))
  .slice(1);
assert.ok(dataLines[0].startsWith('2,'), 'csv rows should be sorted by evidence id');
assert.ok(csv.includes('# checksum='), 'csv metadata must include checksum');

const timelineJson = buildTimelineExportJson(
  [
    {
      id: 'b',
      title: 'B',
      description: '',
      type: 'document',
      startDate: '2024-01-02T00:00:00.000Z',
      confidence: 50,
      documents: ['9'],
      entities: [],
    },
    {
      id: 'a',
      title: 'A',
      description: '',
      type: 'document',
      startDate: '2024-01-01T00:00:00.000Z',
      confidence: 70,
      documents: ['2'],
      entities: [],
    },
  ] as unknown as TimelineEvent[],
  meta,
);
const parsed = JSON.parse(timelineJson);
assert.equal(parsed.timeline[0].id, 'a', 'timeline should be sorted deterministically by date');
assert.equal(parsed.investigation_export_metadata.case_id, '42');
assert.equal(parsed.investigation_export_metadata.checksum, meta.checksum);

console.log('Export integrity tests passed.');
