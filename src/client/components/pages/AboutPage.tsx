import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@client/components/common/Icon';
import { Link } from 'react-router-dom';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { Button, Surface } from '@client/design-system/lib';
import s from './AboutPage.module.css';

interface PipelineDataset {
  name: string;
  target: number;
  ingested: number;
  downloaded: number;
}

interface SourceStat {
  title: string;
  count: number;
  documentCount?: number;
  link?: string | null;
  search?: string | null;
  impact?: string;
  impactColor?: string;
  redactionColor?: string;
  redactionStatus?: string;
}

interface PipelineStatus {
  datasets?: PipelineDataset[];
  eta_minutes?: number;
  throughput_docs_sec?: number;
  active_workers?: number;
  media?: {
    total: number;
    processed: number;
    percent: number;
  };
  vlm?: {
    processed: number;
    total: number;
    percent: number;
  };
  enrichment?: {
    processed: number;
    total: number;
    percent: number;
  };
  blocked?: boolean;
  blockedReason?: string | null;
  activeStage?: string | null;
  activeStageDescription?: string | null;
  runtime?: {
    status: 'running' | 'stale' | 'paused' | 'stopped' | string;
    processRunning: boolean;
    checkpointRunning: boolean;
    pid: number | null;
    pidAlive: boolean;
    heartbeatAt: string | null;
    heartbeatAgeSeconds: number | null;
    heartbeatFresh: boolean;
    lastProgressAt: string | null;
    currentFile: string | null;
    currentDocId: number | null;
    phase: string | null;
    exitReason: string | null;
  };
  stage_status?: Record<string, Record<string, number | string | null>>;
  ai_artifacts?: {
    total: number;
    reviewed: number;
  };
  current_run?: {
    id: number;
    status: string;
    control_signal: string | null;
    effective_status?: string;
  } | null;
  exo?: {
    host: string;
    model: string;
  };
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

const faqs = [
  {
    question: 'What is the Epstein Archive?',
    answer:
      'The Epstein Archive is a centralized, searchable database of documents related to the Jeffrey Epstein investigation. It consolidates evidence from multiple sources, including unsealed court documents, police reports, and flight logs.',
  },
  {
    question: 'What does a connection in the archive mean?',
    answer:
      'A connection is a research lead derived from shared documents, mentions, dates, or other source-linked signals. It does not by itself prove contact, knowledge, participation, or a crime.',
  },
  {
    question: 'Can AI determine who committed a crime?',
    answer:
      'No. AI can help locate, transcribe, cluster, and compare evidence. Only admissible evidence tested through a fair legal process can establish criminal responsibility.',
  },
  {
    question: 'Could the records still support new criminal cases?',
    answer:
      'Potentially. Relevant categories can include trafficking, conspiracy, obstruction, evidence tampering, perjury, and financial facilitation. A viable case still requires admissible proof of every element, jurisdiction, and an applicable limitations period.',
  },
  {
    question: 'How does the archive protect survivors?',
    answer:
      'The archive preserves official redactions, limits sensitive media, separates machine-generated leads from verified facts, and asks researchers not to identify or harass victims and survivors.',
  },
];

const STAGE_LABELS: Record<string, string> = {
  ingest: 'Ingest',
  'entity-intelligence': 'Entities',
  'provenance-backfill': 'Provenance',
  'vlm-visuals': 'VLM visuals',
  'image-ocr': 'Image OCR',
  'image-media': 'Image media',
  'email-headers': 'Email headers',
  'extracted-dates': 'Dates',
  'media-extraction': 'Media extract',
  'ai-enrichment': 'AI enrichment',
  'ai-ocr-cleanup': 'AI OCR cleanup',
  'face-ingest': 'Faces',
  'graph-relations': 'Relations',
  'graph-timeline': 'Timeline',
  'graph-financial': 'Finance',
  'graph-claim-triples': 'Claims',
  'document-significance': 'Doc scores',
  'entity-risk': 'Entity risk',
  'semantic-embeddings': 'Embeddings',
  'media-thumbnails': 'Thumbnails',
  'analytics-refresh': 'Analytics',
};

// Helper to get status dot class
const getStatusDotClass = (color: string): string => {
  switch (color) {
    case 'red':
      return s.statusDotRed;
    case 'yellow':
      return s.statusDotYellow;
    case 'green':
      return s.statusDotGreen;
    default:
      return s.statusDotDefault;
  }
};

const getStatusTextClass = (color: string): string => {
  switch (color) {
    case 'red':
      return s.statusTextRed;
    case 'yellow':
      return s.statusTextYellow;
    case 'green':
      return s.statusTextGreen;
    default:
      return s.statusTextDefault;
  }
};

const getImpactChipClass = (color: string): string => {
  switch (color) {
    case 'purple':
    case 'blue':
      return s.impactChipAccent;
    default:
      return s.impactChipDefault;
  }
};

export const AboutPage: React.FC = () => {
  const backLinkState = useBackLinkState();
  const [stats, setStats] = useState({
    documents: 0,
    entities: 0,
    relationships: 0,
    mentions: 0,
    documentsWithMetadata: 0,
    entitiesWithDocuments: 0,
    blackBook: 0,
    media: 0,
    albums: 0,
  });

  const [documentSources, setDocumentSources] = useState<SourceStat[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [activeFaq, setActiveFaq] = useState(0);

  const fetchData = useCallback(async () => {
    const fetchJson = async (url: string): Promise<Record<string, unknown>> => {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return asRecord(await response.json());
    };

    try {
      const [statsResult, blackBookResult, mediaResult] = await Promise.allSettled([
        fetchJson('/api/stats'),
        fetchJson('/api/black-book?limit=1'),
        fetchJson('/api/media/stats'),
      ]);

      const statsRes = statsResult.status === 'fulfilled' ? statsResult.value : {};
      const blackBookRes = blackBookResult.status === 'fulfilled' ? blackBookResult.value : {};
      const mediaRes = mediaResult.status === 'fulfilled' ? mediaResult.value : {};

      setStats({
        documents: Number(statsRes.totalDocuments || 0),
        entities: Number(statsRes.totalEntities || 0),
        relationships: Number(statsRes.totalRelationships || 0),
        mentions: Number(statsRes.totalMentions || 0),
        documentsWithMetadata: Number(statsRes.documentsWithMetadata || 0),
        entitiesWithDocuments: Number(statsRes.entitiesWithDocuments || 0),
        blackBook: Number(blackBookRes.total || 0),
        media: Number(mediaRes.totalImages || 0),
        albums: Number(mediaRes.totalAlbums || 0),
      });

      if (statsRes.collectionStats) {
        const enhancedStats: SourceStat[] = (
          Array.isArray(statsRes.collectionStats) ? statsRes.collectionStats : []
        ).map((src) => {
          const source = asRecord(src);
          let link: string | null = null;
          let search: string | null = asString(source.title);

          if (asString(source.title).includes('Black Book')) {
            link = '/blackbook';
            search = null;
          } else if (asString(source.title).includes('Flight Logs')) {
            search = 'Flight Log';
          } else if (
            asString(source.title).includes('Video') ||
            asString(source.title).includes('Media') ||
            asString(source.title).includes('Testimony')
          ) {
            link = '/media';
            search = null;
          }

          return {
            title: asString(source.title),
            count: asNumber(source.count, 0),
            documentCount: asNumber(source.documentCount ?? source.count, 0),
            impact: asString(source.impact, 'Reference'),
            impactColor: asString(source.impactColor, 'slate'),
            redactionColor: asString(source.redactionColor, 'green'),
            redactionStatus: asString(source.redactionStatus, 'Minimal redactions'),
            link,
            search,
          };
        });
        setDocumentSources(enhancedStats);
      }

      if (statsRes.pipeline_status && typeof statsRes.pipeline_status === 'object') {
        setPipelineStatus(statsRes.pipeline_status as PipelineStatus);
      }
    } catch (e) {
      console.error('Failed to fetch about page stats', e);
    }
  }, []);

  const fetchPipelineStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/stats/pipeline');
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        setPipelineStatus(data as PipelineStatus);
      }
    } catch (e) {
      console.error('Failed to fetch real-time pipeline status', e);
    }
  }, []);

  const handlePipelineControl = async (signal: 'pause' | 'resume' | 'stop') => {
    if (!pipelineStatus?.current_run?.id) return;

    try {
      const response = await fetch('/api/stats/pipeline/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: pipelineStatus.current_run.id, signal }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (e) {
      console.error('Failed to send pipeline control signal:', e);
    }
  };

  const pipelineOverview = useMemo(() => {
    const datasets = Array.isArray(pipelineStatus?.datasets) ? pipelineStatus.datasets : [];
    if (datasets.length === 0) return null;

    const totals = datasets.reduce(
      (acc: { target: number; ingested: number; downloaded: number }, d: PipelineDataset) => {
        const itemTarget = Number(d.target || 0);
        const itemIngested = Number(d.ingested || 0);
        const itemDownloaded = Number(d.downloaded || 0);
        const effectiveTarget = Math.max(itemTarget, itemIngested, itemDownloaded);
        acc.target += effectiveTarget;
        acc.ingested += itemIngested;
        acc.downloaded += itemDownloaded;
        return acc;
      },
      { target: 0, ingested: 0, downloaded: 0 },
    );

    const ingestPercent =
      totals.target > 0 ? Math.min(100, (totals.ingested / totals.target) * 100) : 0;
    const downloadPercent =
      totals.target > 0 ? Math.min(100, (totals.downloaded / totals.target) * 100) : 0;

    return {
      ...totals,
      ingestPercent,
      downloadPercent,
    };
  }, [pipelineStatus]);

  const ingestionComplete = useMemo(() => {
    if (!pipelineOverview) return true;
    if (!pipelineOverview.target) return true;
    // Lenient check for "effectively complete" or 100%
    return (
      pipelineOverview.ingested >= pipelineOverview.target || pipelineOverview.ingestPercent >= 99.9
    );
  }, [pipelineOverview]);

  const pipelineStages = useMemo(() => {
    const stageStatus = pipelineStatus?.stage_status || {};
    const activeStage = pipelineStatus?.activeStage ?? null;
    const runtimeStatus = pipelineStatus?.runtime?.status ?? null;
    const liveStageActive = runtimeStatus === 'running' || runtimeStatus === 'paused';
    return Object.entries(STAGE_LABELS)
      .map(([name, label]) => {
        const stage = stageStatus[name] || {};
        const succeeded = asNumber(stage.succeeded);
        const failed = asNumber(stage.failed);
        const running = asNumber(stage.running);
        const total = succeeded + failed + running;
        const isActive = activeStage === name && liveStageActive;
        return {
          name,
          label,
          succeeded,
          failed,
          running,
          total,
          state:
            running > 0 || isActive
              ? 'running'
              : failed > 0
                ? 'failed'
                : succeeded > 0
                  ? 'done'
                  : 'idle',
        };
      })
      .filter((stage) => stage.total > 0);
  }, [pipelineStatus]);

  const livePipelineStatus = useMemo(() => {
    if (
      !pipelineStatus?.vlm &&
      !pipelineStatus?.enrichment &&
      !pipelineStatus?.activeStage &&
      !pipelineStatus?.blocked
    )
      return null;

    const activeStage = pipelineStatus?.activeStage ?? null;
    const runtime = pipelineStatus?.runtime;
    let processed = 0;
    let total = 0;
    let percent = 0;
    let stageTitle = 'VLM Vision Analysis (AI)';
    let stageSubtext = 'Extracting text & descriptions from images via vision model';

    if (activeStage === 'ai-enrichment' && pipelineStatus?.enrichment) {
      processed = pipelineStatus.enrichment.processed;
      total = pipelineStatus.enrichment.total;
      percent = pipelineStatus.enrichment.percent;
      stageTitle = 'AI Enrichment (AI)';
      stageSubtext = 'Generating reviewable summaries and document-level semantic artifacts';
    } else if (pipelineStatus?.vlm) {
      processed = pipelineStatus.vlm.processed;
      total = pipelineStatus.vlm.total;
      percent = pipelineStatus.vlm.percent;
    }

    return {
      blocked: Boolean(pipelineStatus.blocked),
      blockedReason: pipelineStatus.blockedReason ?? null,
      activeStage,
      activeStageDescription: pipelineStatus.activeStageDescription ?? null,
      runtimeStatus: runtime?.status ?? null,
      heartbeatAgeSeconds: runtime?.heartbeatAgeSeconds ?? null,
      currentFile: runtime?.currentFile ?? null,
      pid: runtime?.pid ?? null,
      processed,
      total,
      percent,
      stageTitle,
      stageSubtext,
    };
  }, [pipelineStatus]);

  useEffect(() => {
    const kickoff = setTimeout(() => {
      void fetchData();
      void fetchPipelineStatus();
    }, 0);
    const timer = setInterval(() => {
      setActiveFaq((prev) => (prev + 1) % faqs.length);
    }, 8000);
    const pollTimer = setInterval(() => {
      void fetchPipelineStatus();
    }, 5000);
    return () => {
      clearTimeout(kickoff);
      clearInterval(timer);
      clearInterval(pollTimer);
    };
  }, [fetchData, fetchPipelineStatus]);

  return (
    <div className={s.pageRoot}>
      {/* Header */}
      <div className={s.header}>
        <h1 className={s.pageTitle}>About the Epstein Archive</h1>
        <p className={s.pageSubtitle}>
          Source-linked evidence, searchable at scale and separated from machine interpretation
        </p>
      </div>

      {/* What is this */}
      <section className={s.glassCard}>
        <div className={s.sectionHeader}>
          <Icon name="FileText" size="xl" className={s.iconAccent} />
          <h2 className={s.sectionTitle}>What is this?</h2>
        </div>
        <p className={s.bodyText}>
          The Epstein Archive preserves and indexes publicly released court records, government
          disclosures, correspondence, exhibits, media, and other records connected to the Jeffrey
          Epstein investigations. It gives journalists, researchers, survivors, and the public a
          direct route from a search result or connection back to its source document.
        </p>
        <p className={s.bodyText}>
          This is not a “client list,” and it does not infer guilt from association. The system uses
          OCR, entity extraction, source provenance, document dates, visual classification, and
          relationship signals to help people find material for human review. Machine-generated text
          and links remain distinct from verified facts and legal findings.
        </p>
      </section>

      {/* The Dataset */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Icon name="Database" size="xl" className={s.iconSuccess} />
          <h2 className={s.sectionTitle}>The Dataset</h2>
        </div>

        <div className={s.statsGrid}>
          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Icon name="FileText" size="md" className={s.iconAccent} />
              Documents
            </h3>
            <p className={`${s.statValue} ${s.statValueAccent}`}>
              {stats.documents.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              Source records across court, government, estate, email, and evidence collections
            </p>
            <div className={s.statDivider}>
              <p className={s.statRepairLabel}>
                <Icon name="Database" size="xs" /> Structured metadata
              </p>
              <p className={s.statRepairCount}>{stats.documentsWithMetadata.toLocaleString()}</p>
              <p className={s.statRepairNote}>Documents with extracted metadata</p>
            </div>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Icon name="Users" size="md" className={s.iconSuccess} />
              Candidate entities
            </h3>
            <p className={`${s.statValue} ${s.statValueSuccess}`}>
              {stats.entities.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              Raw names, organisations, places, roles, and OCR fragments awaiting consolidation
            </p>
            <div className={s.statDivider}>
              <p className={s.statRepairLabel}>
                <Icon name="FileText" size="xs" /> Evidence-linked
              </p>
              <p className={s.statRepairCount}>{stats.entitiesWithDocuments.toLocaleString()}</p>
              <p className={s.statRepairNote}>Candidates linked to one or more records</p>
            </div>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Icon name="Phone" size="md" className={s.iconAccent} />
              Evidence mentions
            </h3>
            <p className={`${s.statValue} ${s.statValueAccent}`}>
              {stats.mentions.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              Source-positioned entity mentions used for search and corroboration
            </p>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Icon name="Image" size="lg" className={s.iconWarning} />
              Connection signals
            </h3>
            <p className={`${s.statValue} ${s.statValueWarning}`}>
              {stats.relationships.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              Candidate links derived from shared evidence. These are leads, not findings of fact.
            </p>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Icon name="Image" size="lg" className={s.iconWarning} />
              Browseable images
            </h3>
            <p className={`${s.statValue} ${s.statValueWarning}`}>{stats.media.toLocaleString()}</p>
            <p className={s.statDescription}>
              Photographs and useful visual evidence across {stats.albums.toLocaleString()} curated
              collections. Page scans stay hidden by default.
            </p>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Icon name="Phone" size="md" className={s.iconAccent} />
              Address-book records
            </h3>
            <p className={`${s.statValue} ${s.statValueAccent}`}>
              {stats.blackBook.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              Structured contact records currently available through the Black Book browser
            </p>
          </div>
        </div>

        <div className={s.sourcesPanel}>
          <div className={s.sourcesPanelHeader}>
            <h3 className={s.sectionTitle} style={{ fontSize: '1.25rem' }}>
              Document Sources
            </h3>
            <span className={s.verifiedBadge}>Verified Sources</span>
          </div>
          <p className={s.sourcesNote}>
            Counts come from the live database. Redaction labels describe the released source
            material and are collection-level estimates, not text recovered behind official
            redactions. The archive preserves those redactions. OCR only transcribes visible
            content.
          </p>

          {/* Mobile Card View (< md) */}
          <div className={s.mobileCardList}>
            {documentSources.map((source, idx) => (
              <div key={idx} className={s.sourceCard}>
                <div className={s.sourceCardTop}>
                  <h4 className={s.sourceCardTitle}>{source.title}</h4>
                  <span
                    className={`${s.impactChip} ${getImpactChipClass(source.impactColor ?? 'slate')}`}
                  >
                    {source.impact}
                  </span>
                </div>

                <p className={s.sourceCardCount}>
                  {source.documentCount?.toLocaleString() || '—'} documents
                </p>

                <div className={s.sourceCardBottom}>
                  <div className={s.statusRow}>
                    <span
                      className={`${s.statusDot} ${getStatusDotClass(source.redactionColor ?? 'green')}`}
                    />
                    <span className={getStatusTextClass(source.redactionColor ?? 'green')}>
                      {source.redactionStatus}
                    </span>
                  </div>

                  <div className={s.sourceCardActions}>
                    {source.link ? (
                      <a href={source.link} className={s.viewBtn}>
                        <Icon name="Eye" size="sm" /> View
                      </a>
                    ) : (
                      <Link
                        to={`/documents?search=${encodeURIComponent(source.search || '')}`}
                        state={backLinkState}
                        className={s.viewBtn}
                      >
                        <Icon name="Eye" size="sm" /> View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className={s.desktopTable}>
            <table className={s.table}>
              <thead className={s.tableHead}>
                <tr>
                  <th>Title</th>
                  <th className={s.thRight}>Documents</th>
                  <th className={s.thNoWrap}>Redaction Status</th>
                  <th className={s.thNoWrap}>Impact</th>
                  <th className={`${s.thRight} ${s.thNoWrap}`}>Action</th>
                </tr>
              </thead>
              <tbody className={s.tableBody}>
                {documentSources.map((source, idx) => (
                  <tr key={idx}>
                    <td className={s.tdTitle}>{source.title}</td>

                    <td className={s.tdCount}>{source.documentCount?.toLocaleString() || '—'}</td>
                    <td className={s.tdNoWrap}>
                      <span className={s.statusRow}>
                        <span
                          className={`${s.statusDot} ${getStatusDotClass(source.redactionColor ?? 'green')}`}
                        />
                        <span className={getStatusTextClass(source.redactionColor ?? 'green')}>
                          {source.redactionStatus}
                        </span>
                      </span>
                    </td>
                    <td className={s.tdNoWrap}>
                      <span
                        className={`${s.impactChip} ${getImpactChipClass(source.impactColor ?? 'slate')}`}
                      >
                        {source.impact}
                      </span>
                    </td>
                    <td className={s.tdActions}>
                      <div className={s.tableActions}>
                        {source.link ? (
                          <a href={source.link} className={s.viewBtn}>
                            <Icon name="Eye" size="sm" />
                            View
                          </a>
                        ) : (
                          <Link
                            to={`/documents?search=${encodeURIComponent(source.search || '')}`}
                            state={backLinkState}
                            className={s.viewBtn}
                          >
                            <Icon name="Eye" size="sm" />
                            View
                          </Link>
                        )}
                        {source.title === 'Unredacted Black Book' && (
                          <a
                            href="/api/downloads/release/black-book"
                            download
                            className={s.downloadBtn}
                            title="Download Original"
                          >
                            <Icon name="Download" size="sm" />
                          </a>
                        )}
                        {source.title === 'Flight Logs' && (
                          <a
                            href="/api/downloads/release/flight-logs"
                            download
                            className={s.downloadBtn}
                            title="Download Original"
                          >
                            <Icon name="Download" size="sm" />
                          </a>
                        )}
                        {source.title !== 'Unredacted Black Book' &&
                          source.title !== 'Flight Logs' && (
                            <Button
                              unstyled
                              disabled
                              className={s.downloadBtnDisabled}
                              title="Download not available"
                            >
                              <Icon name="Download" size="sm" />
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Analysis Article */}
      <Surface as="section" variant="glass-strong" className={s.analysisSection}>
        <div className={s.analysisHeader}>
          <Icon name="FileText" size="xl" className={s.iconAccent} />
          <div className={s.analysisHeaderText}>
            <h2 className={s.analysisTitle}>The Epstein Files: Analysis</h2>
            <p className={s.analysisMeta}>
              What Documents Exist, What Enrichment Adds, and What It Cannot Prove | Updated Sep 3,
              2026
            </p>
          </div>
        </div>

        <div className={s.articleBody}>
          <p className={s.articleLead}>
            The source corpus is not a singular, definitive “client list.” It is a large set of
            records created for different purposes, at different times, by different authors. Each
            source can establish only what it records, and machine enrichment cannot increase its
            legal weight.
          </p>

          <h3 className={s.articleH3}>What Documents Actually Exist</h3>
          <p className={s.articleP}>
            The public discourse often conflates distinct datasets—flight logs, contact books, civil
            lawsuit depositions, and estate emails—into a monolithic "Epstein List." In reality, the
            evidence comprises several disparate categories of information, each with unique
            evidentiary value.
          </p>

          <h4 className={s.articleH4}>The Flight Logs</h4>
          <p className={s.articleP}>
            Pilot-recorded manifests for Epstein's private aircraft fleet. These are logistical
            records, not criminal ledgers. The presence of a name establishes only presence, not
            purpose. As legal experts note, "being on the flight log doesn't prove a crime" without
            corroborating testimony.
          </p>

          <h4 className={s.articleH4}>The Black Book</h4>
          <p className={s.articleP}>
            A compilation of phone numbers and addresses. Inclusion shows that contact information
            was recorded. It does not establish the nature of a relationship or any person's
            conduct.
          </p>

          <h4 className={s.articleH4}>The Birthday Book</h4>
          <p className={s.articleP}>
            A collection of photographs, notes, and ephemera assembled for Epstein's 50th birthday.
            It can document authorship, presentation, and social context when those details can be
            authenticated against the source.
          </p>

          <h4 className={s.articleH4}>The Estate Emails (2009-2019)</h4>
          <p className={s.articleP}>
            Correspondence from the post-conviction period. Email headers, participants, quoted
            text, attachments, and dates can be compared across messages, but identity and context
            must be checked in the original record.
          </p>

          <h4 className={s.articleH4}>DOJ Discovery (VOL00001)</h4>
          <p className={s.articleP}>
            A mixed digital-evidence collection that includes images and document records. The
            archive retains available file metadata and provenance so an extracted object can be
            traced back to its source position.
          </p>

          <h4 className={s.articleH4}>DOJ Discovery (VOL00002-8)</h4>
          <p className={s.articleP}>
            Later volumes contain document productions with varied formats and redaction levels. OCR
            makes visible text searchable. It does not reveal text hidden by an official redaction.
          </p>

          <h4 className={s.articleH4}>DOJ Data Sets 9-12 (2026)</h4>
          <p className={s.articleP}>
            These large releases account for much of the current corpus. Available source files are
            served through original-document routes. Ingestion, search indexing, and quality reruns
            remain measurable stages rather than assumed completion. Enrichment preserves source
            text and separates unreviewed output from verified evidence.
            {pipelineOverview && (
              <>
                {' '}
                The current archive contains{' '}
                <strong>{pipelineOverview.ingested.toLocaleString()}</strong> ingested records
                across the new tranches.
              </>
            )}
          </p>

          {/* Ingestion Progress Dashboard */}
          <div className={`soft-glass-accent ${s.ingestionDashboard}`}>
            <h3 className={s.dashboardHeader}>
              <Icon name="Database" size="lg" className={s.iconAccent} />
              Dataset Ingestion Dashboard
              <span
                className={
                  ingestionComplete ? s.statusPillComplete : `${s.statusPillLive} ${s.pulse}`
                }
              >
                {ingestionComplete ? 'Milestone Reached' : 'Live Status'}
              </span>
            </h3>
            <div className={s.datasetList}>
              {pipelineStages.length > 0 && (
                <div className={s.stagePanel}>
                  <div className={s.stagePanelHeader}>
                    <span className={s.datasetName}>Unified Pipeline Stages</span>
                    {pipelineStatus?.ai_artifacts && (
                      <span className={s.datasetIngestStat}>
                        AI ARTIFACTS: {pipelineStatus.ai_artifacts.total.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className={s.stageGrid}>
                    {pipelineStages.map((stage) => (
                      <div
                        key={stage.name}
                        className={`${s.stageChip} ${s[`stageChip_${stage.state}`]}`}
                      >
                        <span className={s.stageDot} />
                        <span className={s.stageName}>{stage.label}</span>
                        <span className={s.stageCount}>
                          {stage.succeeded.toLocaleString()}
                          {stage.failed > 0 ? ` / ${stage.failed.toLocaleString()} failed` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {livePipelineStatus && (
                <div className={s.stagePanel}>
                  {livePipelineStatus.blocked && livePipelineStatus.blockedReason && (
                    <div className={s.blockedBanner}>
                      <Icon name="Clock" size="xs" className={s.iconAccent} />
                      <span>{livePipelineStatus.blockedReason}</span>
                    </div>
                  )}
                  {livePipelineStatus.activeStage && (
                    <div className={s.activeStageRow}>
                      <div className={s.activeStageHeader}>
                        <span className={s.activeStageName}>{livePipelineStatus.activeStage}</span>
                        {livePipelineStatus.runtimeStatus && (
                          <span
                            className={`${s.runtimePill} ${
                              livePipelineStatus.runtimeStatus === 'running'
                                ? s.runtimePillRunning
                                : livePipelineStatus.runtimeStatus === 'stale'
                                  ? s.runtimePillStale
                                  : s.runtimePillStopped
                            }`}
                          >
                            {livePipelineStatus.runtimeStatus}
                          </span>
                        )}
                      </div>
                      {livePipelineStatus.activeStageDescription && (
                        <span className={s.activeStageDesc}>
                          {livePipelineStatus.activeStageDescription}
                        </span>
                      )}
                      <div className={s.runtimeMeta}>
                        {livePipelineStatus.pid && <span>PID {livePipelineStatus.pid}</span>}
                        {livePipelineStatus.heartbeatAgeSeconds !== null && (
                          <span>Heartbeat {livePipelineStatus.heartbeatAgeSeconds}s ago</span>
                        )}
                        {livePipelineStatus.currentFile && (
                          <span title={livePipelineStatus.currentFile}>
                            {livePipelineStatus.currentFile}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {livePipelineStatus.total > 0 && (
                    <div className={s.datasetRowMeta}>
                      <div className={s.mediaProgressHeader}>
                        <span className={s.datasetName}>{livePipelineStatus.stageTitle}</span>
                        <span className={s.mediaSubtext}>{livePipelineStatus.stageSubtext}</span>
                      </div>
                      <div className={s.datasetNumbers}>
                        <span className={s.datasetIngestStat}>
                          PROCESSED: {livePipelineStatus.processed.toLocaleString()} /{' '}
                          {livePipelineStatus.total.toLocaleString()} (
                          {livePipelineStatus.percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className={`soft-glass-inset ${s.progressTrack}`}>
                        <div
                          className={s.progressVlm}
                          style={{ width: `${livePipelineStatus.percent}%` }}
                        >
                          {livePipelineStatus.percent < 100 && (
                            <div className={s.progressShimmer} />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Media Optimization Pass Progress */}
              {pipelineStatus?.media && (
                <div className={s.mediaProgressRow}>
                  <div className={s.datasetRowMeta}>
                    <div className={s.mediaProgressHeader}>
                      <span className={s.datasetName}>Media Optimization Pass (Forensic)</span>
                      <span className={s.mediaSubtext}>
                        Optimizing images, detection archival text, & categorization
                      </span>
                    </div>
                    <div className={s.datasetNumbers}>
                      <span className={s.datasetIngestStat}>
                        PROCESSED: {pipelineStatus.media.processed.toLocaleString()} /{' '}
                        {pipelineStatus.media.total.toLocaleString()} (
                        {pipelineStatus.media.percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className={`soft-glass-inset ${s.progressTrack}`}>
                    <div
                      className={s.progressMedia}
                      style={{ width: `${pipelineStatus.media.percent}%` }}
                    >
                      {pipelineStatus.media.percent < 100 && <div className={s.progressShimmer} />}
                    </div>
                  </div>
                </div>
              )}

              {(pipelineStatus?.datasets || []).map((dataset: PipelineDataset) => {
                const currentIngested = dataset.ingested;
                const currentDownloaded = dataset.downloaded;
                const target = Math.max(dataset.target || 0, currentIngested, currentDownloaded);

                const ingestPercent = Math.min(
                  100,
                  target > 0 ? (currentIngested / target) * 100 : 0,
                );
                const downloadPercent = Math.min(
                  100,
                  target > 0 ? (currentDownloaded / target) * 100 : 0,
                );
                const isComplete = currentIngested >= target;

                return (
                  <div key={dataset.name} className={s.datasetRow}>
                    <div className={s.datasetRowMeta}>
                      <span className={s.datasetName}>{dataset.name}</span>
                      <div className={s.datasetNumbers}>
                        <span className={s.datasetDownloadStat}>
                          FILES SECURED: {currentDownloaded.toLocaleString()} /{' '}
                          {target.toLocaleString()} ({downloadPercent.toFixed(1)}%)
                        </span>
                        <span className={s.datasetIngestStat}>
                          INGESTED: {currentIngested.toLocaleString()} / {target.toLocaleString()} (
                          {ingestPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className={`soft-glass-inset ${s.progressTrack}`}>
                      <div
                        className={s.progressDownload}
                        style={{ width: `${downloadPercent}%` }}
                      />
                      <div
                        className={isComplete ? s.progressIngestComplete : s.progressIngest}
                        style={{ width: `${ingestPercent}%` }}
                      >
                        {!isComplete && <div className={s.progressShimmer} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {!ingestionComplete && pipelineStatus?.eta_minutes && (
              <div className={s.dashboardMeta}>
                <div className={s.throughputRow}>
                  <div className={s.throughputLabel}>
                    <Icon name="TrendingUp" size="sm" className={s.iconAccent} />
                    Cluster throughput: ~{pipelineStatus.throughput_docs_sec?.toFixed(1) ||
                      '68'}{' '}
                    docs/sec
                  </div>
                  <div className={s.etaLabel}>
                    ETA: ~
                    {pipelineStatus.eta_minutes > 1440
                      ? `${(pipelineStatus.eta_minutes / 1440).toFixed(1)} DAYS`
                      : pipelineStatus.eta_minutes > 120
                        ? `${(pipelineStatus.eta_minutes / 60).toFixed(1)} HOURS`
                        : `${pipelineStatus.eta_minutes} MINUTES`}
                  </div>
                </div>

                {pipelineStatus.active_workers !== undefined && (
                  <div className={s.workerRow}>
                    <div className={s.workerDots}>
                      {[1, 2, 3].map((node) => (
                        <div
                          key={node}
                          className={`${s.workerDot} ${node <= (pipelineStatus.active_workers ?? 0) ? s.workerDotActive : s.workerDotIdle}`}
                          title={
                            node <= (pipelineStatus.active_workers ?? 0)
                              ? `Node ${node} Active`
                              : `Node ${node} Idle`
                          }
                        />
                      ))}
                    </div>
                    <div className={s.exoMeta}>
                      <span className={s.workerLabel}>
                        {pipelineStatus.active_workers || 12} Exo Workers Active
                      </span>
                      {pipelineStatus.exo && (
                        <div className={s.exoStatus}>
                          <Icon name="Cpu" size="xs" className={s.iconAccent} />
                          <span>{pipelineStatus.exo.model}</span>
                          <a
                            href={pipelineStatus.exo.host}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={s.exoLink}
                          >
                            EXO Dashboard <Icon name="ExternalLink" size="xs" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pipeline Controls */}
                {pipelineStatus?.current_run && (
                  <div className={s.pipelineControlBar}>
                    <div className={s.controlButtons}>
                      {pipelineStatus.current_run.status === 'running' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={s.controlBtnPause}
                          onClick={() => handlePipelineControl('pause')}
                          disabled={pipelineStatus.current_run.control_signal === 'pause'}
                        >
                          <Icon name="Pause" size="sm" />{' '}
                          {pipelineStatus.current_run.control_signal === 'pause'
                            ? 'Pausing...'
                            : 'Pause Ingestion'}
                        </Button>
                      ) : pipelineStatus.current_run.status === 'paused' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={s.controlBtnResume}
                          onClick={() => handlePipelineControl('resume')}
                        >
                          <Icon name="Play" size="sm" /> Resume Ingestion
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        className={s.controlBtnStop}
                        onClick={() => handlePipelineControl('stop')}
                        disabled={pipelineStatus.current_run.control_signal === 'stop'}
                      >
                        <Icon name="Square" size="sm" />{' '}
                        {pipelineStatus.current_run.control_signal === 'stop'
                          ? 'Stopping...'
                          : 'Stop Pipeline'}
                      </Button>
                    </div>
                    {pipelineStatus.current_run.control_signal && (
                      <span className={s.signalPending}>
                        Pending Signal: {pipelineStatus.current_run.control_signal.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {ingestionComplete && (
              <div className={s.completeBanner}>
                <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
                <p className={s.completeText}>
                  Ingestion has reached 100%. Remaining pipeline work is intelligence analysis,
                  entity normalization, OCR cleanup reruns, and graph enrichment.
                </p>
              </div>
            )}
          </div>

          <h3 className={s.articleH3}>What the Enriched Corpus Exposes</h3>

          <div className={s.discoveryGrid}>
            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Source-positioned mentions</h4>
                <span className={s.redactionBadgeSuccess}>Live count</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <Icon name="FileText" size="sm" className={s.iconAccent} />
                  <span className={s.textSecondary}>
                    {stats.mentions.toLocaleString()} mentions
                  </span>
                </div>
                <p className={s.discoveryCardText}>
                  Search can move from a person, organisation, place, or role to the documents and
                  source positions where the term appears. A mention is not proof of identity or
                  conduct.
                </p>
              </div>
            </div>

            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Cross-document connections</h4>
                <span className={s.redactionBadgeSuccess}>Research leads</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <Icon name="Network" size="sm" className={s.iconAccent} />
                  <span className={s.textSecondary}>
                    {stats.relationships.toLocaleString()} candidate signals
                  </span>
                </div>
                <p className={s.discoveryCardText}>
                  Repeated co-occurrence can reveal records worth comparing across collections. The
                  graph does not establish that two people met, agreed, knew about a crime, or are
                  the same person.
                </p>
              </div>
            </div>

            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Verified visual evidence</h4>
                <span className={s.redactionBadgeSuccess}>Source linked</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <Icon name="Image" size="sm" className={s.iconAccent} />
                  <span className={s.textSecondary}>
                    {stats.media.toLocaleString()} browseable images
                  </span>
                </div>
                <p className={s.discoveryCardText}>
                  The media browser prioritises photographs and useful visual exhibits. It hides
                  scanned text pages and low-information graphics by default while preserving their
                  document and page provenance.
                </p>
              </div>
            </div>

            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Reviewable AI work</h4>
                <span className={s.redactionBadgeWarning}>Not source evidence</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <Icon name="Shield" size="sm" className={s.iconAccent} />
                  <span className={s.textSecondary}>
                    {(pipelineStatus?.ai_artifacts?.total || 0).toLocaleString()} stored artifacts
                  </span>
                </div>
                <p className={s.discoveryCardText}>
                  Summaries, visual descriptions, and OCR cleanups carry model, prompt, input,
                  output, confidence, provenance, and review metadata. They never replace the source
                  record automatically.
                </p>
              </div>
            </div>
          </div>

          <div className={`soft-glass-accent ${s.learnedBox}`}>
            <h4 className={s.learnedTitle}>
              <Icon name="Search" size="md" />
              High-value lines of inquiry
            </h4>
            <ul className={s.learnedList}>
              <li>
                <strong className={s.textPrimary}>Corroboration:</strong> compare independent
                records that place the same event, person, property, payment, or communication in
                context.
              </li>
              <li>
                <strong className={s.textPrimary}>Operational pathways:</strong> trace scheduling,
                recruitment, travel, property access, staffing, and payments across source
                collections.
              </li>
              <li>
                <strong className={s.textPrimary}>Institutional interfaces:</strong> identify
                records involving banks, companies, professional advisers, and public agencies for
                closer review.
              </li>
              <li>
                <strong className={s.textPrimary}>Contradictions and gaps:</strong> compare
                testimony, dates, logs, and correspondence while preserving uncertainty and official
                redactions.
              </li>
            </ul>
            <div className={s.learnedFooter}>
              <Link to="/investigations" className={s.learnedLink}>
                <Icon name="Search" size="sm" />
                Build a source-linked investigation
              </Link>
            </div>
          </div>

          <Surface className={s.legalPanel}>
            <h3 className={s.legalPanelTitle}>
              <Icon name="Scale" size="lg" className={s.iconSuccess} />
              From Archive Signal to Legal Case
            </h3>

            <div className={s.legalThresholdGrid}>
              <div className={`soft-glass-inset ${s.thresholdCard}`}>
                <div className={`${s.thresholdBadge} ${s.thresholdBadgeNeutral}`}>Association</div>
                <p className={s.thresholdText}>
                  A name, address-book entry, flight, photograph, or shared document does not prove
                  a crime.
                </p>
              </div>

              <div className={`soft-glass-inset ${s.thresholdCard}`}>
                <div className={`${s.thresholdBadge} ${s.thresholdBadgeWarning}`}>
                  Corroboration
                </div>
                <p className={s.thresholdText}>
                  Independent records can strengthen a lead when identity, time, place, and source
                  are verified.
                </p>
              </div>

              <div className={`soft-glass-inset ${s.thresholdCard}`}>
                <div className={`${s.thresholdBadge} ${s.thresholdBadgeDanger}`}>
                  Criminal proof
                </div>
                <p className={s.thresholdText}>
                  Prosecutors must prove each charged element with admissible evidence beyond a
                  reasonable doubt.
                </p>
              </div>
            </div>

            <div className={`soft-glass-accent ${s.dojFindings}`}>
              <h4 className={s.dojFindingsTitle}>Potential avenues for lawful investigation</h4>
              <p className={s.dojFindingsText}>
                Depending on the evidence and jurisdiction, records may be relevant to sex
                trafficking, conspiracy, obstruction, evidence tampering, perjury, false statements,
                financial facilitation, or related civil claims. Federal law permits prosecution of
                a section 1591 offence without a limitations period. This archive cannot decide
                whether any person should be charged.
              </p>
              <p className={s.dojFindingsText}>
                Read the governing federal provisions:{' '}
                <a
                  href="https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section1591"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.inlineLink}
                >
                  18 U.S.C. § 1591
                </a>
                ,{' '}
                <a
                  href="https://uscode.house.gov/view.xhtml?edition=prelim&num=0&req=granuleid%3AUSC-prelim-title18-section1594"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.inlineLink}
                >
                  § 1594
                </a>
                ,{' '}
                <a
                  href="https://uscode.house.gov/view.xhtml?edition=prelim&req=granuleid%3AUSC-prelim-title18-section3299"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.inlineLink}
                >
                  § 3299
                </a>
                , and{' '}
                <a
                  href="https://uscode.house.gov/view.xhtml?req=%28title%3A18+section%3A1519+edition%3Aprelim%29"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.inlineLink}
                >
                  § 1519
                </a>
                .
              </p>
            </div>

            <p className={s.legalNote}>
              <strong className={`${s.textSecondary} ${s.notItalic}`}>
                Accountability and limits:
              </strong>{' '}
              The Justice Department's{' '}
              <a
                href="https://www.justice.gov/usao-sdny/programs/victim-witness-services/united-states-v-jeffrey-epstein-19-cr-490-rmb"
                target="_blank"
                rel="noopener noreferrer"
                className={s.inlineLink}
              >
                case record
              </a>{' '}
              documents Jeffrey Epstein's 2008 state conviction and 2019 federal charges; the
              federal charges were not adjudicated before his death. Ghislaine Maxwell's{' '}
              <a
                href="https://www.justice.gov/usao-sdny/pr/statement-us-attorney-damian-williams-verdict-us-v-ghislaine-maxwell"
                target="_blank"
                rel="noopener noreferrer"
                className={s.inlineLink}
              >
                2021 federal conviction
              </a>{' '}
              is a legal outcome. The archive does not label an uncharged person a perpetrator
              because an algorithm found their name. The Justice Department's own{' '}
              <a
                href="https://www.justice.gov/archives/opa/pr/statement-doj-office-professional-responsibility-report-jeffrey-epstein-2006-2008"
                target="_blank"
                rel="noopener noreferrer"
                className={s.inlineLink}
              >
                professional-responsibility review
              </a>{' '}
              found poor judgment in the 2006–2008 federal resolution. It also found that victims
              were not treated with the expected forthrightness and sensitivity. Evidence
              fragmentation, secrecy, redactions, jurisdiction, witness safety, time, and proof
              requirements can all obstruct accountability. They do not erase the need for a lawful,
              survivor-centred investigation.
            </p>
          </Surface>
        </div>
      </Surface>

      {/* How It Works */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Icon name="Network" size="xl" className={s.iconAccent} />
          <h2 className={s.sectionTitle}>How It Works</h2>
        </div>

        <div className={s.howGrid}>
          <div className={s.howCard}>
            <Icon name="Search" size="xl" className={s.iconAccent} />
            <h3 className={s.howCardTitle}>NLP Extraction</h3>
            <p className={s.howCardText}>
              Advanced natural language processing extracts entities, relationships, and context
              from documents
            </p>
          </div>

          <div className={s.howCard}>
            <Icon name="Network" size="xl" className={s.iconSuccess} />
            <h3 className={s.howCardTitle}>Relationship Mapping</h3>
            <p className={s.howCardText}>
              Automatically identifies connections between entities based on co-occurrence and
              context
            </p>
          </div>

          <div className={s.howCard}>
            <Icon name="Shield" size="xl" className={s.iconWarning} />
            <h3 className={s.howCardTitle}>Red Flag Index</h3>
            <p className={s.howCardText}>
              Risk scoring system based on document frequency, evidence types, and contextual
              analysis
            </p>
          </div>
        </div>

        <div className={s.featuresCard}>
          <h3 className={s.featuresTitle}>Key Features</h3>
          <ul className={s.featuresList}>
            <li className={s.featureItem}>
              <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
              Full-text search across all documents
            </li>
            <li className={s.featureItem}>
              <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
              Entity relationship visualization
            </li>
            <li className={s.featureItem}>
              <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
              Timeline of events and document releases
            </li>
            <li className={s.featureItem}>
              <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
              Forensic document analysis
            </li>
            <li className={s.featureItemAccent}>
              <Icon name="TrendingUp" size="sm" className={s.iconAccent} />
              Integrated Side-by-Side PDF Viewer
            </li>
            <li className={s.featureItem}>
              <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
              Investigation workspace with hypothesis tracking
            </li>
            <li className={s.featureItem}>
              <Icon name="CheckCircle2" size="sm" className={s.iconSuccess} />
              Categorised media library with {stats.media.toLocaleString()} images
            </li>
            <li className={s.featureItemAccent}>
              <Icon name="TrendingUp" size="sm" className={s.iconAccent} />
              Audio &amp; Video with synchronized transcripts and chapter markers
            </li>
          </ul>
        </div>
      </section>

      {/* What's Next */}
      <Surface as="section" variant="panel" className={s.whatsNextSection}>
        <div className={s.sectionHeader}>
          <Icon name="Image" size="xl" className={s.iconAccent} />
          <h2 className={s.sectionTitle}>Acquired Source Corpus</h2>
        </div>
        <p className={s.bodyText}>
          Epstein Archive serves acquired source files for the tracked DOJ and media collections
          when an asset is available. Original-document routes keep the searchable record connected
          to its PDF, image, or other source object. Search indexing and AI enrichment are still
          running.
        </p>
        <p className={s.bodyText}>
          As new documents are released through legal proceedings, FOIA requests, and court
          unsealing orders, this platform remains ready for rapid acquisition and ingestion while
          preserving direct access to the source corpus.
        </p>
        <div className={s.statusInfoBox}>
          <p className={s.statusInfoText}>
            <strong>Current Status:</strong>{' '}
            {pipelineOverview
              ? ingestionComplete
                ? `DOJ Data Sets 9-12 ingestion is complete at ${pipelineOverview.ingested.toLocaleString()} / ${pipelineOverview.target.toLocaleString()} (${pipelineOverview.ingestPercent.toFixed(1)}%), with ${pipelineOverview.downloaded.toLocaleString()} files secured (${pipelineOverview.downloadPercent.toFixed(1)}% download coverage). Intelligence analysis is still running across the fully ingested corpus.`
                : `DOJ Data Sets 9-12 are staged in the archive. Live ingestion currently reads ${pipelineOverview.ingested.toLocaleString()} / ${pipelineOverview.target.toLocaleString()} (${pipelineOverview.ingestPercent.toFixed(1)}%) with ${pipelineOverview.downloaded.toLocaleString()} files secured (${pipelineOverview.downloadPercent.toFixed(1)}% download coverage).`
              : 'DOJ Data Sets 9-12 are staged in the archive with active ingestion and enrichment reruns in progress.'}{' '}
            Ongoing pipeline reruns focus on quality gains: OCR cleanup, alias consolidation, and
            stronger role metadata across entities and documents.
            <a
              href="https://github.com/ErikVeland/epstein-archive/tree/main/docs/data-governance-standards.md"
              target="_blank"
              rel="noopener noreferrer"
              className={s.inlineLink}
            >
              Forensic Transparancy &amp; Accountability Charter
            </a>
            .
          </p>
        </div>
        <div className={s.statusHighlightBox}>
          <p className={s.statusHighlightText}>
            <strong>Find High-Impact Documents:</strong> Use the Document Browser and filter by "Red
            Flag Rating" (highest first) to discover the most significant documents. High-risk
            documents (4-5) contain keywords related to victims, trafficking, key figures, and
            financial transactions.
          </p>
        </div>
      </Surface>

      {/* Media Coverage */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Icon name="Newspaper" size="xl" className={s.iconAccent} />
          <h2 className={s.sectionTitle}>Media Coverage</h2>
        </div>

        {/* Featured Articles - Hero Cards */}
        <div className={s.heroCoverageGrid}>
          {/* Hero 1: Substack Article */}
          <a
            href="https://generik.substack.com/p/the-epstein-files-archive"
            target="_blank"
            rel="noopener noreferrer"
            className={s.heroCard1}
          >
            <div className={s.heroCard1Thumb}>
              <div className={s.heroCardIconWrap}>
                <Icon name="FolderOpen" className={s.heroCard1Icon} />
              </div>
              <div className={s.heroCard1Badge}>Featured</div>
            </div>
            <div className={s.heroCardBody}>
              <div className={s.heroCardMeta}>
                <span className={s.heroCardMetaOrange}>The End Times</span>
                <span>•</span>
                <span>Dec 18, 2025</span>
              </div>
              <h3 className={s.heroCardTitle}>The Epstein Files Archive</h3>
              <p className={s.heroCardExcerpt}>
                Making Sense of a Massive Document Trove — An online investigative tool and research
                platform that brings together everything.
              </p>
              <div className={s.heroCardAuthor}>
                <div className={s.avatarCyan}>EV</div>
                <div>
                  <p className={s.authorName}>Erik Veland</p>
                  <p className={s.authorRole}>Author</p>
                </div>
              </div>
            </div>
          </a>

          {/* Hero 2: GovFacts Article */}
          <a
            href="https://govfacts.org/rights-freedoms/government-transparency/public-records-access/the-epstein-files-what-documents-exist-and-what-they-prove/"
            target="_blank"
            rel="noopener noreferrer"
            className={s.heroCard2}
          >
            <div className={s.heroCard2Thumb}>
              <div className={s.heroCardIconWrap}>
                <Icon name="Scale" size="xl" className={s.accentIconLowOp} />
              </div>
              <div className={s.heroCard2Badge}>Genesis</div>
            </div>
            <div className={s.heroCardBody}>
              <div className={s.heroCardMeta}>
                <span className={s.heroCardMetaAccent}>GovFacts</span>
                <span>•</span>
                <span>Nov 16, 2025</span>
              </div>
              <h3 className={s.heroCardTitle}>
                The Epstein Files: What Documents Exist and What They Prove
              </h3>
              <p className={s.heroCardExcerpt}>
                A forensic examination of the investigative materials revealing the stark legal
                boundary between social association and criminal complicity.
              </p>
              <div className={s.heroCardAuthor}>
                <div className={s.avatarBlue}>AO</div>
                <div>
                  <p className={s.authorName}>Alison O'Leary</p>
                  <p className={s.authorRole}>Journalist</p>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* More Coverage - Compact Cards */}
        <div className={s.moreCoveragePanel}>
          <h3 className={s.moreCoverageTitle}>More Coverage</h3>
          <div className={s.compactGrid}>
            <a
              href="https://www.wired.com/story/a-complete-guide-to-the-jeffrey-epstein-document-dumps/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.compactCard} ${s.compactCardWired}`}
            >
              <div className={s.compactThumbRed}>
                <Icon name="Newspaper" size="xl" className={s.iconDanger} />
              </div>
              <div className={s.compactCardBody}>
                <div className={`${s.compactCardSource} ${s.compactCardSourceRed}`}>WIRED</div>
                <p className={s.compactCardTitle}>
                  A Complete Guide to the Jeffrey Epstein Document Dumps
                </p>
              </div>
            </a>
            <a
              href="https://people.com/what-are-the-epstein-files-11781622"
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.compactCard} ${s.compactCardPeople}`}
            >
              <div className={s.compactThumbPink}>
                <Icon name="Users" size="xl" className={s.iconDanger} />
              </div>
              <div className={s.compactCardBody}>
                <div className={`${s.compactCardSource} ${s.compactCardSourcePink}`}>People</div>
                <p className={s.compactCardTitle}>What Are the Epstein Files? Everything to Know</p>
              </div>
            </a>
            <a
              href="https://sfstandard.com/2025/11/21/epstein-emails-san-francisco-jmail/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.compactCard} ${s.compactCardSfStandard}`}
            >
              <div className={s.compactThumbGreen}>
                <Icon name="Mail" size="xl" className={s.iconSuccess} />
              </div>
              <div className={s.compactCardBody}>
                <div className={`${s.compactCardSource} ${s.compactCardSourceGreen}`}>
                  SF Standard
                </div>
                <p className={s.compactCardTitle}>
                  Welcome to JMail: The easiest way to read all the Jeffrey Epstein emails
                </p>
              </div>
            </a>
            <a
              href="https://www.404media.co/podcast-the-epstein-email-dump-is-a-mess/"
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.compactCard} ${s.compactCard404}`}
            >
              <div className={s.compactThumbAccent}>
                <Icon name="Mic" size="xl" className={s.iconAccent} />
              </div>
              <div className={s.compactCardBody}>
                <div className={`${s.compactCardSource} ${s.compactCardSourceAccent}`}>
                  404 Media
                </div>
                <p className={s.compactCardTitle}>Podcast: The Epstein Email Dump Is a Mess</p>
              </div>
            </a>
            <a
              href="https://www.axios.com/2025/11/12/new-epstein-files-emails-released-doj-trump"
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.compactCard} ${s.compactCardAxios}`}
            >
              <div className={s.compactThumbCyan}>
                <Icon name="ClipboardList" size="xl" className={s.iconAccent} />
              </div>
              <div className={s.compactCardBody}>
                <div className={`${s.compactCardSource} ${s.compactCardSourceAccent}`}>Axios</div>
                <p className={s.compactCardTitle}>
                  Here are all the new Epstein files and emails released so far
                </p>
              </div>
            </a>
            <a
              href="https://www.axios.com/2025/12/19/epstein-files-doj-library-images-photos-trump"
              target="_blank"
              rel="noopener noreferrer"
              className={`${s.compactCard} ${s.compactCardAxios}`}
            >
              <div className={s.compactThumbCyan}>
                <Icon name="BookOpen" size="xl" className={s.iconAccent} />
              </div>
              <div className={s.compactCardBody}>
                <div className={`${s.compactCardSource} ${s.compactCardSourceAccent}`}>Axios</div>
                <p className={s.compactCardTitle}>
                  Epstein files are out: What's in the DOJ's library and what's missing
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className={s.legalDisclaimer}>
        <div className={s.legalDisclaimerHeader}>
          <Icon name="AlertTriangle" size="lg" className={s.iconWarning} />
          <h2 className={s.legalDisclaimerTitle}>Legal Disclaimer</h2>
        </div>
        <div className={s.legalDisclaimerBody}>
          <p>
            <strong>This is a research and journalism tool.</strong> The presence of a name in this
            database does not imply criminal activity or wrongdoing. Many individuals appear in
            documents as witnesses, staff, journalists, or peripheral figures.
          </p>
          <p>
            <strong>Legal thresholds matter:</strong> Mere presence on a flight log or in a contact
            book is not evidence of a crime. Complicity requires proof of specific intent to aid
            trafficking. Conspiracy requires proof of an agreement. Association is not guilt.
          </p>
          <p>
            <strong>Source documents:</strong> Records retain their reported source collection and
            available provenance. Researchers must verify source authenticity, identity, context,
            and extracted text before relying on a result.
          </p>
          <p>
            <strong>Consult professionals:</strong> This tool makes government information more
            accessible. Please consult qualified legal professionals for advice specific to your
            circumstances.
          </p>
        </div>
      </section>

      {/* FAQ Link and Carousel */}
      <section className={s.faqSection}>
        <div className={s.faqSectionHeader}>
          <div className={s.faqHeaderLeft}>
            <Icon name="HelpCircle" size="xl" className={s.iconAccent} />
            <h2 className={s.sectionTitle}>Frequently Asked Questions</h2>
          </div>
          <Link to="/faq" className={s.faqLink}>
            Full FAQ
            <Icon name="ArrowRight" className={s.faqLinkArrow} />
          </Link>
        </div>

        <div className={s.faqCarousel}>
          <div className={s.carouselGlow} />

          <div className={s.carouselContent}>
            <div className={s.dotRow}>
              {faqs.map((_, i) => (
                <Button
                  unstyled
                  key={i}
                  onClick={() => setActiveFaq(i)}
                  className={i === activeFaq ? s.dotBtnActive : s.dotBtnInactive}
                />
              ))}
            </div>

            <div>
              <h3 className={s.faqQuestion}>{faqs[activeFaq].question}</h3>
              <p className={s.faqAnswer}>"{faqs[activeFaq].answer}"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className={s.pageFooter}>
        <p>Last updated: Sep 3, 2026</p>
        <p>Built with transparency and accountability in mind</p>
      </div>
    </div>
  );
};

export default AboutPage;
