import React, { useState } from 'react';
import Icon, { IconName } from '@client/components/common/Icon';
import type {
  Annotation,
  EvidenceItem,
  Hypothesis,
  TimelineEvent,
} from '@client/types/investigation';
import { apiClient } from '@client/services/apiClient';

// UI Library
import { Surface, Button, Flex, Box, Stack, LqText, Grid, cn } from '@client/design-system/lib';
import styles from './EvidencePacketExporter.module.css';

interface ExportMeta {
  investigationId: string;
  investigationTitle: string;
  exportedAt: string;
}

interface EvidencePacketExporterProps {
  investigationId: string;
  investigationTitle: string;
  evidence?: EvidenceItem[];
  timelineEvents?: TimelineEvent[];
  hypotheses?: Hypothesis[];
  annotations?: Annotation[];
  onExport?: (format: 'json' | 'zip', meta: ExportMeta) => void;
}

type ExportFormat = 'json' | 'zip';
type ExportStatus = 'idle' | 'preparing' | 'downloading' | 'complete' | 'error';

interface ExportResult {
  filename: string;
  generatedAt: string;
  skippedFiles: string[];
  limits: string[];
}

const safeFilename = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'investigation';

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const readHeaderList = (headers: Headers, key: string): string[] => {
  const value = headers.get(key);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // Fall through to comma-delimited parsing for simple server headers.
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const EvidencePacketExporter: React.FC<EvidencePacketExporterProps> = ({
  investigationId,
  investigationTitle,
  evidence = [],
  timelineEvents = [],
  hypotheses = [],
  annotations = [],
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('zip');
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  const isExporting = exportStatus === 'preparing' || exportStatus === 'downloading';

  const buildJsonPacket = (exportedAt: string) => ({
    manifest: {
      investigationId,
      investigationTitle,
      exportedAt,
      format: 'json',
      evidenceCount: evidence.length,
      timelineEventCount: timelineEvents.length,
      hypothesisCount: hypotheses.length,
      annotationCount: annotations.length,
      notes: [
        'This client JSON export is a review packet, not a cryptographic chain-of-custody proof.',
        'Server ZIP manifest/skipped-file details should be supplied by the export endpoint when available.',
      ],
    },
    investigation: {
      id: investigationId,
      title: investigationTitle,
    },
    evidence,
    timelineEvents,
    hypotheses,
    annotations,
  });

  const exportJsonPacket = async (exportedAt: string): Promise<ExportResult> => {
    setProgress(35);
    const filename = `evidence-packet-${safeFilename(investigationTitle)}-${new Date(exportedAt)
      .toISOString()
      .slice(0, 10)}.json`;
    const packet = buildJsonPacket(exportedAt);
    setProgress(70);
    setExportStatus('downloading');
    const blob = new Blob([JSON.stringify(packet, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    triggerDownload(blob, filename);
    return {
      filename,
      generatedAt: exportedAt,
      skippedFiles: [],
      limits: ['Client JSON includes workspace metadata only; local source files are ZIP-only.'],
    };
  };

  const exportZipPacket = async (exportedAt: string): Promise<ExportResult> => {
    setProgress(25);
    const response = await apiClient.download(
      `/investigations/${encodeURIComponent(investigationId)}/export/zip`,
    );
    setProgress(85);
    setExportStatus('downloading');
    const filename =
      response.filename ||
      `investigation-bundle-${safeFilename(investigationTitle || investigationId)}.zip`;
    triggerDownload(response.blob, filename);
    const skippedFiles = [
      ...readHeaderList(response.headers, 'x-export-skipped-files'),
      ...readHeaderList(response.headers, 'x-skipped-files'),
    ];
    const limits = [
      response.headers.get('x-export-file-limit')
        ? `File cap: ${response.headers.get('x-export-file-limit')}`
        : 'Server file cap applies to ZIP local-file attachments.',
      response.headers.get('x-export-size-limit')
        ? `Size cap: ${response.headers.get('x-export-size-limit')}`
        : 'Server size cap applies to ZIP local-file attachments.',
    ];
    return { filename, generatedAt: exportedAt, skippedFiles, limits };
  };

  const handleExport = async () => {
    const exportedAt = new Date().toISOString();
    setExportStatus('preparing');
    setProgress(10);
    setErrorMessage(null);
    setLastResult(null);

    try {
      const result =
        selectedFormat === 'json'
          ? await exportJsonPacket(exportedAt)
          : await exportZipPacket(exportedAt);
      setProgress(100);
      setLastResult(result);
      setExportStatus('complete');
      onExport?.(selectedFormat, {
        investigationId,
        investigationTitle,
        exportedAt,
      });
    } catch (error) {
      setExportStatus('error');
      setProgress(0);
      setErrorMessage(error instanceof Error ? error.message : 'Export failed unexpectedly.');
    }
  };

  return (
    <Box p="xxl" style={{ backgroundColor: 'var(--lq-surface-1)' }} className={styles.autoGen67}>
      <Stack gap="xl">
        {/* Header HUD */}
        <Stack gap="sm">
          <Flex align="center" gap="md">
            <Icon name="Package" size="lg" className={styles.autoGen68} />
            <LqText variant="h3" weight="bold">
              Evidence Packet Synthesis
            </LqText>
          </Flex>
          <LqText
            variant="small"
            color="muted"
            weight="bold"
            style={{ textTransform: 'uppercase' }}
          >
            Case Export Protocol • High-Fidelity Signal Packaging
          </LqText>
        </Stack>

        <LqText variant="small" color="muted" style={{ lineHeight: '1.6' }}>
          Package linked evidence, timeline context, hypotheses, annotations, and available source
          files into a review artifact. ZIP exports use the server bundle endpoint; JSON exports are
          generated in this browser from the current workspace state.
        </LqText>

        {/* Configuration */}
        <Stack gap="md">
          <LqText variant="xs" weight="bold" color="muted" style={{ textTransform: 'uppercase' }}>
            Select Export Modality
          </LqText>
          <Grid cols={2} gap="md">
            {[
              {
                id: 'json' as const,
                label: 'JSON Stream',
                iconName: 'FileJson' as IconName,
                desc: 'Browser download of current workspace data.',
              },
              {
                id: 'zip' as const,
                label: 'ZIP Archive',
                iconName: 'FileArchive' as IconName,
                desc: 'Server packet with eligible local files.',
              },
            ].map((f) => (
              <Surface
                key={f.id}
                variant="glass-highlight"
                p="lg"
                className={cn(
                  'border cursor-pointer transition-all',
                  selectedFormat === f.id
                    ? 'border-[var(--lq-accent)]'
                    : 'border-[var(--lq-surface-3)]',
                )}
                onClick={() => setSelectedFormat(f.id)}
              >
                <Flex gap="md" align="center">
                  <Box
                    className={cn(
                      styles.p3,
                      'rounded-xl',
                      selectedFormat === f.id
                        ? 'bg-[var(--lq-accent)] text-white'
                        : 'bg-[var(--lq-surface-2)] text-[var(--lq-text-dim)]',
                    )}
                  >
                    <Icon name={f.iconName} size="lg" />
                  </Box>
                  <Stack gap="none">
                    <LqText variant="small" weight="bold">
                      {f.label}
                    </LqText>
                    <LqText variant="xs" color="muted">
                      {f.desc}
                    </LqText>
                  </Stack>
                </Flex>
              </Surface>
            ))}
          </Grid>
        </Stack>

        {/* Security / Governance */}
        <Surface variant="glass" p="md" className={styles.autoGen69}>
          <Flex gap="md" align="center">
            <Icon name="ShieldCheck" size="md" className={styles.autoGen70} />
            <LqText variant="xs" color="muted">
              Export metadata is intended for reviewer traceability. Cryptographic integrity and
              skipped-file manifests are shown only when generated by the active export path.
            </LqText>
          </Flex>
        </Surface>

        {/* Execution */}
        <Stack gap="md" style={{ paddingTop: 'var(--spacing-md)' }}>
          <Button variant="secondary" size="md" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Icon name="Loader2" className={`animate-spin ${styles.mr2}`} />
            ) : (
              <Icon name="Download" className={styles.mr2} />
            )}
            {isExporting
              ? exportStatus === 'preparing'
                ? `Preparing packet... ${progress}%`
                : `Downloading packet... ${progress}%`
              : `Generate ${selectedFormat.toUpperCase()} Artifact`}
          </Button>

          {isExporting && (
            <Box className={styles.progressTrack} role="progressbar" aria-valuenow={progress}>
              <Box className={styles.progressFill} style={{ width: `${progress}%` }} />
            </Box>
          )}

          {lastResult && (
            <Surface variant="glass-highlight" p="md" className={styles.statusPanel}>
              <Flex gap="md" align="start">
                <Icon name="CheckCircle2" size="md" className={styles.successIcon} />
                <Stack gap="xs">
                  <LqText variant="small" weight="bold">
                    Packet downloaded
                  </LqText>
                  <LqText variant="xs" color="muted">
                    {lastResult.filename} generated{' '}
                    {new Date(lastResult.generatedAt).toLocaleString()}
                  </LqText>
                  {lastResult.limits.map((limit) => (
                    <LqText key={limit} variant="xxxs" color="muted">
                      {limit}
                    </LqText>
                  ))}
                  {lastResult.skippedFiles.length > 0 && (
                    <Stack gap="xs" mt="xs">
                      <LqText variant="xxxs" color="warning" weight="bold">
                        Skipped files reported by server
                      </LqText>
                      {lastResult.skippedFiles.slice(0, 6).map((file) => (
                        <LqText key={file} variant="xxxs" color="muted">
                          {file}
                        </LqText>
                      ))}
                    </Stack>
                  )}
                  {selectedFormat === 'zip' && lastResult.skippedFiles.length === 0 && (
                    <Flex gap="xs" align="center">
                      <Icon name="Info" size="xs" className={styles.infoIcon} />
                      <LqText variant="xxxs" color="muted">
                        No skipped-file list was returned by the server for this download.
                      </LqText>
                    </Flex>
                  )}
                </Stack>
              </Flex>
            </Surface>
          )}

          {errorMessage && (
            <Surface variant="glass" p="md" className={styles.errorPanel}>
              <Flex gap="md" align="center">
                <Icon name="AlertTriangle" size="md" className={styles.warningIcon} />
                <LqText variant="xs" color="warning">
                  {errorMessage}
                </LqText>
              </Flex>
            </Surface>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};
