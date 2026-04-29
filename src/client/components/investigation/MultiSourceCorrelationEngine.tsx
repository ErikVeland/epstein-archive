import { useState, useEffect } from 'react';
import Icon, { type IconName, type IconProps } from '@client/components/common/Icon';
import { format } from 'date-fns';

// UI Library
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  LqText,
  SearchField,
  Select,
  Stack,
  Surface,
  cn,
} from '@client/design-system/lib';
import { useIsMobile } from '@client/hooks/useIsMobile';
import { MobileStackHeader } from '../layout/MobileStackHeader';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import styles from './MultiSourceCorrelationEngine.module.css';

const css = <T,>(style: T) => style;

interface DataSource {
  id: string;
  type: 'financial' | 'communication' | 'travel' | 'document' | 'social' | 'legal';
  name: string;
  description: string;
  lastUpdated: string;
  reliability: 'low' | 'medium' | 'high' | 'verified';
  recordCount: number;
  coverage: number;
}

interface CorrelationResult {
  id: string;
  type: 'temporal' | 'spatial' | 'entity' | 'financial' | 'behavioral' | 'communication';
  confidence: number;
  description: string;
  sources: string[];
  entities: string[];
  timeRange: { start: string; end: string };
  location?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  anomalies: string[];
}

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  type: 'automatic' | 'manual' | 'ml_suggested';
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  lastTriggered?: string;
  triggerCount: number;
}

interface MultiSourceCorrelationEngineProps {
  mobileMode?: boolean;
}

