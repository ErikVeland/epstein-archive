import React from 'react';

interface ProvenanceDocument {
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
      </section>
    </div>
  );
};

export default ProvenancePanel;
