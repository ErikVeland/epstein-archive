import React, { useState } from 'react';
import { Download, FileJson, FileArchive, Package, ShieldCheck, Loader2 } from 'lucide-react';

// UI Library
import { Surface, Button, Flex, Box, Stack, LqText, Grid, cn } from '../../design-system/lib';
import styles from './EvidencePacketExporter.module.css';

interface ExportMeta {
  investigationId: string;
  investigationTitle: string;
  exportedAt: string;
}

interface EvidencePacketExporterProps {
  investigationId: string;
  investigationTitle: string;
  onExport: (format: 'json' | 'zip', meta: ExportMeta) => void;
}

export const EvidencePacketExporter: React.FC<EvidencePacketExporterProps> = ({
  investigationId,
  investigationTitle,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'zip'>('zip');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      onExport(selectedFormat, {
        investigationId,
        investigationTitle,
        exportedAt: new Date().toISOString(),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box p="xxl" style={{ backgroundColor: 'var(--lq-surface-1)' }} className={styles.autoGen67}>
      <Stack gap="xl">
        {/* Header HUD */}
        <Stack gap="sm">
          <Flex align="center" gap="md">
            <Package size={24} className={styles.autoGen68} />
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
          Synthesize all linked entities, authenticated documents, metadata clusters, and Red Flag
          Index scores into a single forensic material package for external review or archive
          synchronization.
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
                icon: FileJson,
                desc: 'Machine-readable structured data.',
              },
              {
                id: 'zip' as const,
                label: 'ZIP Archive',
                icon: FileArchive,
                desc: 'Compressed bundle with media buffers.',
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
                      'p-3 rounded-xl',
                      selectedFormat === f.id
                        ? 'bg-[var(--lq-accent)] text-white'
                        : 'bg-[var(--lq-surface-2)] text-[var(--lq-text-dim)]',
                    )}
                  >
                    <f.icon size={20} />
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
            <ShieldCheck size={18} className={styles.autoGen70} />
            <LqText variant="xs" color="muted">
              Export includes full cryptographic provenance and investigator audit-trails for
              chain-of-custody compliance.
            </LqText>
          </Flex>
        </Surface>

        {/* Execution */}
        <Box style={{ paddingTop: 'var(--spacing-md)' }}>
          <Button variant="secondary" size="md" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <Download className="mr-2" />
            )}
            {isExporting
              ? 'Packaging Materials...'
              : `Generate ${selectedFormat.toUpperCase()} Artifact`}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};
