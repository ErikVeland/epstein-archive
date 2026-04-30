import { describe, expect, it } from 'vitest';

import {
  buildEvidenceCsv,
  buildExportIntegrityMeta,
  buildTimelineExportJson,
  prependMarkdownMetadata,
} from '../client/utils/investigationExportIntegrity';
import type { EvidenceItem, TimelineEvent } from '../client/types/investigation';

describe('investigation export integrity', () => {
  it('builds deterministic metadata and export formats', async () => {
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

    const meta = await buildExportIntegrityMeta({
      caseId: '42',
      generatedAt: '2026-02-16T12:00:00.000Z',
      evidence,
      pipelineVersion: 'commit-abc123',
      timelineOrderingMode: 'chronological',
    });

    expect(meta.evidenceIds).toEqual(['2', '9']);
    expect(meta.checksum.length).toBeGreaterThan(0);
    expect(meta.pipelineVersion).toBe('commit-abc123');

    const markdown = prependMarkdownMetadata('# body', meta);
    expect(markdown).toContain('investigation_export_metadata');
    expect(markdown).toContain('checksum_algorithm');

    const csv = buildEvidenceCsv(evidence, meta);
    const dataLines = csv
      .split('\n')
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .slice(1);
    expect(dataLines[0]).toMatch(/^2,/);
    expect(csv).toContain('# checksum=');

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
    expect(parsed.timeline[0]?.id).toBe('a');
    expect(parsed.investigation_export_metadata.case_id).toBe('42');
    expect(parsed.investigation_export_metadata.checksum).toBe(meta.checksum);
  });
});
