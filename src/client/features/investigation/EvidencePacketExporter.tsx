import React, { useState } from 'react';
import Icon from '@client/components/common/Icon';
import type { IconName } from '@client/components/common/Icon';
import type {
  Annotation,
  EvidenceItem,
  Hypothesis,
  TimelineEvent,
} from '@client/types/investigation';
import { apiClient } from '@client/services/apiClient';

// UI Library
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  Grid,
  cn,
  Badge,
} from '@client/design-system/lib';
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
  const [showPreview, setShowPreview] = useState(false);

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

  const [previewData, setPreviewData] = useState<{
    included: Array<{ name: string; type: string; size?: number }>;
    omitted: Array<{ name: string; reason: string }>;
    skippedFiles: string[];
    warnings: string[];
    ready: boolean;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const response = await apiClient.get<{
        included: Array<{ name: string; type: string; size?: number }>;
        omitted: Array<{ name: string; reason: string }>;
        skippedFiles: string[];
        warnings: string[];
        ready: boolean;
      }>(`/investigations/${encodeURIComponent(investigationId)}/export/preview`);
      setPreviewData(response);
    } catch (error) {
      console.error('Preview fetch failed:', error);
    } finally {
      setPreviewLoading(false);
    }
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
    <Box p="xxl" style={{ backgroundColor: 'var(--lq-surface-1)' }} className={styles.exportShell}>
      <Stack gap="xl">
        {/* Header HUD */}
        <Stack gap="sm">
          <Flex align="center" gap="md">
            <Icon name="Package" size="lg" className={styles.packageIcon} />
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

        {/* Preview Button */}
        {!showPreview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowPreview(true);
              if (!previewData) fetchPreview();
            }}
          >
            <Icon name="Eye" size="sm" className={styles.mr2} />
            Preview Packet Contents
          </Button>
        )}

        {/* Preview Panel */}
        {showPreview && (
          <Surface variant="glass-highlight" p="lg" className={styles.previewPanel}>
            <Stack gap="md">
              <Flex align="center" justify="between">
                <Flex align="center" gap="md">
                  <Icon name="FileSearch" size="md" className={styles.previewIcon} />
                  <LqText variant="small" weight="bold">
                    Export Preview
                  </LqText>
                </Flex>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                  <Icon name="X" size="sm" />
                </Button>
              </Flex>

              {previewLoading ? (
                <Flex align="center" gap="sm">
                  <Icon name="Loader2" className="animate-spin" size="sm" />
                  <LqText variant="xs" color="muted">
                    Loading preview...
                  </LqText>
                </Flex>
              ) : previewData ? (
                <>
                  {/* Readiness */}
                  <Flex align="center" gap="sm">
                    {previewData.ready ? (
                      <Badge variant="success" label="READY TO EXPORT" />
                    ) : (
                      <Badge variant="warning" label="NOT READY" />
                    )}
                    <LqText variant="xs" color="muted">
                      {previewData.ready ? 'All checks passed' : 'Review warnings before exporting'}
                    </LqText>
                  </Flex>

                  {/* Included Evidence */}
                  {previewData.included.length > 0 && (
                    <Box>
                      <LqText
                        variant="xs"
                        weight="bold"
                        color="muted"
                        className={styles.previewSectionTitle}
                      >
                        INCLUDED ({previewData.included.length})
                      </LqText>
                      <Box className={styles.previewList}>
                        {previewData.included.slice(0, 10).map((item, i) => (
                          <Flex key={i} align="center" gap="sm" className={styles.previewItem}>
                            <Icon
                              name={
                                item.type === 'document'
                                  ? 'FileText'
                                  : item.type === 'image'
                                    ? 'Image'
                                    : 'File'
                              }
                              size="xs"
                              className={styles.previewItemIcon}
                            />
                            <LqText variant="xs">{item.name}</LqText>
                            {item.size != null && (
                              <LqText variant="xs" color="muted" ml="auto">
                                {(item.size / 1024).toFixed(1)} KB
                              </LqText>
                            )}
                          </Flex>
                        ))}
                        {previewData.included.length > 10 && (
                          <LqText variant="xs" color="muted" className={styles.previewMore}>
                            +{previewData.included.length - 10} more...
                          </LqText>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Omitted Evidence */}
                  {previewData.omitted.length > 0 && (
                    <Box>
                      <LqText
                        variant="xs"
                        weight="bold"
                        color="warning"
                        className={styles.previewSectionTitle}
                      >
                        OMITTED ({previewData.omitted.length})
                      </LqText>
                      <Box className={styles.previewList}>
                        {previewData.omitted.map((item, i) => (
                          <Flex key={i} align="center" gap="sm" className={styles.previewItem}>
                            <Icon name="AlertTriangle" size="xs" className={styles.warningIcon} />
                            <LqText variant="xs">{item.name}</LqText>
                            <LqText variant="xs" color="muted" ml="auto">
                              {item.reason}
                            </LqText>
                          </Flex>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Skipped Files */}
                  {previewData.skippedFiles.length > 0 && (
                    <Box>
                      <LqText
                        variant="xs"
                        weight="bold"
                        color="warning"
                        className={styles.previewSectionTitle}
                      >
                        SKIPPED FILES ({previewData.skippedFiles.length})
                      </LqText>
                      <Box className={styles.previewList}>
                        {previewData.skippedFiles.slice(0, 5).map((file, i) => (
                          <LqText
                            key={i}
                            variant="xs"
                            color="muted"
                            className={styles.previewSkipItem}
                          >
                            {file}
                          </LqText>
                        ))}
                        {previewData.skippedFiles.length > 5 && (
                          <LqText variant="xs" color="muted">
                            +{previewData.skippedFiles.length - 5} more...
                          </LqText>
                        )}
                      </Box>
                    </Box>
                  )}

                  {/* Warnings */}
                  {previewData.warnings.length > 0 && (
                    <Surface variant="glass" p="sm" className={styles.warningPanel}>
                      <Flex gap="sm" align="start">
                        <Icon name="Info" size="sm" className={styles.infoIcon} />
                        <Stack gap="xs">
                          {previewData.warnings.map((warning, i) => (
                            <LqText key={i} variant="xs" color="muted">
                              {warning}
                            </LqText>
                          ))}
                        </Stack>
                      </Flex>
                    </Surface>
                  )}
                </>
              ) : (
                <LqText variant="xs" color="muted">
                  No preview data available. Click to refresh.
                </LqText>
              )}

              <Button variant="ghost" size="sm" onClick={fetchPreview} disabled={previewLoading}>
                <Icon name="RefreshCw" size="sm" className={styles.mr2} />
                Refresh Preview
              </Button>
            </Stack>
          </Surface>
        )}

        {/* Security / Governance */}
        <Surface variant="glass" p="md" className={styles.governanceNotice}>
          <Flex gap="md" align="center">
            <Icon name="ShieldCheck" size="md" className={styles.shieldIcon} />
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
