import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '../common/Icon';
import styles from './DocumentProvenance.module.css';

// Design System
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { LqText } from '../../design-system/components/typography/Text';

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
    <Box className={styles.panelRoot}>
      <Surface variant="glass" className={styles.section}>
        <LqText variant="xs" weight="black" className={styles.sectionTitle}>
          Durable provenance
        </LqText>
        {isLoadingLineage ? (
          <Flex align="center" gap="sm">
            <Box className={styles.spinnerSmall} />
            <LqText variant="small" color="secondary">
              Loading provenance ledger...
            </LqText>
          </Flex>
        ) : (
          <>
            <Box className={styles.sourceDetailList}>
              <Box>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Status
                </LqText>
                <LqText variant="body" weight="medium" className={styles.textCapitalize}>
                  {durableStatus.replace(/_/g, ' ')}
                </LqText>
              </Box>
              <Box>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Score
                </LqText>
                <LqText variant="body">
                  {durableScore === null ? 'N/A' : `${Math.round(durableScore)} / 100`}
                </LqText>
              </Box>
              <Box>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Source system
                </LqText>
                <LqText className={styles.monoValue}>{durableSourceSystem}</LqText>
              </Box>
              <Box>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Acquisition method
                </LqText>
                <LqText className={styles.monoValue}>{durableAcquisitionMethod}</LqText>
              </Box>
              <Box>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Source release
                </LqText>
                <LqText className={styles.monoValue}>{durableSourceRelease}</LqText>
              </Box>
              <Box>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Ledger events
                </LqText>
                <LqText variant="body">{eventCount}</LqText>
              </Box>
              <Box className={styles.fullWidth}>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Source path
                </LqText>
                <LqText className={styles.monoValue}>{durableSourcePath}</LqText>
              </Box>
              <Box className={styles.fullWidth}>
                <LqText variant="xs" color="muted" className={styles.marginBottom1}>
                  Source URL
                </LqText>
                <LqText className={styles.monoValue}>{durableSourceUrl}</LqText>
              </Box>
            </Box>

            {recentEvents.length > 0 && (
              <Box className={styles.recentEvents}>
                <LqText variant="xs" weight="black" className={styles.sectionTitle}>
                  Recent events
                </LqText>
                <Box className={styles.stackSmall}>
                  {recentEvents.map((event) => (
                    <Box key={event.id} className={styles.eventCard}>
                      <Box className={styles.eventHeader}>
                        <LqText variant="body" weight="medium" className={styles.eventType}>
                          {event.event_type.replace(/_/g, ' ')}
                        </LqText>
                        <LqText className={styles.eventTime}>
                          {formatTimestamp(event.occurred_at)}
                        </LqText>
                      </Box>
                      <LqText color="secondary" className={styles.eventTool}>
                        {event.tool_name || 'system'}
                        {event.tool_version ? ` • ${event.tool_version}` : ''}
                      </LqText>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Surface>

      <Surface variant="glass" className={styles.section}>
        <LqText variant="xs" weight="black" className={styles.sectionTitle}>
          Pipeline provenance
        </LqText>
        <Box className={styles.sourceDetailList}>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Ingest run id
            </LqText>
            <LqText className={styles.monoValue}>{ingestRunId}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Ruleset version
            </LqText>
            <LqText className={styles.monoValue}>{rulesetVersion}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Model id
            </LqText>
            <LqText className={styles.monoValue}>{modelId}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Recovery model
            </LqText>
            <LqText className={styles.monoValue}>{recoveryModel}</LqText>
          </Box>
          <Box className={styles.fullWidth}>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Processed timestamp
            </LqText>
            <LqText className={styles.monoValue}>{timestamp}</LqText>
          </Box>
        </Box>
      </Surface>

      <Surface variant="glass" className={styles.section}>
        <LqText variant="xs" weight="black" className={styles.sectionTitle}>
          Confidence breakdown
        </LqText>
        <Box className={styles.confidenceGrid}>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Coverage
            </LqText>
            <LqText variant="body">{confidence.coverage}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Signal
            </LqText>
            <LqText variant="body">{confidence.signal}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Corroboration
            </LqText>
            <LqText variant="body">{confidence.corroboration}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Model certainty
            </LqText>
            <LqText variant="body">{confidence.model}</LqText>
          </Box>
          <Box>
            <LqText variant="xs" color="muted" className={styles.marginBottom1}>
              Final
            </LqText>
            <LqText variant="body">{confidence.final}</LqText>
          </Box>
        </Box>
      </Surface>

      <Surface variant="glass" className={styles.section}>
        <LqText variant="xs" weight="black" className={styles.sectionTitle}>
          Determinism
        </LqText>
        <LqText variant="body" color="secondary" className={styles.leadingRelaxed}>
          This view reflects persisted extraction outputs for this document and ingest run.
          Re-running the same ruleset and model against the same source should reproduce materially
          equivalent results; differences indicate upstream source, ruleset, or model-version
          changes.
        </LqText>
        {lineage?.processingInfo?.ocrEngine && (
          <Box className={styles.determinismBlock}>
            <Icon name="FileSearch" size="xs" />
            <LqText variant="xs">
              OCR engine {lineage.processingInfo.ocrEngine}
              {typeof lineage.processingInfo.ocrQualityScore === 'number'
                ? ` • quality ${Math.round(lineage.processingInfo.ocrQualityScore * 100)}%`
                : ''}
            </LqText>
          </Box>
        )}
      </Surface>
    </Box>
  );
};

export default ProvenancePanel;
