import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ensurePdfWorker } from '../../utils/ensurePdfWorker';
import {
  FileText,
  Fingerprint,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  ShieldAlert,
  BarChart3,
  Download,
  Loader2,
} from 'lucide-react';
import { PDFVariantViewer } from '../documents/PDFVariantViewer';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DocumentMetadataPanel } from '../documents/DocumentMetadataPanel';
import { Tabs } from '../common/Tabs';
import { useForensicDocumentData } from '../../hooks/useForensicDocumentData';
import { useScrollLock } from '../../hooks/useScrollLock';
// UI Library
import styles from './ForensicDocumentAnalyzer.module.css';
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  Grid,
  Badge,
  cn,
} from '../../design-system/lib';

// Set up PDF.js worker
ensurePdfWorker();

export interface ForensicAnalysis {
  id: string;
  documentId: string;
  authenticity: {
    score: number;
    factors: AuthenticityFactor[];
    verdict: 'authentic' | 'suspicious' | 'forged' | 'inconclusive';
  };
  metadata: DocumentMetadata;
  entities: DetectedEntity[];
  patterns: DetectedPattern[];
  anomalies: DetectedAnomaly[];
  timestamp: string;
}

interface AuthenticityFactor {
  type: 'font' | 'formatting' | 'metadata' | 'language' | 'timeline' | 'cross_reference';
  score: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface DocumentMetadata {
  fileInfo: {
    name: string;
    size: number;
    type: string;
    created: string;
    modified: string;
    hash: string;
  };
  documentProperties?: {
    author?: string;
    creationDate?: string;
    modificationDate?: string;
    producer?: string;
    creator?: string;
    pageCount?: number;
  };
  textAnalysis: {
    wordCount: number;
    characterCount: number;
    averageWordLength: number;
    readingLevel: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    writingStyle: 'formal' | 'informal' | 'technical' | 'legal';
  };
  technical?: Record<string, unknown>;
  structure?: Record<string, unknown>;
  linguistics?: Record<string, unknown>;
  network?: Record<string, unknown>;
  tags?: string[];
}

interface DetectedEntity {
  type:
    | 'person'
    | 'organization'
    | 'location'
    | 'date'
    | 'phone'
    | 'email'
    | 'money'
    | 'address'
    | 'url';
  text: string;
  position: { start: number; end: number };
  confidence: number;
  context: string;
  crossReferences: string[];
  name?: string;
  sentiment?: string;
}

interface DetectedPattern {
  type: 'communication' | 'financial' | 'travel' | 'meeting' | 'relationship' | 'transaction';
  description: string;
  entities: string[];
  confidence: number;
  significance: 'low' | 'medium' | 'high';
  severity?: 'low' | 'medium' | 'high';
}

interface DetectedAnomaly {
  type: 'temporal' | 'linguistic' | 'formatting' | 'logical' | 'cross_reference';
  description: string;
  severity: 'minor' | 'significant' | 'critical';
  explanation: string;
  requiresInvestigation: boolean;
  relatedEvidence?: string[];
}

export interface ForensicCaseContext {
  caseId: string;
  investigationFocus: string[];
  keyEntities: string[];
  timelineRange: { start: string; end: string };
}

interface ForensicDocumentAnalyzerProps {
  documentId: string;
  onAnalysisComplete?: (analysis: ForensicAnalysis) => void;
  caseContext?: ForensicCaseContext;
  mobileMode?: boolean;
}

export const ForensicDocumentAnalyzer: React.FC<ForensicDocumentAnalyzerProps> = ({
  documentId,
  onAnalysisComplete,
  caseContext,
  mobileMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEntity, setSelectedEntity] = useState<DetectedEntity | null>(null);
  useScrollLock(!!selectedEntity);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata'
  >('dashboard');
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    factors: false,
  });

  const { analysis, isAnalyzing, metrics, setActiveId, startForensicAnalysis, summary, topRisk } =
    useForensicDocumentData({
      documentId,
      activeTab,
      caseContext,
      onAnalysisComplete,
      locationSearch: location.search,
    });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const openForensicDocument = (id: string) => {
    if (!location.pathname.startsWith('/investigations')) {
      navigate(`/investigations?tab=forensic&docId=${id}`);
      return;
    }
    setActiveId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', 'forensic');
    params.set('docId', id);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  };

  const getEntityIcon = (type: DetectedEntity['type']) => {
    switch (type) {
      case 'person':
        return User;
      case 'organization':
        return FileText;
      case 'location':
        return MapPin;
      case 'date':
        return Clock;
      case 'phone':
        return Phone;
      case 'email':
        return Mail;
      case 'money':
        return DollarSign;
      case 'address':
        return MapPin;
      case 'url':
        return FileText;
      default:
        return FileText;
    }
  };

  const getVerdictLabel = (verdict: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      authentic: 'success',
      suspicious: 'warning',
      forged: 'danger',
      inconclusive: 'neutral',
    };
    return <Badge tone={variants[verdict] || 'neutral'}>{verdict.toUpperCase()}</Badge>;
  };

  return (
    <Box className={styles.autoGen95} style={{ backgroundColor: 'var(--lq-surface-1)' }}>
      <Flex className={styles.autoGen96}>
        {/* Document Viewer Column */}
        <Box style={{ flex: 1 }} className={styles.autoGen97}>
          <PDFVariantViewer documentId={documentId} className={styles.autoGen98} />
        </Box>

        {/* Forensic Analysis Panel */}
        {!mobileMode && (
          <Box style={{ width: 450 }} className={styles.autoGen99}>
            <Surface variant="glass" className={styles.autoGen100} style={{ height: '100%' }}>
              {!analysis && !isAnalyzing ? (
                <Stack align="center" p="xxl" gap="xl" style={{ height: '100%' }}>
                  <Fingerprint size={64} className={styles.autoGen101} />
                  <Stack gap="sm">
                    <LqText variant="display" weight="bold">
                      Forensic Verification Required
                    </LqText>
                    <LqText variant="xs" color="muted">
                      Run forensic analysis to generate authenticity signals and extract metadata.
                    </LqText>
                  </Stack>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={startForensicAnalysis}
                    disabled={!documentId}
                  >
                    <Zap size={18} /> Initiate Analysis
                  </Button>
                </Stack>
              ) : isAnalyzing ? (
                <Stack align="center" p="xxl" gap="xl" style={{ height: '100%' }}>
                  <Loader2 size={64} className={styles.autoGen102} />
                  <Stack gap="sm">
                    <LqText variant="display" weight="bold">
                      Analyzing Forensic Signals...
                    </LqText>
                    <LqText variant="xs" color="muted">
                      Processing metadata, linguistic patterns, and cross-references.
                    </LqText>
                  </Stack>
                </Stack>
              ) : (
                <Stack p="xl" gap="xl">
                  {/* Authenticity Matrix */}
                  <Surface variant="glass-highlight" p="lg" className={styles.autoGen103}>
                    <Stack gap="md">
                      <Flex justify="between" align="center">
                        <LqText variant="small" weight="bold" color="muted">
                          AUTHENTICITY INDEX
                        </LqText>
                        <Flex align="center" gap="sm">
                          {analysis!.authenticity.verdict === 'authentic' && (
                            <CheckCircle className={styles.autoGen104} size={18} />
                          )}
                          {analysis!.authenticity.verdict === 'suspicious' && (
                            <AlertTriangle className={styles.autoGen105} size={18} />
                          )}
                          {analysis!.authenticity.verdict === 'forged' && (
                            <XCircle className={styles.autoGen106} size={18} />
                          )}
                          <LqText
                            variant="h2"
                            weight="bold"
                            color={analysis!.authenticity.score >= 90 ? 'success' : 'accent'}
                          >
                            {analysis!.authenticity.score}%
                          </LqText>
                        </Flex>
                      </Flex>

                      <Box className={styles.autoGen107}>
                        <Box
                          className={styles.autoGen107Bar}
                          style={{
                            width: `${analysis!.authenticity.score}%`,
                            backgroundColor:
                              analysis!.authenticity.score >= 90
                                ? 'var(--lq-success)'
                                : 'var(--lq-accent)',
                          }}
                        />
                      </Box>

                      <Flex justify="between" align="center">
                        <LqText variant="xs" weight="bold">
                          Verdict: {getVerdictLabel(analysis!.authenticity.verdict)}
                        </LqText>
                        <Button variant="ghost" size="sm" onClick={() => toggleSection('factors')}>
                          {expandedSections.factors ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                          {expandedSections.factors ? 'Hide' : 'View'} Factors
                        </Button>
                      </Flex>

                      {expandedSections.factors && (
                        <Stack gap="sm" mt="sm">
                          {analysis!.authenticity.factors.map(
                            (f: AuthenticityFactor, i: number) => (
                              <Surface key={i} variant="glass" p="sm">
                                <Flex justify="between">
                                  <LqText variant="xs" weight="bold">
                                    {f.type.replace('_', ' ')}
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {f.score}%
                                  </LqText>
                                </Flex>
                                <LqText variant="xs" color="muted">
                                  {f.description}
                                </LqText>
                              </Surface>
                            ),
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </Surface>

                  <Tabs
                    tabs={[
                      { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
                      {
                        key: 'entities',
                        label: 'Entities',
                        icon: <User size={16} />,
                        count: analysis!.entities.length,
                      },
                      {
                        key: 'patterns',
                        label: 'Patterns',
                        icon: <Activity size={16} />,
                        count: analysis!.patterns.length,
                      },
                      {
                        key: 'anomalies',
                        label: 'Anomalies',
                        icon: <ShieldAlert size={16} />,
                        count: analysis!.anomalies.length,
                      },
                      { key: 'metadata', label: 'Metadata', icon: <FileText size={16} /> },
                    ]}
                    activeTab={activeTab}
                    onChange={(k) =>
                      setActiveTab(
                        k as 'dashboard' | 'entities' | 'patterns' | 'anomalies' | 'metadata',
                      )
                    }
                    className={styles.autoGen108}
                  />

                  <Box>
                    {activeTab === 'dashboard' && (
                      <Stack gap="xl">
                        <Grid cols={{ sm: 1, md: 2 }} gap="md">
                          <Surface variant="glass-highlight" p="md">
                            <Stack gap="sm">
                              <LqText variant="xs" weight="bold" color="muted">
                                TECHNICAL FORENSICS
                              </LqText>
                              <Stack gap="xs">
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    Producer
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.technical?.producer || '—'}
                                  </LqText>
                                </Flex>
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    Creator
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.technical?.creator || '—'}
                                  </LqText>
                                </Flex>
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    Created
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.technical?.creationDate || '—'}
                                  </LqText>
                                </Flex>
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    Pages
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.technical?.pageCount || '—'}
                                  </LqText>
                                </Flex>
                              </Stack>
                              <Button variant="secondary" size="sm" onClick={() => {}}>
                                <Download size={10} /> Export Signal Data
                              </Button>
                            </Stack>
                          </Surface>

                          <Surface variant="glass-highlight" p="md">
                            <Stack gap="sm">
                              <LqText variant="xs" weight="bold" color="muted">
                                LINGUISTIC / SENTIMENT
                              </LqText>
                              <Stack gap="xs">
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    FKGL (Readability)
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.linguistic?.readabilityFKGL || '—'}
                                  </LqText>
                                </Flex>
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    Sentiment
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {(metrics?.linguistic?.sentiment || 'neutral')
                                      .charAt(0)
                                      .toUpperCase() +
                                      (metrics?.linguistic?.sentiment || 'neutral').slice(1)}
                                  </LqText>
                                </Flex>
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    TTR
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.linguistic?.typeTokenRatio || '—'}%
                                  </LqText>
                                </Flex>
                                <Flex justify="between">
                                  <LqText variant="xs" color="muted">
                                    Risk Score
                                  </LqText>
                                  <LqText variant="xs" weight="bold">
                                    {metrics?.network?.riskScore || '—'}%
                                  </LqText>
                                </Flex>
                              </Stack>
                            </Stack>
                          </Surface>
                        </Grid>

                        <Surface variant="glass" p="md">
                          <LqText
                            variant="xs"
                            weight="bold"
                            color="muted"
                            style={{ marginBottom: 'lg' }}
                          >
                            SENTIMENT DISTRIBUTION
                          </LqText>
                          <Box className={styles.autoGen109}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Pos', value: summary?.sentimentCounts?.positive || 0 },
                                    { name: 'Neu', value: summary?.sentimentCounts?.neutral || 0 },
                                    { name: 'Neg', value: summary?.sentimentCounts?.negative || 0 },
                                  ]}
                                  dataKey="value"
                                  stroke="none"
                                  outerRadius={60}
                                  label
                                >
                                  {[
                                    'var(--lq-success)',
                                    'var(--lq-text-dim)',
                                    'var(--lq-error)',
                                  ].map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'var(--lq-surface-3)',
                                    border: 'none',
                                    borderRadius: '4px',
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                        </Surface>

                        <Stack gap="sm">
                          <LqText variant="xs" weight="bold" color="muted">
                            HIGH RISK CORRELATES
                          </LqText>
                          <Stack gap="xs">
                            {topRisk.slice(0, 3).map((t) => (
                              <Surface
                                key={t.id}
                                variant="glass-highlight"
                                p="sm"
                                className={styles.autoGen110}
                                onClick={() => openForensicDocument(String(t.id))}
                              >
                                <Flex justify="between" align="center">
                                  <LqText variant="xs" weight="bold">
                                    {t.fileName}
                                  </LqText>
                                  <Badge tone="danger">{`${t.score}% RISK`}</Badge>
                                </Flex>
                              </Surface>
                            ))}
                          </Stack>
                        </Stack>
                      </Stack>
                    )}

                    {activeTab === 'entities' && (
                      <Stack gap="sm">
                        {analysis!.entities.map((e: DetectedEntity, i: number) => {
                          const IconComp = getEntityIcon(e.type);
                          return (
                            <Surface
                              key={i}
                              variant="glass"
                              p="md"
                              className={styles.autoGen111}
                              onClick={() => setSelectedEntity(e)}
                            >
                              <Flex gap="md" align="center">
                                <Box p="xs" className={styles.autoGen112}>
                                  <IconComp size={16} className={styles.autoGen113} />
                                </Box>
                                <Stack gap="none" style={{ flex: 1 }}>
                                  <Flex justify="between" align="center">
                                    <LqText variant="small" weight="bold">
                                      {e.text}
                                    </LqText>
                                    <LqText variant="xs" color="muted">
                                      {Math.round(e.confidence * 100)}% CONF
                                    </LqText>
                                  </Flex>
                                  <LqText variant="xs" color="muted" weight="bold">
                                    {e.type.toUpperCase()}
                                  </LqText>
                                  <LqText variant="xs" color="muted" style={{ marginTop: 'xs' }}>
                                    {e.context}
                                  </LqText>
                                </Stack>
                              </Flex>
                            </Surface>
                          );
                        })}
                      </Stack>
                    )}

                    {activeTab === 'patterns' && (
                      <Stack gap="sm">
                        {analysis!.patterns.map((p: DetectedPattern, i: number) => (
                          <Surface
                            key={i}
                            variant="glass"
                            p="md"
                            style={{
                              borderLeft: `4px solid ${p.significance === 'high' ? 'var(--lq-error)' : 'var(--lq-warning)'}`,
                            }}
                          >
                            <Stack gap="xs">
                              <Flex justify="between">
                                <Badge
                                  tone={p.significance === 'high' ? 'danger' : 'warning'}
                                >{`${p.type.toUpperCase()} PATTERN`}</Badge>
                                <LqText variant="xs" color="muted">
                                  SIG: {p.significance.toUpperCase()}
                                </LqText>
                              </Flex>
                              <LqText variant="small" weight="bold">
                                {p.description}
                              </LqText>
                              <LqText variant="xs" color="muted">
                                Involves: {p.entities.join(', ')}
                              </LqText>
                            </Stack>
                          </Surface>
                        ))}
                      </Stack>
                    )}

                    {activeTab === 'anomalies' && (
                      <Stack gap="sm">
                        {analysis!.anomalies.map((a: DetectedAnomaly, i: number) => (
                          <Surface
                            key={i}
                            variant="glass"
                            p="md"
                            className={cn(
                              'border-l-4',
                              a.severity === 'critical'
                                ? 'border-l-[var(--lq-error)]'
                                : 'border-l-[var(--lq-accent)]',
                            )}
                          >
                            <Stack gap="xs">
                              <Flex justify="between">
                                <Badge
                                  tone={a.severity === 'critical' ? 'danger' : 'accent'}
                                >{`${a.type.toUpperCase()} ANOMALY`}</Badge>
                                <LqText variant="xs" color="muted">
                                  {a.severity.toUpperCase()}
                                </LqText>
                              </Flex>
                              <LqText variant="small" weight="bold">
                                {a.description}
                              </LqText>
                              <LqText variant="xs" color="muted">
                                {a.explanation}
                              </LqText>
                              {a.requiresInvestigation && (
                                <Flex align="center" gap="xs" mt="xs" className={styles.autoGen114}>
                                  <AlertTriangle size={12} />
                                  <LqText variant="xs" weight="bold">
                                    REQUIRES IMMEDIATE INVESTIGATION
                                  </LqText>
                                </Flex>
                              )}
                            </Stack>
                          </Surface>
                        ))}
                      </Stack>
                    )}

                    {activeTab === 'metadata' && (
                      <DocumentMetadataPanel
                        document={{
                          id: documentId,
                          metadata: {
                            technical: metrics?.technical || analysis!.metadata!.technical,
                            structure: metrics?.structural || analysis!.metadata!.structure,
                            linguistics: metrics?.linguistic || analysis!.metadata!.linguistics,
                            network: metrics?.network || analysis!.metadata!.network,
                            tags: analysis!.metadata!.tags,
                          },
                        }}
                      />
                    )}
                  </Box>
                </Stack>
              )}
            </Surface>
          </Box>
        )}
      </Flex>

      {/* Entity Detail Overlay */}
      {selectedEntity && (
        <Box className={styles.autoGen115} onClick={() => setSelectedEntity(null)}>
          <Surface
            variant="panel"
            style={{ width: 500 }}
            p="xxl"
            className={styles.autoGen116}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack gap="xl">
              <Flex justify="between" align="start">
                <Stack gap="none">
                  <LqText variant="h3" weight="bold">
                    {selectedEntity.text}
                  </LqText>
                  <LqText variant="small" color="accent" weight="bold">
                    {selectedEntity.type.toUpperCase()}
                  </LqText>
                </Stack>
                <Button variant="ghost" size="sm" onClick={() => setSelectedEntity(null)}>
                  <XCircle size={18} />
                </Button>
              </Flex>

              <Grid cols={{ base: 1, sm: 2 }} gap="md">
                <Surface variant="glass" p="md">
                  <LqText variant="xs" weight="bold" color="muted">
                    DETECTION CONFIDENCE
                  </LqText>
                  <LqText variant="h2" weight="bold">
                    {Math.round(selectedEntity.confidence * 100)}%
                  </LqText>
                </Surface>
                <Surface variant="glass" p="md">
                  <LqText variant="xs" weight="bold" color="muted">
                    SOURCE TOKEN
                  </LqText>
                  <LqText variant="small" weight="bold">
                    {selectedEntity.text}
                  </LqText>
                </Surface>
              </Grid>

              <Stack gap="sm">
                <LqText variant="xs" weight="bold" color="muted">
                  CONTEXTUAL PRESENCE
                </LqText>
                <Surface variant="glass" p="md">
                  <LqText variant="xs" color="muted" style={{ fontStyle: 'italic' }}>
                    "... {selectedEntity.context} ..."
                  </LqText>
                </Surface>
              </Stack>

              {selectedEntity.crossReferences.length > 0 && (
                <Stack gap="sm">
                  <LqText variant="xs" weight="bold" color="muted">
                    CROSS-REFERENCES
                  </LqText>
                  <Flex wrap="wrap" gap="xs">
                    {selectedEntity.crossReferences.map((ref, i) => (
                      <Badge key={i}>{ref}</Badge>
                    ))}
                  </Flex>
                </Stack>
              )}

              <Button variant="primary" onClick={() => setSelectedEntity(null)}>
                Close Intelligence Detail
              </Button>
            </Stack>
          </Surface>
        </Box>
      )}
    </Box>
  );
};

export default ForensicDocumentAnalyzer;