export const MultiSourceCorrelationEngine = ({
  mobileMode: _mobileMode,
}: MultiSourceCorrelationEngineProps = {}) => {
  const isMobile = useIsMobile();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationResult[]>([]);
  const [_correlationRules, setCorrelationRules] = useState<CorrelationRule[]>([]);
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelationResult | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSignificance, setFilterSignificance] = useState<string>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const recomputeCorrelations = async () => {
    try {
      setIsAnalyzing(true);
      setAnalysisProgress(30);

      const resp = await fetch('/api/analytics/correlations');
      if (!resp.ok) throw new Error('Failed to fetch correlations');
      const data = await resp.json();

      setAnalysisProgress(80);
      setDataSources(data.dataSources || []);
      setCorrelations(data.correlations || []);
      setCorrelationRules(data.rules || []);
      setAnalysisProgress(100);
    } catch {
      setDataSources([]);
      setCorrelationRules([]);
      setCorrelations([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    recomputeCorrelations();
  }, []);

  const getSourceIcon = (type: string, size: IconProps['size'] = 'sm') => {
    switch (type) {
      case 'financial':
        return <Icon name="DollarSign" size={size} />;
      case 'communication':
        return <Icon name="Mail" size={size} />;
      case 'travel':
        return <Icon name="MapPin" size={size} />;
      case 'document':
        return <Icon name="FileText" size={size} />;
      case 'social':
        return <Icon name="User" size={size} />;
      case 'legal':
        return <Icon name="Building" size={size} />;
      default:
        return <Icon name="Database" size={size} />;
    }
  };

  const getReliabilityVariant = (
    reliability: string,
  ): 'accent' | 'success' | 'warning' | 'error' | 'glass' => {
    switch (reliability) {
      case 'verified':
        return 'success';
      case 'high':
        return 'accent';
      case 'medium':
        return 'warning';
      default:
        return 'glass';
    }
  };

  const filteredCorrelations = correlations.filter((c) => {
    const matchesSearch =
      searchTerm === '' ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.entities.some((e) => e.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || c.type === filterType;
    const matchesSignificance =
      filterSignificance === 'all' || c.significance === filterSignificance;
    return matchesSearch && matchesType && matchesSignificance;
  });

  const exportCorrelations = () => {
    const data = {
      correlations: filteredCorrelations,
      dataSources,
      exportDate: new Date().toISOString(),
      summary: {
        total: filteredCorrelations.length,
        critical: filteredCorrelations.filter((c) => c.significance === 'critical').length,
        avgConfidence:
          filteredCorrelations.reduce((s, c) => s + c.confidence, 0) /
          (filteredCorrelations.length || 1),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `correlation-analysis-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box className={styles.autoGen307} style={css({ backgroundColor: 'var(--lq-surface-1)' })}>
      <Stack gap="xl" className={styles.autoGen308}>
        {/* Header HUD - HIDDEN ON MOBILE */}
        {!isMobile && (
          <Surface variant="glass" p="xl" className={styles.autoGen309}>
            <Flex justify="between" align="start">
              <Stack gap="none">
                <Flex align="center" gap="md">
                  <Icon name="Layers" size="lg" className={styles.autoGen310} />
                  <LqText variant="h1" weight="bold">
                    Multi-Source Correlation Engine
                  </LqText>
                </Flex>
                <LqText
                  variant="xs"
                  color="muted"
                  weight="bold"
                  style={css({ textTransform: 'uppercase' })}
                  mt="xs"
                >
                  Neural Cross-Reference • Forensic Pattern Derivation
                </LqText>
              </Stack>
              <Flex gap="md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportCorrelations}
                  className={styles.autoGen311}
                >
                  <Icon name="Download" size="sm" className={styles.mr2} /> Export Analysis
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={recomputeCorrelations}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Icon name="Loader2" size="sm" className={`animate-spin ${styles.mr2}`} />
                  ) : (
                    <Icon name="Zap" size="sm" className={styles.mr2} />
                  )}
                  {isAnalyzing ? `Analyzing Signals (${analysisProgress}%)` : 'Execute Analysis'}
                </Button>
              </Flex>
            </Flex>

            {/* Search/Filter HUD */}
            <Box mt="xl" pt="xl" className={styles.autoGen312}>
              <Grid cols={4} gap="lg" align="end">
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    SIGNAL SEARCH
                  </LqText>
                  <SearchField
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter entities..."
                    rootClassName={styles.searchFieldRoot}
                    className={styles.searchFieldInput}
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    CORRELATION TYPE
                  </LqText>
                  <Select
                    size="sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Modalities' },
                      { value: 'temporal', label: 'Temporal' },
                      { value: 'spatial', label: 'Spatial' },
                      { value: 'entity', label: 'Entity' },
                      { value: 'financial', label: 'Financial' },
                    ]}
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    SIGNIFICANCE SCALE
                  </LqText>
                  <Select
                    size="sm"
                    value={filterSignificance}
                    onChange={(e) => setFilterSignificance(e.target.value)}
                    options={[
                      { value: 'all', label: 'All Significance' },
                      { value: 'critical', label: 'Critical' },
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                    ]}
                  />
                </Stack>
                <Flex gap="md" align="center" className={styles.autoGen315}>
                  <Icon name="Activity" size="sm" className={styles.autoGen316} />
                  <LqText variant="xs" weight="bold" color="muted">
                    {filteredCorrelations.length} Intersections Extracted
                  </LqText>
                </Flex>
              </Grid>
            </Box>
          </Surface>
        )}

        {/* Global Metrics HUD */}
        <Grid cols={isMobile ? 1 : 4} gap="lg">
          {[
            {
              label: 'Intelligence Sources',
              val: dataSources.length,
              iconName: 'Database' as IconName,
              tone: 'accent',
            },
            {
              label: 'Active Intersections',
              val: filteredCorrelations.length,
              iconName: 'Layers' as IconName,
              tone: 'success',
            },
            {
              label: 'Critical Anomalies',
              val: filteredCorrelations.filter((c) => c.significance === 'critical').length,
              iconName: 'AlertTriangle' as IconName,
              tone: 'error',
            },
            {
              label: 'Avg Confidence',
              val: `${Math.round(filteredCorrelations.reduce((s, c) => s + c.confidence, 0) / (filteredCorrelations.length || 1))}%`,
              iconName: 'TrendingUp' as IconName,
              tone: 'accent',
            },
          ].map((m) => (
            <Surface key={m.label} variant="glass-highlight" p="lg" className={styles.autoGen317}>
              <Flex justify="between" align="center">
                <Stack gap="none">
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={css({ textTransform: 'uppercase' })}
                  >
                    {m.label}
                  </LqText>
                  <LqText variant="h2" weight="bold">
                    {m.val}
                  </LqText>
                </Stack>
                <Box
                  className={cn(
                    styles.p2,
                    'rounded-lg',
                    m.tone === 'error'
                      ? 'bg-[var(--lq-error-dim)] text-[var(--lq-error)]'
                      : m.tone === 'success'
                        ? 'bg-[var(--lq-success-dim)] text-[var(--lq-success)]'
                        : 'bg-[var(--lq-accent-dim)] text-[var(--lq-accent)]',
                  )}
                >
                  <Icon name={m.iconName} size="lg" />
                </Box>
              </Flex>
            </Surface>
          ))}
        </Grid>

        <Flex gap="xl" align="start" direction={isMobile ? 'column' : 'row'}>
          {/* Main Correlation Stream */}
          <Stack gap="md" style={css({ flex: 1 })}>
            <Flex align="center" gap="md">
              <Icon name="Terminal" size="sm" className={styles.autoGen318} />
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={css({ textTransform: 'uppercase' })}
              >
                Forensic Intersection Stream
              </LqText>
              <Box grow className={styles.autoGen319} />
            </Flex>

            <Stack gap="md">
              {filteredCorrelations.map((c) => (
                <Surface
                  key={c.id}
                  variant="glass-highlight"
                  p="lg"
                  className={cn(
                    'border transition-all cursor-pointer',
                    selectedCorrelation?.id === c.id
                      ? 'border-[var(--lq-accent)] bg-[var(--lq-accent-dim)]'
                      : 'border-[var(--lq-surface-3)] hover:border-[var(--lq-accent)]',
                  )}
                  onClick={() => setSelectedCorrelation(c)}
                >
                  <Stack gap="md">
                    <Flex justify="between" align="center">
                      <Flex gap="sm" align="center">
                        <Badge variant="glass" label={c.type.toUpperCase()} size="sm" />
                        <LqText
                          variant="xs"
                          weight="bold"
                          color={c.confidence >= 80 ? 'success' : 'warning'}
                        >
                          {c.confidence}% CLARITY
                        </LqText>
                      </Flex>
                      <Badge
                        variant={c.significance === 'critical' ? 'error' : 'warning'}
                        label={c.significance.toUpperCase()}
                        size="sm"
                      />
                    </Flex>

                    <LqText variant="small" weight="medium" lineHeight="relaxed">
                      {c.description}
                    </LqText>

                    <Flex gap="xs" wrap="wrap">
                      {c.entities.map((e) => (
                        <Badge key={e} variant="glass-highlight" label={e} size="sm" />
                      ))}
                    </Flex>

                    <Flex
                      justify="between"
                      align="center"
                      mt="sm"
                      pt="sm"
                      className={styles.autoGen320}
                    >
                      <Flex gap="md">
                        <Flex align="center" gap="xs">
                          <Icon name="Calendar" size="xs" className={styles.autoGen321} />
                          <LqText variant="xs" color="muted">
                            {c.timeRange.start}
                          </LqText>
                        </Flex>
                        {c.location && (
                          <Flex align="center" gap="xs">
                            <Icon name="MapPin" size="xs" className={styles.autoGen322} />
                            <LqText variant="xs" color="muted">
                              {c.location}
                            </LqText>
                          </Flex>
                        )}
                      </Flex>
                      <LqText variant="xs" color="muted" weight="bold">
                        {c.sources.length} SIGNAL SOURCES
                      </LqText>
                    </Flex>
                  </Stack>
                </Surface>
              ))}
            </Stack>
          </Stack>

          {/* Intelligence Side Panel - HUD Only for Mobile (Details are Stacked) */}
          <Stack gap="xl" width={isMobile ? '100%' : 380}>
            {/* Source Inventory - HIDDEN ON MOBILE TO PRESERVE DENSITY */}
            {!isMobile && (
              <Surface variant="glass" p="lg" className={styles.autoGen323}>
                <Stack gap="lg">
                  <Flex align="center" gap="md">
                    <Icon name="Activity" size="sm" className={styles.autoGen324} />
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={css({ textTransform: 'uppercase' })}
                    >
                      Signal Inventory
                    </LqText>
                  </Flex>
                  <Stack gap="sm">
                    {dataSources.map((s) => (
                      <Surface
                        key={s.id}
                        variant="glass-highlight"
                        p="md"
                        className={styles.autoGen325}
                      >
                        <Stack gap="sm">
                          <Flex justify="between" align="center">
                            <Flex align="center" gap="sm">
                              {getSourceIcon(s.type, 'xs')}
                              <LqText variant="xs" weight="bold">
                                {s.name}
                              </LqText>
                            </Flex>
                            <Badge
                              variant={getReliabilityVariant(s.reliability)}
                              label={s.reliability.toUpperCase()}
                              size="sm"
                            />
                          </Flex>
                          <LqText variant="xs" color="muted" className="line-clamp-2">
                            {s.description}
                          </LqText>
                          <Stack gap="xxxs">
                            <Flex justify="between">
                              <LqText variant="xxxs" color="muted">
                                COVERAGE
                              </LqText>
                              <LqText variant="xxxs" weight="bold">
                                {s.coverage}%
                              </LqText>
                            </Flex>
                            <Box className={styles.autoGen326}>
                              <Box
                                className={styles.autoGen327}
                                style={css({ width: `${s.coverage}%` })}
                              />
                            </Box>
                          </Stack>
                        </Stack>
                      </Surface>
                    ))}
                  </Stack>
                </Stack>
              </Surface>
            )}

            {/* Intersection Details - FULL SCREEN STACK ON MOBILE */}
            {selectedCorrelation && (
              <div className={cn(styles.autoGen328, isMobile && styles.fullScreenMobile)}>
                {isMobile && (
                  <MobileStackHeader
                    title="Intersection Analysis"
                    subtitle={`${selectedCorrelation.sources.length} Signal Vectors`}
                    onBack={() => setSelectedCorrelation(null)}
                  />
                )}
                <Stack gap="lg" className={isMobile ? styles.fullScreenContent : ''}>
                  <Flex justify="between" align="center">
                    {!isMobile && (
                      <LqText
                        variant="xs"
                        weight="bold"
                        color="muted"
                        style={css({ textTransform: 'uppercase' })}
                      >
                        Intersection Analysis
                      </LqText>
                    )}
                    <AddToInvestigationButton
                      item={{
                        id: selectedCorrelation.id,
                        title: `Correlation: ${selectedCorrelation.description}`,
                        description: selectedCorrelation.description,
                        type: 'evidence',
                        sourceId: selectedCorrelation.id,
                      }}
                      investigations={[]}
                      onAddToInvestigation={() => {}}
                      variant="icon"
                    />
                  </Flex>

                  <Stack gap="md">
                    <Stack gap="xxxs">
                      <LqText variant="xxxs" color="muted" weight="bold">
                        CONFIDENCE METRIC
                      </LqText>
                      <LqText
                        variant="h1"
                        weight="bold"
                        color={selectedCorrelation.confidence >= 80 ? 'success' : 'warning'}
                      >
                        {selectedCorrelation.confidence}%
                      </LqText>
                    </Stack>

                    <Stack gap="sm">
                      <LqText variant="xxxs" color="muted" weight="bold">
                        SUPPORTING SIGNAL NODES
                      </LqText>
                      <Stack gap="xs">
                        {selectedCorrelation.evidence.map((ev, i) => (
                          <Flex key={i} align="start" gap="sm">
                            <Icon name="CheckCircle" size="xs" className={styles.autoGen329} />
                            <LqText variant="xs" color="muted" lineHeight="relaxed">
                              {ev}
                            </LqText>
                          </Flex>
                        ))}
                      </Stack>
                    </Stack>

                    {selectedCorrelation.anomalies.length > 0 && (
                      <Stack gap="sm">
                        <LqText variant="xxxs" color="danger" weight="bold">
                          DETECTED ANOMALIES
                        </LqText>
                        <Stack gap="xs">
                          {selectedCorrelation.anomalies.map((an, i) => (
                            <Flex key={i} align="start" gap="sm">
                              <Icon name="AlertCircle" size="xs" className={styles.autoGen330} />
                              <LqText variant="xs" color="danger" lineHeight="relaxed">
                                {an}
                              </LqText>
                            </Flex>
                          ))}
                        </Stack>
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </div>
            )}
          </Stack>
        </Flex>
      </Stack>
    </Box>
  );
};

export default MultiSourceCorrelationEngine;
