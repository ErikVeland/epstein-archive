import React, { useMemo, useState } from 'react';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Hypothesis,
  Annotation,
} from '@client/types/investigation';
import Icon, { IconName } from '@client/components/common/Icon';
import { format } from 'date-fns';
import { useToasts } from '../common/useToasts';
import { apiClient } from '@client/services/apiClient';
import {
  buildEvidenceCsv,
  buildExportIntegrityMeta,
  buildTimelineExportJson,
  prependMarkdownMetadata,
} from '@client/utils/investigationExportIntegrity';

// UI Library
import styles from './InvestigationExportTools.module.css';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Input,
  LqText,
  Stack,
  Surface,
  cn,
} from '@client/design-system/lib';
interface ExportToolsProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  timelineEvents: TimelineEvent[];
  hypotheses: Hypothesis[];
  annotations: Annotation[];
}

type ExportType = 'report' | 'bundle' | 'evidence-csv' | 'timeline';

interface ExportOption {
  id: ExportType;
  title: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  icon: IconName;
}

const exportOptions: ExportOption[] = [
  {
    id: 'report',
    title: 'Intelligence Briefing',
    description: 'Comprehensive markdown report with automated provenance sections.',
    available: true,
    icon: 'FileText',
  },
  {
    id: 'bundle',
    title: 'Case Bundle (ZIP)',
    description: 'Export full evidence package as a single encrypted archive.',
    available: false,
    unavailableReason: 'Bundle generation endpoint offline in this build.',
    icon: 'Package',
  },
  {
    id: 'evidence-csv',
    title: 'Evidence Matrix (CSV)',
    description: 'Structured table of all linked signals for external review.',
    available: true,
    icon: 'Database',
  },
  {
    id: 'timeline',
    title: 'Event Stream (JSON)',
    description: 'Machine-readable timeline orchestration data.',
    available: true,
    icon: 'History',
  },
];

