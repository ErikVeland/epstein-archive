import { EvidenceItem, TimelineEvent } from '../types/investigation';

export interface ExportIntegrityMeta {
  caseId: string;
  generatedAt: string;
  ingestRunIds: string[] | 'mixed/unknown';
  pipelineVersion: string;
  evidenceIds: string[];
  checksum: string;
  checksumAlgorithm: string;
  nonDeterministicFields: string[];
  timelineOrderingMode: 'chronological' | 'narrative' | 'unknown';
}

const parseEvidenceMeta = (item: EvidenceItem): Record<string, unknown> => {
  const evidenceItem = item as EvidenceItem & {
    metadata_json?: string | Record<string, unknown> | null;
    metadata?: string | Record<string, unknown> | null;
    ingest_run_id?: string;
  };
  const raw = evidenceItem.metadata_json || evidenceItem.metadata || null;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
};

const normalizeEvidenceIds = (ids: Array<string | number>): string[] => {
  return ids
    .map((value) => String(value))
    .sort((a, b) => {
      const an = Number(a);
      const bn = Number(b);
      if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
      return a.localeCompare(b);
    });
};

const resolveIngestRunIds = (evidence: EvidenceItem[]): string[] | 'mixed/unknown' => {
  const runIds = new Set<string>();
  for (const item of evidence) {
    const evidenceItem = item as EvidenceItem & { ingest_run_id?: string };
    const meta = parseEvidenceMeta(item);
    const runId =
      (meta.ingest_run_id as string | undefined) ||
      (meta.ingestRunId as string | undefined) ||
      evidenceItem.ingest_run_id ||
      null;
    if (runId && runId.trim().length > 0) runIds.add(runId);
  }
  if (runIds.size === 0) return 'mixed/unknown';
  return Array.from(runIds).sort();
};

const hashSha256Hex = async (input: string): Promise<string> => {
  const encoded = new TextEncoder().encode(input);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
};

export const buildExportIntegrityMeta = async (params: {
  caseId: string | number;
  generatedAt: string;
  evidence: EvidenceItem[];
  pipelineVersion?: string;
  timelineOrderingMode?: 'chronological' | 'narrative' | 'unknown';
}): Promise<ExportIntegrityMeta> => {
  const evidenceIds = normalizeEvidenceIds(params.evidence.map((item) => item.id));
  const ingestRunIds = resolveIngestRunIds(params.evidence);
  const checksumSource = JSON.stringify({
    evidenceIds,
    ingestRunIds,
    generatedAt: params.generatedAt,
  });
  const checksum = await hashSha256Hex(checksumSource);

  return {
    caseId: String(params.caseId),
    generatedAt: params.generatedAt,
    ingestRunIds,
    pipelineVersion: params.pipelineVersion || 'N/A',
    evidenceIds,
    checksum,
    checksumAlgorithm: globalThis.crypto?.subtle ? 'SHA-256' : 'FNV-1a-32-fallback',
    nonDeterministicFields: ['generated_at'],
    timelineOrderingMode: params.timelineOrderingMode || 'unknown',
  };
};

export const prependMarkdownMetadata = (markdown: string, meta: ExportIntegrityMeta): string => {
  const ingest = Array.isArray(meta.ingestRunIds)
    ? meta.ingestRunIds.join(', ')
    : meta.ingestRunIds;
  const lines = [
    '<!-- investigation_export_metadata',
    `case_id: ${meta.caseId}`,
    `generated_at: ${meta.generatedAt}`,
    `ingest_run_ids: ${ingest}`,
    `pipeline_version: ${meta.pipelineVersion}`,
    `timeline_ordering_mode: ${meta.timelineOrderingMode}`,
    `evidence_ids: [${meta.evidenceIds.join(', ')}]`,
    `checksum: ${meta.checksum}`,
    `checksum_algorithm: ${meta.checksumAlgorithm}`,
    `non_deterministic_fields: [${meta.nonDeterministicFields.join(', ')}]`,
    '-->',
    '',
  ];
  return `${lines.join('\n')}${markdown}`;
};

export const buildEvidenceCsv = (evidence: EvidenceItem[], meta: ExportIntegrityMeta): string => {
  const headers = [
    'id',
    'title',
    'type',
    'relevance',
    'credibility',
    'source',
    'authenticityScore',
  ];
  const ordered = [...evidence].sort((a, b) => {
    const an = Number(a.id);
    const bn = Number(b.id);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return String(a.id).localeCompare(String(b.id));
  });
  const rows = ordered.map((item) =>
    [
      item.id,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      item.type,
      item.relevance,
      item.credibility,
      `"${(item.source || '').replace(/"/g, '""')}"`,
      String(item.authenticityScore || ''),
    ].join(','),
  );

  const metadata = [
    '# investigation_export_metadata',
    `# case_id=${meta.caseId}`,
    `# generated_at=${meta.generatedAt}`,
    `# ingest_run_ids=${Array.isArray(meta.ingestRunIds) ? meta.ingestRunIds.join('|') : meta.ingestRunIds}`,
    `# pipeline_version=${meta.pipelineVersion}`,
    `# timeline_ordering_mode=${meta.timelineOrderingMode}`,
    `# evidence_ids=${meta.evidenceIds.join('|')}`,
    `# checksum=${meta.checksum}`,
    `# checksum_algorithm=${meta.checksumAlgorithm}`,
    '',
  ];

  return `${metadata.join('\n')}${headers.join(',')}\n${rows.join('\n')}`;
};

export const buildTimelineExportJson = (
  timelineEvents: TimelineEvent[],
  meta: ExportIntegrityMeta,
): string => {
  const timeline = [...timelineEvents]
    .map((event) => ({
      id: String(event.id),
      title: event.title,
      description: event.description,
      type: event.type,
      startDate: new Date(event.startDate).toISOString(),
      confidence: event.confidence,
      documents: [...(event.documents || [])].map(String).sort(),
      entities: [...(event.entities || [])].map(String).sort(),
    }))
    .sort((a, b) => {
      const dateSort = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      if (dateSort !== 0) return dateSort;
      return a.id.localeCompare(b.id);
    });

  return JSON.stringify(
    {
      investigation_export_metadata: {
        case_id: meta.caseId,
        generated_at: meta.generatedAt,
        ingest_run_ids: meta.ingestRunIds,
        pipeline_version: meta.pipelineVersion,
        timeline_ordering_mode: meta.timelineOrderingMode,
        evidence_ids: meta.evidenceIds,
        checksum: meta.checksum,
        checksum_algorithm: meta.checksumAlgorithm,
        non_deterministic_fields: meta.nonDeterministicFields,
      },
      timeline,
    },
    null,
    2,
  );
};
