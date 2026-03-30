import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';

interface ProvenanceDocument {
  id?: string | number;
  ingest_run_id?: string;
  ingestRunId?: string;
  rulesetVersion?: string;
  ruleset_version?: string;
  modelId?: string;
  model_id?: string;
  recoveryModel?: string;
  recovery_model?: string;
  processedAt?: string;
  updatedAt?: string;
  dateModified?: string;
  confidenceBreakdown?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface ProvenanceLineageResponse {
  provenance?: {
    status?: string | null;
    score?: number | null;
    sourceSystem?: string | null;
    sourceRelease?: string | null;
    sourcePath?: string | null;
    sourceUrl?: string | null;
    acquisitionMethod?: string | null;
  };
  provenanceEvents?: Array<{
    id: number;
    event_type: string;
    tool_name?: string | null;
    tool_version?: string | null;
    source_path?: string | null;
    source_url?: string | null;
    occurred_at?: string | null;
  }>;
  processingInfo?: {
    ocrEngine?: string | null;
    ocrQualityScore?: number | null;
    processedAt?: string | null;
  };
}

interface ProvenancePanelProps {
  document: ProvenanceDocument;
}

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const readFirstString = (candidates: Array<unknown>): string => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return 'N/A';
};

const readConfidence = (document: ProvenanceDocument) => {
  const metadata = document?.metadata || {};
  const breakdown =
    document?.confidenceBreakdown ||
    metadata?.confidence_breakdown ||
    metadata?.confidenceBreakdown;
  if (!breakdown || typeof breakdown !== 'object') {
    return {
      coverage: 'N/A',
      signal: 'N/A',
      corroboration: 'N/A',
      model: 'N/A',
      final: 'N/A',
    };
  }

  const asPct = (value: unknown): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    if (value <= 1) return `${Math.round(value * 100)}%`;
    return `${Math.round(value)}%`;
  };

  const b = breakdown as Record<string, unknown>;
  return {
    coverage: asPct(b.coverage),
    signal: asPct(b.signalQuality ?? b.signal),
    corroboration: asPct(b.corroboration),
    model: asPct(b.modelCertainty ?? b.model),
    final: asPct(b.final ?? b.score),
  };
};

