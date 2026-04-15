import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Printer,
  FileJson,
  Bot,
  Sparkles,
  Shield,
  Zap,
  FileType,
  Loader2,
} from 'lucide-react';

// UI Library
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Input,
  LqText,
  Select,
  Stack,
  Surface,
} from '../../design-system/lib';
import styles from './ForensicReportGenerator.module.css';

const css = <T,>(style: T) => style;

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  targetAudience: 'legal' | 'journalism' | 'internal' | 'public';
  classification: 'unclassified' | 'confidential' | 'restricted' | 'secret';
}

interface GeneratedReport {
  id: string;
  title: string;
  template: string;
  sections: {
    id: string;
    title: string;
    type: string;
    content: string;
    evidence: string[];
    confidence: number;
    sources?: string[];
  }[];
  generatedAt: string;
  generatedBy: string;
  classification: string;
  totalPages: number;
  wordCount: number;
  evidenceCount: number;
  confidence: number;
}

interface ForensicReportGeneratorProps {
  investigationId?: number;
  mobileMode?: boolean;
}

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'legal-prosecution',
    name: 'Legal Prosecution Report',
    description: 'Comprehensive report for legal proceedings with evidence chain documentation',
    sections: [
      'executive_summary',
      'methodology',
      'findings',
      'evidence',
      'analysis',
      'conclusions',
      'recommendations',
    ],
    targetAudience: 'legal',
    classification: 'restricted',
  },
  {
    id: 'journalism-investigation',
    name: 'Journalism Investigation Report',
    description: 'Narrative-driven report suitable for publication with source attribution',
    sections: ['executive_summary', 'findings', 'analysis', 'conclusions'],
    targetAudience: 'journalism',
    classification: 'unclassified',
  },
  {
    id: 'internal-analysis',
    name: 'Internal Analysis Report',
    description: 'Detailed technical analysis for internal team review',
    sections: ['methodology', 'findings', 'analysis', 'recommendations'],
    targetAudience: 'internal',
    classification: 'confidential',
  },
  {
    id: 'public-summary',
    name: 'Public Summary Report',
    description: 'High-level summary appropriate for public release',
    sections: ['executive_summary', 'findings', 'conclusions'],
    targetAudience: 'public',
    classification: 'unclassified',
  },
];