export const InvestigationExportTools: React.FC<ExportToolsProps> = ({
  investigation,
  evidence,
  timelineEvents,
  hypotheses,
  annotations,
}) => {
  const { addToast } = useToasts();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<ExportType>('report');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeEntities, setIncludeEntities] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeComms, setIncludeComms] = useState(true);
  const [redactSensitive, setRedactSensitive] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedMeta, setGeneratedMeta] = useState<null | {
    filename: string;
    checksum: string;
    generatedAt: string;
    version: string;
  }>(null);

  const selectedOption = exportOptions.find((o) => o.id === selectedType) || exportOptions[0];

  const estimatedSizeKb = useMemo(() => {
    const base = 18;
    const evW = includeEvidence ? evidence.length * 0.7 : 0;
    const tlW = includeTimeline ? timelineEvents.length * 0.4 : 0;
    const hyW = includeSummary ? hypotheses.length * 0.3 : 0;
    const anW = includeAuditTrail ? annotations.length * 0.15 : 0;
    return Math.max(8, Math.round(base + evW + tlW + hyW + anW));
  }, [
    annotations.length,
    evidence.length,
    hypotheses.length,
    includeAuditTrail,
    includeEvidence,
    includeSummary,
    includeTimeline,
    timelineEvents.length,
  ]);

  const runGeneration = async () => {
    if (!selectedOption.available) {
      addToast({
        text: selectedOption.unavailableReason || 'Option unavailable.',
        type: 'warning',
      });
      return;
    }
    setIsGenerating(true);
    setProgress(10);
    setGeneratedMeta(null);

    try {
      const generatedAt = new Date().toISOString();
      const pipelineVersion = 'v18.3.4-stable';
      const integrity = await buildExportIntegrityMeta({
        caseId: investigation.id,
        generatedAt,
        evidence,
        pipelineVersion,
        timelineOrderingMode: 'chronological', // Default for export
      });

      await new Promise((r) => setTimeout(r, 600));
      setProgress(40);

      let content = '';
      let filename = `export-${Date.now()}.txt`;
      let mime = 'text/plain';

      if (selectedType === 'report') {
        const markdown = await apiClient.get<string>(
          `/investigations/${investigation.id}/briefing`,
        );
        content = prependMarkdownMetadata(markdown, integrity);
        filename = `briefing-${investigation.id}.md`;
        mime = 'text/markdown';
      } else if (selectedType === 'evidence-csv') {
        content = buildEvidenceCsv(evidence, integrity);
        filename = `evidence-${investigation.id}.csv`;
        mime = 'text/csv';
      } else if (selectedType === 'timeline') {
        content = buildTimelineExportJson(timelineEvents, integrity);
        filename = `timeline-${investigation.id}.json`;
        mime = 'application/json';
      }

      setProgress(85);
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setGeneratedMeta({
        filename,
        checksum: `${integrity.checksumAlgorithm}:${integrity.checksum}`,
        generatedAt,
        version: integrity.pipelineVersion,
      });
      addToast({ text: 'Mission artifact exported successfully.', type: 'success' });
    } catch {
      addToast({ text: 'Artifact synthesis failed.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box className={styles.autoGen222} style={{ backgroundColor: 'var(--lq-surface-1)' }}>
      {/* Step Indicator */}
      <Surface variant="glass" p="lg" className={styles.autoGen223}>
        <Stack gap="lg">
          <Flex justify="between" align="center">
            <Stack gap="none">
              <Flex align="center" gap="md">
                <Icon name="Package" size="md" className={styles.autoGen224} />
                <LqText variant="small" weight="bold">
                  Artifact Export Pipeline
                </LqText>
              </Flex>
              <LqText
                variant="xs"
                color="muted"
                style={{ textTransform: 'uppercase' }}
                weight="bold"
              >
                Secure Material Synthesis • Integrity Verification
              </LqText>
            </Stack>
            <Flex gap="xs" className={styles.autoGen225}>
              {[1, 2, 3, 4].map((idx) => (
                <Button
                  key={idx}
                  variant={step === idx ? 'primary' : 'ghost'}
                  size="sm"
                  className="min-w-[50px]"
                  onClick={() => setStep(idx as 1 | 2 | 3 | 4)}
                >
                  Step {idx}
                </Button>
              ))}
            </Flex>
          </Flex>
        </Stack>
      </Surface>

      <Box p="xl">
        <Stack gap="xl">
          {step === 1 && (
            <Stack gap="md">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={{ textTransform: 'uppercase' }}
              >
                1. Define Output Modality
              </LqText>
              <Grid cols={2} gap="md">
                {exportOptions.map((o) => (
                  <Surface
                    key={o.id}
                    variant={selectedType === o.id ? 'glass' : 'glass-highlight'}
                    p="lg"
                    className={cn(
                      'border cursor-pointer transition-all',
                      selectedType === o.id
                        ? 'border-[var(--lq-accent)]'
                        : 'border-[var(--lq-surface-3)]',
                    )}
                    onClick={() => setSelectedType(o.id)}
                  >
                    <Flex gap="md" align="center">
                      <Box
                        className={cn(
                          styles.p3,
                          'rounded-xl',
                          selectedType === o.id
                            ? 'bg-[var(--lq-accent)] text-white'
                            : 'bg-[var(--lq-surface-2)] text-[var(--lq-text-dim)]',
                        )}
                      >
                        <Icon name={o.icon} size="md" />
                      </Box>
                      <Stack gap="none" style={{ flex: 1 }}>
                        <Flex justify="between">
                          <LqText variant="small" weight="bold">
                            {o.title}
                          </LqText>
                          <Badge
                            variant={o.available ? 'success' : 'warning'}
                            label={o.available ? 'READY' : 'OFFLINE'}
                            size="sm"
                          />
                        </Flex>
                        <LqText variant="xs" color="muted" mt="xs">
                          {o.description}
                        </LqText>
                        {!o.available && (
                          <LqText variant="xxxs" color="warning" mt="xs" weight="bold">
                            {o.unavailableReason}
                          </LqText>
                        )}
                      </Stack>
                    </Flex>
                  </Surface>
                ))}
              </Grid>
            </Stack>
          )}

          {step === 2 && (
            <Stack gap="md">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={{ textTransform: 'uppercase' }}
              >
                2. Content Hardening & Toggles
              </LqText>
              <Grid cols={2} gap="md">
                {[
                  { label: 'Executive Summary', val: includeSummary, set: setIncludeSummary },
                  { label: 'Evidence Matrix', val: includeEvidence, set: setIncludeEvidence },
                  { label: 'Entity Intersection', val: includeEntities, set: setIncludeEntities },
                  {
                    label: 'Chronological Timeline',
                    val: includeTimeline,
                    set: setIncludeTimeline,
                  },
                  { label: 'Communication Logs', val: includeComms, set: setIncludeComms },
                  {
                    label: 'Audit / Provenance Trail',
                    val: includeAuditTrail,
                    set: setIncludeAuditTrail,
                  },
                ].map((t) => (
                  <Surface
                    key={t.label}
                    variant="glass-highlight"
                    p="md"
                    className={styles.autoGen226}
                  >
                    <label className={styles.autoGen227}>
                      <LqText variant="xs" weight="bold">
                        {t.label}
                      </LqText>
                      <Input
                        type="checkbox"
                        checked={t.val}
                        onChange={(e) => t.set(e.target.checked)}
                      />
                    </label>
                  </Surface>
                ))}
              </Grid>
              <Surface variant="glass" p="lg" mt="md" className={styles.autoGen228}>
                <Flex justify="between" align="center">
                  <Stack gap="xs">
                    <LqText variant="xs" weight="bold" color="warning">
                      SENSITIVE CONTENT REDACTION
                    </LqText>
                    <LqText variant="xs" color="muted">
                      Apply automated mask to detected PII and confidential signals.
                    </LqText>
                  </Stack>
                  <Input
                    type="checkbox"
                    checked={redactSensitive}
                    onChange={(e) => setRedactSensitive(e.target.checked)}
                  />
                </Flex>
              </Surface>
            </Stack>
          )}

          {step === 3 && (
            <Stack gap="md">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={{ textTransform: 'uppercase' }}
              >
                3. Verification & Metrics
              </LqText>
              <Surface variant="glass-highlight" p="xl" className={styles.autoGen229}>
                <Grid cols={3} gap="xl">
                  <Stack gap="xs">
                    <LqText variant="xs" color="muted">
                      ESTIMATED VOLUME
                    </LqText>
                    <LqText variant="small" weight="bold">
                      {estimatedSizeKb} KB
                    </LqText>
                  </Stack>
                  <Stack gap="xs">
                    <LqText variant="xs" color="muted">
                      INTEGRITY HASH
                    </LqText>
                    <LqText variant="small" weight="bold">
                      SHA-256 (Pending)
                    </LqText>
                  </Stack>
                  <Stack gap="xs">
                    <LqText variant="xs" color="muted">
                      TARGET ARTIFACT
                    </LqText>
                    <LqText variant="small" weight="bold">
                      {selectedOption.title}
                    </LqText>
                  </Stack>
                </Grid>
                <Box mt="xl" pt="xl" className={styles.autoGen230}>
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ marginBottom: 'var(--lq-space-md)' }}
                  >
                    INCLUDED MODULES
                  </LqText>
                  <Flex gap="xs" wrap="wrap">
                    {[
                      { l: 'SUMMARY', v: includeSummary },
                      { l: 'EVIDENCE', v: includeEvidence },
                      { l: 'ENTITIES', v: includeEntities },
                      { l: 'TIMELINE', v: includeTimeline },
                      { l: 'COMMS', v: includeComms },
                      { l: 'AUDIT', v: includeAuditTrail },
                    ]
                      .filter((i) => i.v)
                      .map((i) => (
                        <Badge key={i.l} variant="accent" label={i.l} size="sm" />
                      ))}
                  </Flex>
                </Box>
              </Surface>
            </Stack>
          )}

          {step === 4 && (
            <Stack gap="xl">
              <Stack gap="md">
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  4. Execution & Governance
                </LqText>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={runGeneration}
                  disabled={isGenerating || !selectedOption.available}
                >
                  {isGenerating ? (
                    <Icon name="Loader2" className={`animate-spin ${styles.mr2}`} />
                  ) : (
                    <Icon name="Zap" className={styles.mr2} />
                  )}
                  {isGenerating
                    ? `Synthesizing Artifact... ${progress}%`
                    : 'Execute Material Export'}
                </Button>
                {isGenerating && (
                  <Box className={styles.autoGen231}>
                    <Box className={styles.autoGen232} style={{ width: `${progress}%` }} />
                  </Box>
                )}
              </Stack>

              {generatedMeta && (
                <Surface variant="glass" p="lg" className={styles.autoGen233}>
                  <Flex gap="md" align="start">
                    <Icon name="CheckCircle2" size="lg" className={styles.autoGen234} />
                    <Stack gap="sm" style={{ flex: 1 }}>
                      <LqText variant="small" weight="bold">
                        Artifact Export Complete
                      </LqText>
                      <Grid cols={2} gap="md">
                        <Stack gap="none">
                          <LqText variant="xs" color="muted">
                            FILENAME
                          </LqText>
                          <LqText variant="xs" weight="bold">
                            {generatedMeta.filename}
                          </LqText>
                        </Stack>
                        <Stack gap="none">
                          <LqText variant="xs" color="muted">
                            CHECKSUM (SHA-256)
                          </LqText>
                          <LqText variant="xs" weight="bold" className={styles.autoGen235}>
                            {generatedMeta.checksum}
                          </LqText>
                        </Stack>
                        <Stack gap="none">
                          <LqText variant="xs" color="muted">
                            TIMESTAMP
                          </LqText>
                          <LqText variant="xs" weight="bold">
                            {format(new Date(generatedMeta.generatedAt), 'PPpp')}
                          </LqText>
                        </Stack>
                        <Stack gap="none">
                          <LqText variant="xs" color="muted">
                            ENGINE VERSION
                          </LqText>
                          <LqText variant="xs" weight="bold">
                            {generatedMeta.version}
                          </LqText>
                        </Stack>
                      </Grid>
                    </Stack>
                  </Flex>
                </Surface>
              )}

              {!selectedOption.available && (
                <Surface variant="glass" p="md" className={styles.autoGen236}>
                  <Flex gap="md" align="center">
                    <Icon name="ShieldAlert" size="md" className={styles.autoGen237} />
                    <LqText variant="xs" color="warning">
                      {selectedOption.unavailableReason || 'This modality is currently locked.'}
                    </LqText>
                  </Flex>
                </Surface>
              )}

              <Flex gap="sm" align="center" justify="center" p="md">
                <Icon name="Clock" size="xs" className={styles.autoGen238} />
                <LqText variant="xs" color="muted">
                  Exports are local machine downloads. No external signals transmitted.
                </LqText>
              </Flex>
            </Stack>
          )}

          {/* Navigation */}
          <Flex justify="between" pt="xl" className={styles.autoGen239}>
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 1}
              onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4)}
            >
              <Icon name="ChevronLeft" size="sm" className={styles.mr2} /> Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={step === 4 || (!selectedOption.available && step === 1)}
              onClick={() => setStep((s) => Math.min(4, s + 1) as 1 | 2 | 3 | 4)}
            >
              Next <Icon name="ChevronRight" size="sm" className={styles.ml2} />
            </Button>
          </Flex>

          {/* Global Case Metrics */}
          <Grid cols={4} gap="md" mt="md">
            {[
              { label: 'Evidence', val: evidence.length },
              { label: 'Events', val: timelineEvents.length },
              { label: 'Theories', val: hypotheses.length },
              { label: 'Signals', val: annotations.length },
            ].map((m) => (
              <Surface key={m.label} variant="glass-highlight" p="sm">
                <LqText variant="xs" color="muted">
                  {m.label.toUpperCase()}
                </LqText>
                <LqText variant="small" weight="bold">
                  {m.val}
                </LqText>
              </Surface>
            ))}
          </Grid>
        </Stack>
      </Box>
    </Box>
  );
};
