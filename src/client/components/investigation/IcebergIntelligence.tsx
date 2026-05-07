import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@client/components/common/Icon';
import { apiClient } from '@client/services/apiClient';
import { useToasts } from '../common/useToasts';
import {
  Badge,
  Button,
  Flex,
  LqText,
  NativeSelect,
  Stack,
  Surface,
  TextInput,
  cn,
} from '@client/design-system/lib';
import type {
  GraphPathDto,
  IcebergLeadDto,
  IcebergSupportingDocumentDto,
  RelationshipExplanationDto,
} from '@shared/dto/iceberg';
import styles from './IcebergIntelligence.module.css';

interface IcebergLeadsResponse {
  data: IcebergLeadDto[];
  total: number;
  limit: number;
  offset: number;
}

interface GraphPathsResponse {
  data: GraphPathDto[];
  total: number;
}

interface DocumentContextResponse {
  documentId: number;
  page: number | null;
  title: string;
  snippets: Array<{
    text: string;
    page: number | null;
    entityIds: number[];
    confidence: number | null;
  }>;
  provenanceStatus: 'complete' | 'partial' | 'missing';
}

interface IcebergIntelligenceProps {
  investigationId: string;
  onOpenDocument?: (documentId: number, page?: number | null) => void;
}

const formatLabel = (value: string) => value.replace(/_/g, ' ');

const confidenceLabel = (value: number | null) => {
  if (value === null) return 'Not scored';
  return `${Math.round(value * 100)}%`;
};

const riskVariant = (score: number | null): 'error' | 'warning' | 'accent' | 'muted' => {
  if (score === null) return 'muted';
  if (score >= 0.8 || score >= 4) return 'error';
  if (score >= 0.55 || score >= 3) return 'warning';
  return 'accent';
};