export default function ForensicReportGenerator({
  investigationId,
  mobileMode,
}: ForensicReportGeneratorProps = {}) {
  const [templates] = useState<ReportTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('legal-prosecution');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportTitle, setReportTitle] = useState(
    'Epstein Archive Network Analysis - Official Signal Briefing',
  );
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [classification, setClassification] = useState<string>('confidential');

  const { data: _realData = { stats: null, entities: [], transactions: [], timeline: [] } } =
    useQuery({
      queryKey: ['forensic-report-data', investigationId || 'global'],
      queryFn: async () => {
        const endpoints = investigationId
          ? [
              '/api/stats',
              `/api/investigations/${investigationId}/evidence`,
              `/api/investigations/${investigationId}/transactions`,
              `/api/investigations/${investigationId}/timeline-events`,
            ]
          : [
              '/api/stats',
              '/api/entities?limit=50&sortBy=red_flag_rating&sortOrder=desc',
              '/api/financial/transactions',
              '/api/timeline',
            ];

        const [statsRes, entRes, txRes, tlRes] = await Promise.all(endpoints.map((e) => fetch(e)));
        const stats = await statsRes.json();
        const transactions = await txRes.json();
        const timeline = tlRes.ok ? await tlRes.json() : [];
        let entities = [];

        if (investigationId) {
          const data = await entRes.json();
          entities = (Array.isArray(data) ? data : [])
            .filter((e: Record<string, unknown>) => e.type === 'entity')
            .map((e: Record<string, unknown>) => ({
              name: String(e.title || e.name),
              id: String(e.source_id),
            }));
        } else {
          entities = (await entRes.json()).data || [];
        }

        return {
          stats,
          entities,
          transactions: Array.isArray(transactions) ? transactions : [],
          timeline: Array.isArray(timeline) ? timeline : [],
        };
      },
    });

  const generateReport = async () => {
    if (!selectedTemplate) return;
    setIsGenerating(true);
    setGenerationProgress(0);

    const intv = setInterval(() => {
      setGenerationProgress((p) => {
        if (p >= 95) {
          clearInterval(intv);
          return 95;
        }
        return p + 5;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(intv);
      setGenerationProgress(100);
      const template = templates.find((t) => t.id === selectedTemplate)!;
      const report: GeneratedReport = {
        id: `FR-${Date.now()}`,
        title: reportTitle || template.name,
        template: selectedTemplate,
        sections: template.sections.map((s) => ({
          id: s,
          title: s.replace('_', ' ').toUpperCase(),
          type: s,
          content: `Automated forensic output for ${s}... [Content placeholder for v18.3.4 extraction demo]`,
          evidence: includeEvidence ? ['REF-001', 'REF-002'] : [],
          confidence: 90,
          sources: ['Intelligence Core'],
        })),
        generatedAt: new Date().toISOString(),
        generatedBy: 'Forensic Extraction Unit',
        classification,
        totalPages: 12,
        wordCount: 3450,
        evidenceCount: 18,
        confidence: 92,
      };
      setGeneratedReport(report);
      setIsGenerating(false);
    }, 3000);
  };

  const exportReport = (format: string) => {
    if (!generatedReport) return;
    const content = `[${generatedReport.classification.toUpperCase()}] ${generatedReport.title}\n\nGenerated: ${generatedReport.generatedAt}\n\nSummary Content...`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forensic-report-${generatedReport.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box className={styles.autoGen117} style={css({ backgroundColor: 'var(--lq-surface-1)' })}>
      {!mobileMode && (
        <Surface variant="glass" p="xl" className={styles.autoGen118}>
          <Stack gap="lg">
            <Flex justify="between" align="center">
              <Stack gap="none">
                <Flex align="center" gap="md">
                  <FileText size={24} className={styles.autoGen119} />
                  <LqText variant="h1" weight="bold">
                    Intelligence Briefing Generator
                  </LqText>
                </Flex>
                <LqText
                  variant="small"
                  color="muted"
                  weight="bold"
                  style={css({ textTransform: 'uppercase', marginTop: 'var(--spacing-xs)' })}
                >
                  Process Sigma • Automated Narrative Construction
                </LqText>
              </Stack>
              <Flex gap="md">
                <Button variant="ghost" size="sm">
                  <Shield size={14} className={styles.mr1} /> SECURE MODE
                </Button>
                <Button variant="ghost" size="sm" onClick={() => window.print()}>
                  <Printer size={14} />
                </Button>
              </Flex>
            </Flex>

            <Surface variant="glass-highlight" p="lg" className={styles.autoGen120}>
              <Grid cols={2} gap="xl">
                <Stack gap="md">
                  <Stack gap="xs">
                    <LqText variant="xs" weight="bold" color="muted">
                      REPORT DESIGNATION
                    </LqText>
                    <Input
                      style={css({
                        width: '100%',
                        background: 'var(--lq-surface-3)',
                        border: '1px solid var(--lq-surface-4)',
                        borderRadius: '0.375rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: 'var(--lq-text-primary)',
                        outline: 'none',
                      })}
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      placeholder="Case ID / Mission Title..."
                    />
                  </Stack>
                  <Grid cols={2} gap="md">
                    <Stack gap="xs">
                      <LqText variant="xs" weight="bold" color="muted">
                        TEMPLATE LENS
                      </LqText>
                      <Select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        size="sm"
                        options={templates.map((t) => ({ value: t.id, label: t.name }))}
                      />
                    </Stack>
                    <Stack gap="xs">
                      <LqText variant="xs" weight="bold" color="muted">
                        CLASSIFICATION LEVEL
                      </LqText>
                      <Select
                        value={classification}
                        onChange={(e) => setClassification(e.target.value)}
                        size="sm"
                        options={['unclassified', 'confidential', 'restricted', 'secret'].map(
                          (c) => ({ value: c, label: c.toUpperCase() }),
                        )}
                      />
                    </Stack>
                  </Grid>
                </Stack>
                <Stack gap="md">
                  <Flex gap="md" py="xs">
                    <label className={styles.autoGen121}>
                      <Input
                        type="checkbox"
                        checked={includeEvidence}
                        onChange={(e) => setIncludeEvidence(e.target.checked)}
                      />
                      <LqText variant="xs" weight="bold">
                        ATTACH CHAIN OF CUSTODY
                      </LqText>
                    </label>
                    <label className={styles.autoGen122}>
                      <Input
                        type="checkbox"
                        checked={includeCharts}
                        onChange={(e) => setIncludeCharts(e.target.checked)}
                      />
                      <LqText variant="xs" weight="bold">
                        INJECT ANALYTICAL CHARTS
                      </LqText>
                    </label>
                  </Flex>
                  <Button variant="secondary" onClick={generateReport} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className={`animate-spin ${styles.mr2}`} size={16} />
                    ) : (
                      <Zap className={styles.mr2} size={16} />
                    )}
                    {isGenerating
                      ? `Synthesizing Intelligence... ${generationProgress}%`
                      : 'Execute Narrative Extraction'}
                  </Button>
                  {isGenerating && (
                    <Box className={styles.autoGen123}>
                      <Box
                        className={styles.autoGen124}
                        style={css({ width: `${generationProgress}%` })}
                      />
                    </Box>
                  )}
                </Stack>
              </Grid>
            </Surface>
          </Stack>
        </Surface>
      )}

      <Box p="xl">
        {!generatedReport && !isGenerating ? (
          <Surface variant="glass" p="xxxl" className={styles.autoGen125}>
            <Stack align="center" gap="lg">
              <Bot size={64} className={styles.autoGen126} />
              <Stack gap="xs">
                <LqText variant="small" weight="bold">
                  Intelligence Buffer Primed
                </LqText>
                <LqText variant="xs" color="muted">
                  Select a template and classification level to generate an official forensic
                  briefing from case data.
                </LqText>
              </Stack>
            </Stack>
          </Surface>
        ) : generatedReport ? (
          <Stack gap="xl">
            {/* Produced Intelligence Card */}
            <Surface variant="glass" p="lg" className={styles.autoGen127}>
              <Box className={styles.autoGen128}>
                <Badge tone={generatedReport.classification === 'secret' ? 'danger' : 'warning'}>
                  {generatedReport.classification.toUpperCase()}
                </Badge>
              </Box>

              <Flex gap="xl" align="start">
                <Box className={styles.autoGen129}>
                  <FileText size={40} />
                </Box>
                <Stack gap="md" style={css({ flex: 1 })}>
                  <Stack gap="none">
                    <LqText variant="h3" weight="bold">
                      {generatedReport.title}
                    </LqText>
                    <LqText variant="xs" color="muted">
                      Produced at {new Date(generatedReport.generatedAt).toLocaleString()} by{' '}
                      {generatedReport.generatedBy}
                    </LqText>
                  </Stack>

                  <Grid cols={4} gap="md">
                    <Surface variant="glass-highlight" p="sm">
                      <LqText
                        variant="xs"
                        color="muted"
                        style={css({ textTransform: 'uppercase' })}
                      >
                        Payload Volume
                      </LqText>
                      <LqText variant="small" weight="bold" style={css({ marginTop: 'xs' })}>
                        {generatedReport.wordCount.toLocaleString()} Words
                      </LqText>
                    </Surface>
                    <Surface variant="glass-highlight" p="sm">
                      <LqText
                        variant="xs"
                        color="muted"
                        style={css({ textTransform: 'uppercase' })}
                      >
                        Evidence Points
                      </LqText>
                      <LqText variant="small" weight="bold" style={css({ marginTop: 'xs' })}>
                        {generatedReport.evidenceCount} Items
                      </LqText>
                    </Surface>
                    <Surface variant="glass-highlight" p="sm">
                      <LqText
                        variant="xs"
                        color="muted"
                        style={css({ textTransform: 'uppercase' })}
                      >
                        Structural Confidence
                      </LqText>
                      <LqText
                        variant="small"
                        weight="bold"
                        style={css({ marginTop: 'xs', color: 'var(--lq-success)' })}
                      >
                        {generatedReport.confidence}%
                      </LqText>
                    </Surface>
                    <Surface variant="glass-highlight" p="sm">
                      <LqText
                        variant="xs"
                        color="muted"
                        style={css({ textTransform: 'uppercase' })}
                      >
                        Physical Pages
                      </LqText>
                      <LqText variant="small" weight="bold" style={css({ marginTop: 'xs' })}>
                        {generatedReport.totalPages}
                      </LqText>
                    </Surface>
                  </Grid>

                  <Flex gap="sm">
                    <Button variant="secondary" size="sm" onClick={() => exportReport('pdf')}>
                      <FileType size={14} className={styles.mr1} /> EXPORT PDF
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => exportReport('docx')}>
                      <FileType size={14} className={styles.mr1} /> DOCX
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => exportReport('json')}>
                      <FileJson size={14} className={styles.mr1} /> SOURCE JSON
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => window.print()}>
                      <Printer size={14} className={styles.mr1} /> PRINT
                    </Button>
                  </Flex>
                </Stack>
              </Flex>
            </Surface>

            {/* Narrative Preview */}
            <Stack gap="lg">
              <Flex gap="sm" align="center">
                <Sparkles size={16} className={styles.autoGen130} />
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                >
                  Intelligence Stream Preview
                </LqText>
              </Flex>
              <Stack gap="md">
                {generatedReport.sections.map((section) => (
                  <Surface
                    key={section.id}
                    variant="glass-highlight"
                    p="xl"
                    className={styles.autoGen131}
                  >
                    <Stack gap="md">
                      <Flex justify="between">
                        <LqText
                          variant="small"
                          weight="bold"
                          color="accent"
                          style={css({ textTransform: 'uppercase' })}
                        >
                          {section.title}
                        </LqText>
                        <Badge tone="warning">{`${section.confidence}% CONF`}</Badge>
                      </Flex>
                      <LqText variant="body">{section.content}</LqText>
                      {section.evidence.length > 0 && (
                        <Flex gap="xs" style={css({ marginTop: 'sm' })}>
                          <LqText
                            variant="xs"
                            weight="bold"
                            color="muted"
                            style={css({ marginRight: 'xs' })}
                          >
                            SUPPORTING SIGNALS:{' '}
                          </LqText>
                          {section.evidence.map((e) => (
                            <Badge key={e} tone="accent">
                              {e}
                            </Badge>
                          ))}
                        </Flex>
                      )}
                    </Stack>
                  </Surface>
                ))}
              </Stack>
            </Stack>
          </Stack>
        ) : null}
      </Box>
    </Box>
  );
}