export const ProvenancePanel: React.FC<ProvenancePanelProps> = ({ document }) => {
  const metadata = document?.metadata || {};
  const confidence = readConfidence(document);
  const documentId = document?.id ? String(document.id) : null;

  const { data: lineage, isLoading: isLoadingLineage } = useQuery<ProvenanceLineageResponse | null>(
    {
      queryKey: ['documentLineage', documentId],
      queryFn: async () => {
        if (!documentId) return null;
        const response = await fetch(`/api/documents/${documentId}/lineage`);
        if (!response.ok) {
          throw new Error('Failed to load durable provenance');
        }
        return (await response.json()) as ProvenanceLineageResponse;
      },
      enabled: Boolean(documentId),
      staleTime: 30_000,
    },
  );

  const durableStatus = lineage?.provenance?.status || 'missing';
  const durableScore =
    typeof lineage?.provenance?.score === 'number' ? lineage.provenance.score : null;
  const durableSourcePath = lineage?.provenance?.sourcePath || 'N/A';
  const durableSourceUrl = lineage?.provenance?.sourceUrl || 'N/A';
  const durableSourceSystem = lineage?.provenance?.sourceSystem || 'N/A';
  const durableSourceRelease = lineage?.provenance?.sourceRelease || 'N/A';
  const durableAcquisitionMethod = lineage?.provenance?.acquisitionMethod || 'N/A';
  const eventCount = Array.isArray(lineage?.provenanceEvents) ? lineage.provenanceEvents.length : 0;
  const recentEvents = Array.isArray(lineage?.provenanceEvents)
    ? lineage.provenanceEvents.slice(-5).reverse()
    : [];

  const ingestRunId = readFirstString([
    document?.ingest_run_id,
    document?.ingestRunId,
    metadata?.ingest_run_id,
    metadata?.ingestRunId,
  ]);

  const rulesetVersion = readFirstString([
    document?.rulesetVersion,
    document?.ruleset_version,
    metadata?.rulesetVersion,
    metadata?.ruleset_version,
    metadata?.pipeline_version,
  ]);

  const modelId = readFirstString([
    document?.modelId,
    document?.model_id,
    metadata?.modelId,
    metadata?.model_id,
    metadata?.ai_model,
    metadata?.ai_provider,
  ]);

  const recoveryModel = readFirstString([
    document?.recoveryModel,
    document?.recovery_model,
    metadata?.recoveryModel,
    metadata?.recovery_model,
    metadata?.ocr_model,
  ]);

  const timestamp = formatTimestamp(
    readFirstString([
      document?.processedAt,
      document?.updatedAt,
      document?.dateModified,
      metadata?.processed_at,
      metadata?.ai_enriched_at,
    ]),
  );

  return (
    <div className="space-y-4 text-sm text-[var(--text-primary)]">
      <section className="surface-quiet p-4">
        <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-3">
          Durable provenance
        </h3>
        {isLoadingLineage ? (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)]" />
            Loading provenance ledger...
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-[var(--text-muted)] mb-1">Status</dt>
                <dd className="font-medium capitalize">{durableStatus.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)] mb-1">Score</dt>
                <dd>{durableScore === null ? 'N/A' : `${Math.round(durableScore)} / 100`}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)] mb-1">Source system</dt>
                <dd className="font-mono text-xs break-all">{durableSourceSystem}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)] mb-1">Acquisition method</dt>
                <dd className="font-mono text-xs break-all">{durableAcquisitionMethod}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)] mb-1">Source release</dt>
                <dd className="font-mono text-xs break-all">{durableSourceRelease}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)] mb-1">Ledger events</dt>
                <dd>{eventCount}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--text-muted)] mb-1">Source path</dt>
                <dd className="font-mono text-xs break-all">{durableSourcePath}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--text-muted)] mb-1">Source URL</dt>
                <dd className="font-mono text-xs break-all">{durableSourceUrl}</dd>
              </div>
            </dl>

            {recentEvents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
                  Recent events
                </h4>
                <div className="space-y-2">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg)]/50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{event.event_type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatTimestamp(event.occurred_at)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        {event.tool_name || 'system'}
                        {event.tool_version ? ` • ${event.tool_version}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="surface-quiet p-4">
        <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-3">
          Pipeline provenance
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Ingest run id</dt>
            <dd className="font-mono text-xs break-all">{ingestRunId}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Ruleset version</dt>
            <dd className="font-mono text-xs break-all">{rulesetVersion}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Model id</dt>
            <dd className="font-mono text-xs break-all">{modelId}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Recovery model</dt>
            <dd className="font-mono text-xs break-all">{recoveryModel}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-[var(--text-muted)] mb-1">Processed timestamp</dt>
            <dd className="font-mono text-xs break-all">{timestamp}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-quiet p-4">
        <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-3">
          Confidence breakdown
        </h3>
        <dl className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Coverage</dt>
            <dd>{confidence.coverage}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Signal</dt>
            <dd>{confidence.signal}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Corroboration</dt>
            <dd>{confidence.corroboration}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Model certainty</dt>
            <dd>{confidence.model}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)] mb-1">Final</dt>
            <dd>{confidence.final}</dd>
          </div>
        </dl>
      </section>

      <section className="surface-quiet p-4">
        <h3 className="text-xs uppercase tracking-wide text-[var(--text-muted)] mb-2">
          Determinism
        </h3>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          This view reflects persisted extraction outputs for this document and ingest run.
          Re-running the same ruleset and model against the same source should reproduce materially
          equivalent results; differences indicate upstream source, ruleset, or model-version
          changes.
        </p>
        {lineage?.processingInfo?.ocrEngine && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Icon name="FileSearch" size="xs" />
            OCR engine {lineage.processingInfo.ocrEngine}
            {typeof lineage.processingInfo.ocrQualityScore === 'number'
              ? ` • quality ${Math.round(lineage.processingInfo.ocrQualityScore * 100)}%`
              : ''}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProvenancePanel;