export const IcebergIntelligence = ({
  investigationId,
  onOpenDocument,
}: IcebergIntelligenceProps) => {
  const { addToast } = useToasts();
  const [leads, setLeads] = useState<IcebergLeadDto[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [paths, setPaths] = useState<GraphPathDto[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<RelationshipExplanationDto | null>(null);
  const [documentContext, setDocumentContext] = useState<DocumentContextResponse | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    motifType: 'all',
    harmType: 'all',
    reviewState: 'all',
    minConfidence: '',
  });

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || leads[0] || null,
    [leads, selectedLeadId],
  );
  const selectedPath = useMemo(
    () => paths.find((path) => path.id === selectedPathId) || paths[0] || null,
    [paths, selectedPathId],
  );

  const loadLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams({ limit: '40', offset: '0' });
      if (filters.motifType !== 'all') params.set('motifType', filters.motifType);
      if (filters.harmType !== 'all') params.set('harmType', filters.harmType);
      if (filters.reviewState !== 'all') params.set('reviewState', filters.reviewState);
      if (filters.minConfidence.trim()) params.set('minConfidence', filters.minConfidence.trim());

      const response = await apiClient.get<IcebergLeadsResponse>(
        `/investigations/${encodeURIComponent(investigationId)}/iceberg/leads?${params.toString()}`,
        { useCache: false },
      );
      setLeads(response.data || []);
      setSelectedLeadId((current) => {
        if (current && response.data?.some((lead) => lead.id === current)) return current;
        return response.data?.[0]?.id || null;
      });
    } catch {
      addToast({ text: 'Iceberg leads could not be loaded', type: 'error' });
      setLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, [addToast, filters, investigationId]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    const entities = selectedLead?.primaryEntities || [];
    if (entities.length < 2) {
      setPaths([]);
      setExplanation(null);
      return;
    }

    let cancelled = false;
    const sourceId = String(entities[0].id);
    const targetId = String(entities[1].id);

    const loadDrilldown = async () => {
      setLoadingDrilldown(true);
      setDocumentContext(null);
      try {
        const [pathResponse, explanationResponse] = await Promise.all([
          apiClient.get<GraphPathsResponse>(
            `/graph/paths?sourceId=${encodeURIComponent(sourceId)}&targetId=${encodeURIComponent(targetId)}&limit=5&minConfidence=0`,
            { useCache: false },
          ),
          apiClient.get<RelationshipExplanationDto>(
            `/graph/edges/${encodeURIComponent(sourceId)}/${encodeURIComponent(targetId)}/explain`,
            { useCache: false },
          ),
        ]);
        if (cancelled) return;
        setPaths(pathResponse.data || []);
        setSelectedPathId(pathResponse.data?.[0]?.id || null);
        setExplanation(explanationResponse);
      } catch {
        if (!cancelled) {
          setPaths([]);
          setExplanation(null);
        }
      } finally {
        if (!cancelled) setLoadingDrilldown(false);
      }
    };

    void loadDrilldown();
    return () => {
      cancelled = true;
    };
  }, [selectedLead]);

  const loadDocumentContext = useCallback(
    async (document: IcebergSupportingDocumentDto) => {
      try {
        const entityIds = selectedLead?.primaryEntities.map((entity) => entity.id).join(',') || '';
        const context = await apiClient.get<DocumentContextResponse>(
          `/documents/${encodeURIComponent(document.documentId)}/context?entityIds=${encodeURIComponent(entityIds)}`,
          { useCache: false },
        );
        setDocumentContext(context);
      } catch {
        setDocumentContext({
          documentId: document.documentId,
          page: null,
          title: document.title,
          snippets: document.snippet
            ? [
                {
                  text: document.snippet,
                  page: null,
                  entityIds: [],
                  confidence: document.confidence,
                },
              ]
            : [],
          provenanceStatus: 'missing',
        });
      }
    },
    [selectedLead],
  );

  const saveSelectedLead = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      await apiClient.post(
        `/investigations/${encodeURIComponent(investigationId)}/iceberg/leads/${encodeURIComponent(selectedLead.id)}/save`,
        {
          itemType: 'lead',
          title: selectedLead.title,
          payload: {
            lead: selectedLead,
            selectedPath,
            explanation,
            documentContext,
            savedAt: new Date().toISOString(),
          },
        },
      );
      addToast({ text: 'Finding saved to the evidence chain', type: 'success' });
    } catch {
      addToast({ text: 'Could not save this finding. Sign in may be required.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const evidenceDocs = useMemo(() => {
    const docs = new Map<number, IcebergSupportingDocumentDto>();
    for (const doc of selectedLead?.supportingDocuments || []) docs.set(doc.documentId, doc);
    for (const doc of explanation?.directEvidence || []) docs.set(doc.documentId, doc);
    return Array.from(docs.values()).slice(0, 8);
  }, [explanation, selectedLead]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Stack gap="xs">
          <Flex align="center" gap="sm">
            <Icon name="Layers" size="lg" className={styles.headerIcon} />
            <LqText variant="h2" weight="bold">
              Iceberg Intelligence
            </LqText>
          </Flex>
          <LqText variant="xs" color="muted">
            Start with surfaced leads, then drill into paths, source documents, timeline context,
            and review-ready evidence chains.
          </LqText>
        </Stack>
        <Button variant="secondary" size="sm" onClick={loadLeads} disabled={loadingLeads}>
          <Icon
            name={loadingLeads ? 'Loader2' : 'RefreshCw'}
            size="sm"
            className={loadingLeads ? styles.spin : ''}
          />
          Refresh
        </Button>
      </header>

      <div className={styles.filters}>
        <NativeSelect
          value={filters.motifType}
          onChange={(event) => setFilters((prev) => ({ ...prev, motifType: event.target.value }))}
        >
          <option value="all">All motifs</option>
          <option value="co_travel">Co-travel</option>
          <option value="co_presence">Co-presence</option>
          <option value="financial_proximity">Financial proximity</option>
          <option value="communication_proximity">Communication proximity</option>
          <option value="missing_provenance">Missing provenance</option>
          <option value="high_risk_bridge">High-risk bridge</option>
        </NativeSelect>
        <NativeSelect
          value={filters.harmType}
          onChange={(event) => setFilters((prev) => ({ ...prev, harmType: event.target.value }))}
        >
          <option value="all">All harm types</option>
          <option value="privacy_exposure">Privacy exposure</option>
          <option value="coercion_or_exploitation">Coercion or exploitation</option>
          <option value="financial_harm">Financial harm</option>
          <option value="legal_process_harm">Legal or process harm</option>
          <option value="institutional_accountability">Institutional accountability</option>
        </NativeSelect>
        <NativeSelect
          value={filters.reviewState}
          onChange={(event) => setFilters((prev) => ({ ...prev, reviewState: event.target.value }))}
        >
          <option value="all">All review states</option>
          <option value="unreviewed">Not yet reviewed</option>
          <option value="accepted">Accepted</option>
          <option value="deferred">Deferred</option>
          <option value="insufficient_evidence">Insufficient evidence</option>
        </NativeSelect>
        <TextInput
          value={filters.minConfidence}
          placeholder="Min confidence 0-1"
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, minConfidence: event.target.value }))
          }
        />
      </div>

      <div className={styles.grid}>
        <Surface variant="glass" className={styles.feedPanel}>
          <Flex justify="between" align="center" className={styles.panelHeader}>
            <LqText variant="small" weight="bold">
              Lead Feed
            </LqText>
            <Badge variant="muted" label={`${leads.length} shown`} />
          </Flex>

          <div className={styles.leadList}>
            {loadingLeads ? (
              <div className={styles.centerState}>
                <Icon name="Loader2" className={styles.spin} />
                <span>Loading source-backed leads</span>
              </div>
            ) : leads.length === 0 ? (
              <div className={styles.centerState}>
                <Icon name="Search" />
                <span>No Iceberg leads match these filters.</span>
              </div>
            ) : (
              leads.map((lead) => (
                <Button
                  key={lead.id}
                  type="button"
                  unstyled
                  variant={selectedLead?.id === lead.id ? 'secondary' : 'ghost'}
                  size="md"
                  className={cn(
                    styles.leadCard,
                    selectedLead?.id === lead.id && styles.leadCardActive,
                  )}
                  onClick={() => setSelectedLeadId(lead.id)}
                >
                  <Flex justify="between" gap="sm" align="start">
                    <span className={styles.leadTitle}>{lead.title}</span>
                    <Badge
                      variant={riskVariant(lead.riskScore)}
                      label={lead.priority.toUpperCase()}
                    />
                  </Flex>
                  <span className={styles.leadSummary}>{lead.sourceSummary}</span>
                  <div className={styles.leadMeta}>
                    <span>{formatLabel(lead.motifType)}</span>
                    <span>{confidenceLabel(lead.confidence)} confidence</span>
                    <span>{lead.evidenceCount} sources</span>
                  </div>
                  <div className={styles.entityRow}>
                    {lead.primaryEntities.slice(0, 3).map((entity) => (
                      <span key={entity.id}>{entity.name}</span>
                    ))}
                  </div>
                </Button>
              ))
            )}
          </div>
        </Surface>

        <Surface variant="glass" className={styles.pathPanel}>
          <Flex justify="between" align="center" className={styles.panelHeader}>
            <LqText variant="small" weight="bold">
              Connection Path
            </LqText>
            {selectedLead && (
              <Badge variant="accent" label={formatLabel(selectedLead.reviewState)} />
            )}
          </Flex>

          {!selectedLead ? (
            <div className={styles.centerState}>Select a lead to inspect its connection path.</div>
          ) : (
            <Stack gap="lg">
              <Surface variant="glass-highlight" p="lg" className={styles.selectedLeadBox}>
                <Stack gap="sm">
                  <LqText variant="body" weight="bold">
                    {selectedLead.title}
                  </LqText>
                  <LqText variant="xs" color="muted">
                    {selectedLead.description || selectedLead.explainability.whyItMatters}
                  </LqText>
                  <Flex gap="sm" wrap="wrap">
                    <Badge
                      variant={riskVariant(selectedLead.riskScore)}
                      label={`Risk ${selectedLead.riskScore ?? 'not scored'}`}
                    />
                    <Badge
                      variant="muted"
                      label={`${selectedLead.contradictionCount} contradictions`}
                    />
                    <Badge variant="muted" label={formatLabel(selectedLead.harmType)} />
                  </Flex>
                </Stack>
              </Surface>

              {loadingDrilldown ? (
                <div className={styles.centerState}>
                  <Icon name="Loader2" className={styles.spin} />
                  <span>Resolving bounded graph paths</span>
                </div>
              ) : paths.length === 0 ? (
                <div className={styles.notice}>
                  This lead has fewer than two resolved entities or no bounded path was found.
                  Source documents can still be reviewed from the evidence panel.
                </div>
              ) : (
                <Stack gap="md">
                  {paths.map((path) => (
                    <Button
                      key={path.id}
                      type="button"
                      unstyled
                      variant={selectedPath?.id === path.id ? 'secondary' : 'ghost'}
                      size="md"
                      className={cn(
                        styles.pathCard,
                        selectedPath?.id === path.id && styles.pathCardActive,
                      )}
                      onClick={() => setSelectedPathId(path.id)}
                    >
                      <Flex justify="between" align="center">
                        <strong>{path.nodes.map((node) => node.name).join(' -> ')}</strong>
                        <span>{Math.round(path.confidence * 100)}%</span>
                      </Flex>
                      <div className={styles.pathEdges}>
                        {path.edges.map((edge) => (
                          <span key={`${edge.source}-${edge.target}-${edge.type}`}>
                            {edge.sourceLabel || edge.source} linked by {formatLabel(edge.type)}
                          </span>
                        ))}
                      </div>
                    </Button>
                  ))}
                </Stack>
              )}

              <Surface variant="glass-highlight" p="lg">
                <Stack gap="sm">
                  <LqText variant="small" weight="bold">
                    Relationship Explainer
                  </LqText>
                  <LqText variant="xs" color="muted">
                    {explanation?.summary || selectedLead.explainability.whyItMatters}
                  </LqText>
                  <div className={styles.explainerGrid}>
                    <div>
                      <strong>Strongest evidence</strong>
                      {(selectedLead.explainability.strongestEvidence.length
                        ? selectedLead.explainability.strongestEvidence
                        : ['Review the source documents listed on the right.']
                      ).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                    <div>
                      <strong>Limitations</strong>
                      {selectedLead.explainability.limitations.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </div>
                </Stack>
              </Surface>
            </Stack>
          )}
        </Surface>

        <Surface variant="glass" className={styles.evidencePanel}>
          <Flex justify="between" align="center" className={styles.panelHeader}>
            <LqText variant="small" weight="bold">
              Evidence Chain
            </LqText>
            <Button
              variant="primary"
              size="sm"
              onClick={saveSelectedLead}
              disabled={!selectedLead || saving}
            >
              <Icon
                name={saving ? 'Loader2' : 'Save'}
                size="sm"
                className={saving ? styles.spin : ''}
              />
              Save
            </Button>
          </Flex>

          <Stack gap="lg">
            <div className={styles.timelineStrip}>
              {(selectedPath?.edges || []).length === 0 ? (
                <span>No dated path edges available.</span>
              ) : (
                selectedPath?.edges.map((edge) => (
                  <div key={`${edge.source}-${edge.target}-time`}>
                    <strong>{formatLabel(edge.type)}</strong>
                    <span>{edge.dateRange.start?.slice(0, 10) || 'start unknown'}</span>
                    <span>{edge.dateRange.end?.slice(0, 10) || 'end unknown'}</span>
                  </div>
                ))
              )}
            </div>

            <Stack gap="sm">
              <LqText variant="xs" weight="bold">
                Source Documents
              </LqText>
              {evidenceDocs.length === 0 ? (
                <div className={styles.notice}>
                  No source documents are attached to this lead yet.
                </div>
              ) : (
                evidenceDocs.map((doc) => (
                  <Button
                    key={doc.documentId}
                    type="button"
                    unstyled
                    variant="ghost"
                    size="md"
                    className={styles.documentCard}
                    onClick={() => loadDocumentContext(doc)}
                  >
                    <strong>{doc.title}</strong>
                    <span>{doc.snippet || 'Open context to inspect available passages.'}</span>
                    <small>
                      {doc.sourceType || 'document'} • {doc.date?.slice(0, 10) || 'date unknown'}
                    </small>
                  </Button>
                ))
              )}
            </Stack>

            {documentContext && (
              <Surface variant="glass-highlight" p="lg" className={styles.contextBox}>
                <Flex justify="between" align="start" gap="sm">
                  <Stack gap="xs">
                    <LqText variant="small" weight="bold">
                      {documentContext.title}
                    </LqText>
                    <LqText variant="xxxs" color="muted">
                      Provenance {documentContext.provenanceStatus}
                    </LqText>
                  </Stack>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onOpenDocument?.(documentContext.documentId, documentContext.page)
                    }
                  >
                    <Icon name="FileSearch" size="sm" />
                    Open
                  </Button>
                </Flex>
                <Stack gap="sm">
                  {documentContext.snippets.length === 0 ? (
                    <div className={styles.notice}>
                      No exact passage was indexed for this context.
                    </div>
                  ) : (
                    documentContext.snippets.slice(0, 4).map((snippet, index) => (
                      <blockquote key={`${snippet.text}-${index}`}>
                        {snippet.text}
                        <small>
                          Page {snippet.page || 'unknown'} • {confidenceLabel(snippet.confidence)}{' '}
                          confidence
                        </small>
                      </blockquote>
                    ))
                  )}
                </Stack>
              </Surface>
            )}
          </Stack>
        </Surface>
      </div>
    </div>
  );
};
