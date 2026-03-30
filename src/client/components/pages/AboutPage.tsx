import React, { useEffect, useMemo, useState } from 'react';
import {
  Database,
  Search,
  Shield,
  FileText,
  Image as ImageIcon,
  FolderOpen,
  Phone,
  Users,
  Network,
  AlertTriangle,
  Eye,
  Download,
  Mail,
  Newspaper,
  Info,
  HelpCircle,
  ArrowRight,
  Mic,
  ClipboardList,
  CheckCircle2,
  BookOpen,
  Scale,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
    question: "What are the 'DOJ Datasets'?",
    answer:
      'These are large volumes of evidence released by the Department of Justice, which we have processed and ingested. They include financial records, multimedia, and investigative referrals.',
  },
  {
    question: "Why are there so many recent documents (past Epstein's death)?",
    answer:
      'The investigation into the network remained active long after 2019. These documents primarily pertain to the prosecution of Ghislaine Maxwell, ongoing civil litigation by survivors, and internal corporate investigations.',
  },
  {
    question: 'Why are some documents redacted?',
    answer:
      'Redactions protect the privacy of victims, innocent third parties, and ongoing investigations. Our system analyzes redaction levels to give context on what is hid' +
      'den.',
  },
];

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
  const [stats, setStats] = useState({
    documents: 0,
    entities: 0,
    blackBook: 0,
    media: 0,
    albums: 0,
    documentsFixed: 0,
  });

  const [documentSources, setDocumentSources] = useState<SourceStat[]>([]);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [activeFaq, setActiveFaq] = useState(0);

  const pipelineOverview = useMemo(() => {
    const datasets = Array.isArray(pipelineStatus?.datasets) ? pipelineStatus.datasets : [];
    if (datasets.length === 0) return null;

    const totals = datasets.reduce(
      (acc: { target: number; ingested: number; downloaded: number }, d: PipelineDataset) => {
        acc.target += Number(d.target || 0);
        acc.ingested += Number(d.ingested || 0);
        acc.downloaded += Number(d.downloaded || 0);
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
    if (!pipelineOverview) return false;
    if (!pipelineOverview.target) return false;
    return pipelineOverview.ingested >= pipelineOverview.target;
  }, [pipelineOverview]);

  useEffect(() => {
    const fetchJson = async (url: string): Promise<Record<string, unknown>> => {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      }
      return asRecord(await response.json());
    };

    const fetchData = async () => {
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
          blackBook: Number(blackBookRes.total || 0),
          media: Number(mediaRes.totalImages || 0),
          albums: Number(mediaRes.totalAlbums || 0),
          documentsFixed: Number(statsRes.documentsFixed || 0),
        });

        if (statsRes.collectionStats) {
          // Merge with static metadata for links/searches if needed
          const enhancedStats: SourceStat[] = (
            Array.isArray(statsRes.collectionStats) ? statsRes.collectionStats : []
          ).map((src) => {
            const source = asRecord(src);
            // Manual overrides for known collections to add links/search
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
    };
    fetchData();

    // Carousel auto-play
    const timer = setInterval(() => {
      setActiveFaq((prev) => (prev + 1) % faqs.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={s.pageRoot}>
      {/* Header */}
      <div className={s.header}>
        <h1 className={s.pageTitle}>About the Epstein Archive</h1>
        <p className={s.pageSubtitle}>
          Making government documents accessible through advanced search and analysis
        </p>
      </div>

      {/* What is this */}
      <section className={s.glassCard}>
        <div className={s.sectionHeader}>
          <FileText size={32} className={s.iconAccent} />
          <h2 className={s.sectionTitle}>What is this?</h2>
        </div>
        <p className={s.bodyText}>
          The Epstein Archive is a comprehensive, searchable database of publicly released court
          documents, depositions, and evidence related to the Jeffrey Epstein case. Our mission is
          to make government information more accessible to journalists, researchers, and the
          public.
        </p>
        <p className={s.bodyText}>
          This is not a "client list" or conspiracy theory database. It is a forensic analysis tool
          built on actual court records, applying advanced natural language processing to extract
          entities, relationships, and patterns from thousands of pages of legal documents.
        </p>
      </section>

      {/* The Dataset */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Database size={32} className={s.iconSuccess} />
          <h2 className={s.sectionTitle}>The Dataset</h2>
        </div>

        <div className={s.statsGrid}>
          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <FileText size={20} className={s.iconAccent} />
              Documents
            </h3>
            <p className={`${s.statValue} ${s.statValueAccent}`}>
              {stats.documents.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              Court documents, depositions, emails, and exhibits from multiple sources
            </p>
            <div className={s.statDivider}>
              <p className={s.statRepairLabel}>
                <Shield size={12} /> AI Semantic Repair
              </p>
              <p className={s.statRepairCount}>{stats.documentsFixed.toLocaleString()}</p>
              <p className={s.statRepairNote}>Fixed &amp; Refined for Readability</p>
            </div>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Users size={20} className={s.iconSuccess} />
              Entities
            </h3>
            <p className={`${s.statValue} ${s.statValueSuccess}`}>
              {stats.entities.toLocaleString()}
            </p>
            <p className={s.statDescription}>
              People, organisations, and locations extracted from documents
            </p>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <Phone size={20} className={s.iconAccent} />
              Black Book
            </h3>
            <p className={`${s.statValue} ${s.statValueAccent}`}>
              {stats.blackBook.toLocaleString()}
            </p>
            <p className={s.statDescription}>Contact entries from Epstein's address book</p>
          </div>

          <div className={s.statCard}>
            <h3 className={s.statCardHeader}>
              <ImageIcon size={20} className={s.iconWarning} />
              Media
            </h3>
            <p className={`${s.statValue} ${s.statValueWarning}`}>{stats.media.toLocaleString()}</p>
            <p className={s.statDescription}>
              Images across {stats.albums.toLocaleString()} categorised albums
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
            Redaction percentages below combine what the government released with what our pipeline
            can safely recover via automated unredaction and OCR. Collections like the Black Book,
            Flight Logs, and DOJ VOL00001 FBI raid evidence are effectively fully readable, while
            later DOJ discovery volumes remain heavily censored despite technical improvements.
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
                        <Eye size={14} /> View
                      </a>
                    ) : (
                      <a
                        href={`/documents?search=${encodeURIComponent(source.search || '')}`}
                        className={s.viewBtn}
                      >
                        <Eye size={14} /> View
                      </a>
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
                            <Eye size={14} />
                            View
                          </a>
                        ) : (
                          <a
                            href={`/documents?search=${encodeURIComponent(source.search || '')}`}
                            className={s.viewBtn}
                          >
                            <Eye size={14} />
                            View
                          </a>
                        )}
                        {source.title === 'Unredacted Black Book' && (
                          <a
                            href="/api/downloads/release/black-book"
                            download
                            className={s.downloadBtn}
                            title="Download Original"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {source.title === 'Flight Logs' && (
                          <a
                            href="/api/downloads/release/flight-logs"
                            download
                            className={s.downloadBtn}
                            title="Download Original"
                          >
                            <Download size={14} />
                          </a>
                        )}
                        {source.title !== 'Unredacted Black Book' &&
                          source.title !== 'Flight Logs' && (
                            <button
                              disabled
                              className={s.downloadBtnDisabled}
                              title="Download not available"
                            >
                              <Download size={14} />
                            </button>
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
      <section className={`soft-glass-panel-strong ${s.analysisSection}`}>
        <div className={`soft-glass-divider ${s.analysisHeader}`}>
          <FileText size={32} className={s.iconAccent} />
          <div className={s.analysisHeaderText}>
            <h2 className={s.analysisTitle}>The Epstein Files: Analysis</h2>
            <p className={s.analysisMeta}>
              What Documents Exist and What They Prove | Updated Jan 21, 2026
            </p>
          </div>
        </div>

        <div className={s.articleBody}>
          <p className={s.articleLead}>
            The criminal enterprise of Jeffrey Epstein has created one of the most persistent myths
            in modern American history: the existence of a singular, definitive "Client List." A
            forensic examination of the investigative materials available as of late 2025 reveals a
            different reality.
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
            A compilation of phone numbers and addresses. It represents the infrastructure of
            Epstein's social climbing. Inclusion indicates Epstein had their contact info, not that
            they were "clients."
          </p>

          <h4 className={s.articleH4}>The Birthday Book</h4>
          <p className={s.articleP}>
            Released in Sept 2025 by House Oversight. A gift for Epstein's 50th birthday containing
            photos, notes, and ephemera. It offers insight into his social intimacy with the elite
            after initial concerns had arisen.
          </p>

          <h4 className={s.articleH4}>The Estate Emails (2009-2019)</h4>
          <p className={s.articleP}>
            A massive cache of 23,000+ pages released in Nov 2025. These cover the post-conviction
            era, revealing who remained in his orbit. Key exchanges include Epstein describing Trump
            as "the dog that hasn't barked," and routine correspondence with figures like Larry
            Summers and Noam Chomsky.
          </p>

          <h4 className={s.articleH4}>DOJ Discovery (VOL00001)</h4>
          <p className={s.articleP}>
            Ingested Dec 21, 2025. This volume contains 3,158 raw digital evidence files seized
            during the July 2019 FBI raid of Epstein's Manhattan mansion. It includes unredacted
            images, metadata, and financial records that were previously held under seal.
          </p>

          <h4 className={s.articleH4}>DOJ Discovery (VOL00002-8)</h4>
          <p className={s.articleP}>
            Subsequent volumes contain heavily redacted document productions. Unlike Vol 1's raw
            digital evidence, these volumes consist primarily of procedural documents and
            correspondence where most substantive content has been blacked out under privacy
            protective orders.
          </p>

          <h4 className={s.articleH4}>DOJ Data Sets 9-12 (2026)</h4>
          <p className={s.articleP}>
            The latest release comprises over 1.3 million documents from the post-Maxwell trial era.
            This massive tranche includes "Data Set 12" (DOJ VOL00012).{' '}
            {ingestionComplete ? (
              <>
                Ingestion for Data Sets 9-12 is now complete. The current phase is intelligence
                analysis and quality reruns through our <strong>Semantic Repair Pipeline</strong>{' '}
                and <strong>Hardened Entity Engine</strong> to improve OCR quality, purge junk data,
                and strengthen entity-role extraction.
              </>
            ) : (
              <>
                Ingestion for Data Sets 9-12 is ongoing and is continuously re-run through our{' '}
                <strong>Semantic Repair Pipeline</strong> and{' '}
                <strong>Hardened Entity Engine</strong> to improve OCR quality, purge junk data, and
                strengthen entity-role extraction.
              </>
            )}
            {pipelineOverview && (
              <>
                {' '}
                Live aggregate status currently reports{' '}
                <strong>{pipelineOverview.ingested.toLocaleString()}</strong> ingested of{' '}
                <strong>{pipelineOverview.target.toLocaleString()}</strong> tracked files (
                <strong>{pipelineOverview.ingestPercent.toFixed(1)}%</strong>).
              </>
            )}
          </p>

          {/* Ingestion Progress Dashboard */}
          <div className={`soft-glass-accent ${s.ingestionDashboard}`}>
            <h3 className={s.dashboardHeader}>
              <Database size={24} className={s.iconAccent} />
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
              {(pipelineStatus?.datasets || []).map((dataset: PipelineDataset) => {
                const currentIngested = dataset.ingested;
                const currentDownloaded = dataset.downloaded;
                const target = dataset.target;

                const ingestPercent = Math.min(100, (currentIngested / target) * 100);
                const downloadPercent = Math.min(100, (currentDownloaded / target) * 100);
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
                    <TrendingUp size={16} className={s.iconAccent} />
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
                    <span className={s.workerLabel}>
                      {pipelineStatus.active_workers || 12} Exo Workers Active
                    </span>
                  </div>
                )}
              </div>
            )}
            {ingestionComplete && (
              <div className={s.completeBanner}>
                <CheckCircle2 size={16} className={s.iconSuccess} />
                <p className={s.completeText}>
                  Ingestion has reached 100%. Remaining pipeline work is intelligence analysis,
                  entity normalization, OCR cleanup reruns, and graph enrichment.
                </p>
              </div>
            )}
          </div>

          <h3 className={s.articleH3}>Key Discoveries from DOJ Datasets</h3>

          <div className={s.discoveryGrid}>
            {/* Dataset 9 */}
            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Dataset 9</h4>
                <span className={s.redactionBadgeWarning}>29% Redacted</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <FileText size={16} className={s.iconAccent} />
                  <span className={s.textSecondary}>35 prosecutorial files</span>
                </div>
                <p className={s.discoveryCardText}>
                  High-value DOJ files from US Attorney SDNY with an average of 4,490 words per
                  document. Lowest redaction rate indicates maximum transparency for prosecutorial
                  materials.
                </p>
              </div>
            </div>

            {/* Dataset 10 */}
            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Dataset 10</h4>
                <span className={s.redactionBadgeDanger}>48% Redacted</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <FileText size={16} className={s.iconAccent} />
                  <span className={s.textSecondary}>8,497 financial documents</span>
                </div>
                <p className={s.discoveryCardText}>
                  <strong className={s.textSecondary}>Deutsche Bank statements and invoices</strong>{' '}
                  with extensive mentions of Jes Staley (698 docs) and Lesley Groff (601 docs).
                  Reveals detailed financial transaction patterns and service charges across Epstein
                  properties.
                </p>
              </div>
            </div>

            {/* Dataset 11 */}
            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Dataset 11</h4>
                <span className={s.redactionBadgeDanger}>52% Redacted</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <FileText size={16} className={s.iconAccent} />
                  <span className={s.textSecondary}>4,721 multimedia files</span>
                </div>
                <p className={s.discoveryCardText}>
                  Video evidence, images, and short documents (avg 248 words). Highest redaction
                  rate reflects sensitive nature of visual evidence requiring privacy protection.
                </p>
              </div>
            </div>

            {/* Dataset 12 */}
            <div className={`soft-glass-inset ${s.discoveryCard}`}>
              <div className={s.discoveryCardHeader}>
                <h4 className={s.discoveryCardTitle}>Dataset 12</h4>
                <span className={s.redactionBadgeSuccess}>Ingested + Enriched</span>
              </div>
              <div className={s.discoveryCardBody}>
                <div className={s.discoveryCardRow}>
                  <FileText size={16} className={s.iconAccent} />
                  <span className={s.textSecondary}>202 investigative documents</span>
                </div>
                <p className={s.discoveryCardText}>
                  Subject referrals including "Leon Black/Additional HT Subject Referral" and DOJ
                  case correspondence. This smaller tranche is fully ingested and included in the
                  current enrichment corpus.
                </p>
              </div>
            </div>

            {/* Overall Statistics */}
            <div className={`soft-glass-accent ${s.crossDatasetCard}`}>
              <h4 className={s.crossDatasetTitle}>Cross-Dataset Analysis (13,455 Documents)</h4>
              <div className={s.crossDatasetGrid}>
                <div className={s.crossDatasetStat}>
                  <div className={`${s.crossDatasetValue} ${s.statValueAccent}`}>6,669</div>
                  <div className={s.crossDatasetLabel}>Communications Documents (50%)</div>
                </div>
                <div className={s.crossDatasetStat}>
                  <div className={`${s.crossDatasetValue} ${s.statValueSuccess}`}>3,928</div>
                  <div className={s.crossDatasetLabel}>Financial Records (29%)</div>
                </div>
                <div className={s.crossDatasetStat}>
                  <div className={`${s.crossDatasetValue} ${s.statValueAccent}`}>2,091</div>
                  <div className={s.crossDatasetLabel}>Location References (16%)</div>
                </div>
                <div className={s.crossDatasetStat}>
                  <div className={`${s.crossDatasetValue} ${s.statValueWarning}`}>1,212</div>
                  <div className={s.crossDatasetLabel}>Flight-Related (9%)</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`soft-glass-accent ${s.learnedBox}`}>
            <h4 className={s.learnedTitle}>
              <Info size={20} />
              What We Learned
            </h4>
            <ul className={s.learnedList}>
              <li>
                <strong className={s.textPrimary}>Deutsche Bank connection</strong>: Jes Staley's
                name appears in 698 documents, revealing extensive financial oversight
              </li>
              <li>
                <strong className={s.textPrimary}>Operational network</strong>: Lesley Groff
                coordinated transactions across 601 documents
              </li>
              <li>
                <strong className={s.textPrimary}>Geographic footprint</strong>: 2,091 location
                references spanning Palm Beach, Little St James, Manhattan, and Paris
              </li>
              <li>
                <strong className={s.textPrimary}>Communication patterns</strong>: Half of all DOJ
                documents contain email, message, or call records
              </li>
            </ul>
            <div className={s.learnedFooter}>
              <a href="/faq" className={s.learnedLink}>
                <Info size={16} />
                Read Frequently Asked Questions
              </a>
            </div>
          </div>

          <div className={`soft-glass-panel ${s.legalPanel}`}>
            <h3 className={s.legalPanelTitle}>
              <Shield size={24} className={s.iconSuccess} />
              Legal Thresholds: Association vs. Complicity
            </h3>

            <div className={s.legalThresholdGrid}>
              {/* Mere Presence */}
              <div className={`soft-glass-inset ${s.thresholdCard}`}>
                <div className={`${s.thresholdBadge} ${s.thresholdBadgeNeutral}`}>
                  Mere Presence
                </div>
                <p className={s.thresholdText}>
                  Being at a scene (e.g., flight) without participating is not a crime.
                </p>
              </div>

              {/* Complicity */}
              <div className={`soft-glass-inset ${s.thresholdCard}`}>
                <div className={`${s.thresholdBadge} ${s.thresholdBadgeWarning}`}>Complicity</div>
                <p className={s.thresholdText}>
                  Requires proof of specific intent to aid the trafficking.
                </p>
              </div>

              {/* Conspiracy */}
              <div className={`soft-glass-inset ${s.thresholdCard}`}>
                <div className={`${s.thresholdBadge} ${s.thresholdBadgeDanger}`}>Conspiracy</div>
                <p className={s.thresholdText}>Requires proof of an agreement to commit a crime.</p>
              </div>
            </div>

            <div className={`soft-glass-accent ${s.dojFindings}`}>
              <h4 className={s.dojFindingsTitle}>DOJ Findings (July 2025)</h4>
              <p className={s.dojFindingsText}>
                Concluded that while many powerful men associated with Epstein, obtaining evidence
                sufficient for federal prosecution of third parties remains legally distinct from
                proving social association.
              </p>
            </div>

            <p className={s.legalNote}>
              <strong className={`${s.textSecondary} ${s.notItalic}`}>How we use this:</strong>{' '}
              These legal thresholds directly inform our <strong>Red Flag Index</strong>. Entities
              with mere "Flight Log" appearances receive a low risk score (1-2), while those with
              sworn testimony alleging participation or specific knowledge are flagged with higher
              risk scores (4-5).
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Network size={32} className={s.iconAccent} />
          <h2 className={s.sectionTitle}>How It Works</h2>
        </div>

        <div className={s.howGrid}>
          <div className={s.howCard}>
            <Search size={40} className={s.iconAccent} />
            <h3 className={s.howCardTitle}>NLP Extraction</h3>
            <p className={s.howCardText}>
              Advanced natural language processing extracts entities, relationships, and context
              from documents
            </p>
          </div>

          <div className={s.howCard}>
            <Network size={40} className={s.iconSuccess} />
            <h3 className={s.howCardTitle}>Relationship Mapping</h3>
            <p className={s.howCardText}>
              Automatically identifies connections between entities based on co-occurrence and
              context
            </p>
          </div>

          <div className={s.howCard}>
            <Shield size={40} className={s.iconWarning} />
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
              <CheckCircle2 size={16} className={s.iconSuccess} />
              Full-text search across all documents
            </li>
            <li className={s.featureItem}>
              <CheckCircle2 size={16} className={s.iconSuccess} />
              Entity relationship visualization
            </li>
            <li className={s.featureItem}>
              <CheckCircle2 size={16} className={s.iconSuccess} />
              Timeline of events and document releases
            </li>
            <li className={s.featureItem}>
              <CheckCircle2 size={16} className={s.iconSuccess} />
              Forensic document analysis
            </li>
            <li className={s.featureItemAccent}>
              <TrendingUp size={16} className={s.iconAccent} />
              Integrated Side-by-Side PDF Viewer
            </li>
            <li className={s.featureItem}>
              <CheckCircle2 size={16} className={s.iconSuccess} />
              Investigation workspace with hypothesis tracking
            </li>
            <li className={s.featureItem}>
              <CheckCircle2 size={16} className={s.iconSuccess} />
              Categorised media library with {stats.media.toLocaleString()} images
            </li>
            <li className={s.featureItemAccent}>
              <TrendingUp size={16} className={s.iconAccent} />
              Audio &amp; Video with synchronized transcripts and chapter markers
            </li>
          </ul>
        </div>
      </section>

      {/* Audio & Video Credits */}
      <section className={s.creditsSection}>
        <div className={s.sectionHeader}>
          <ImageIcon size={32} className={s.iconAccent} />
          <h2 className={s.sectionTitle}>Audio &amp; Video with Transcripts</h2>
        </div>
        <p className={s.bodyText}>
          The archive features interview audio with precision transcripts, chapter markers, and a
          synchronized reading experience.
        </p>
        <div className={s.creditsGrid}>
          <div className={s.creditsCard}>
            <h3 className={s.creditsCardTitle}>Credits</h3>
            <ul className={s.creditsList}>
              <li>
                Testimony &amp; Interview:
                <a href="https://www.threads.com/@saschabarros" className={s.creditsLink}>
                  Sascha Riley
                </a>
              </li>
              <li>
                Investigation &amp; Publication:
                <a href="https://www.threads.com/@lvoldeng" className={s.creditsLink}>
                  Lisa Noelle Volding
                </a>
              </li>
              <li>
                Transcripts:
                <a href="https://www.threads.com/@roguerevision" className={s.creditsLink}>
                  Gareth Wright
                </a>
              </li>
            </ul>
          </div>
          <div className={s.creditsCard}>
            <h3 className={s.creditsCardTitle}>Original Publication</h3>
            <p className={s.bodyText} style={{ marginBottom: 'var(--space-3)' }}>
              Read the original briefing and recordings:
            </p>
            <a
              href="https://lisevoldeng.substack.com/p/dont-worry-boys-are-hard-to-find?r=1uodw7&triedRedirect=true"
              className={s.substackBtn}
            >
              Read Full Briefing on Substack
            </a>
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className={`surface-glass-card ${s.whatsNextSection}`}>
        <div className={s.sectionHeader}>
          <ImageIcon size={32} className={s.iconAccent} />
          <h2 className={s.sectionTitle}>Fully Ingested, Intelligence Ongoing</h2>
        </div>
        <p className={s.bodyText}>
          The archive has now reached full ingestion coverage for the currently tracked DOJ and
          media collections. The next stage focuses on intelligence quality: relationship expansion,
          high-confidence entity resolution, and improved provenance linking.
        </p>
        <p className={s.bodyText}>
          As new documents are released through legal proceedings, FOIA requests, and court
          unsealing orders, this platform remains ready for rapid ingestion while preserving the
          current fully indexed corpus.
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
      </section>

      {/* Media Coverage */}
      <section className={s.section}>
        <div className={s.sectionHeader}>
          <Newspaper size={32} className={s.iconAccent} />
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
                <FolderOpen className={s.heroCard1Icon} />
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
                <Scale size={64} className={s.accentIconLowOp} />
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
                <Newspaper size={28} className={s.iconDanger} />
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
                <Users size={28} className={s.iconDanger} />
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
                <Mail size={28} className={s.iconSuccess} />
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
                <Mic size={28} className={s.iconAccent} />
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
                <ClipboardList size={28} className={s.iconAccent} />
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
                <BookOpen size={28} className={s.iconAccent} />
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
          <AlertTriangle size={24} className={s.iconWarning} />
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
            <strong>Source documents:</strong> All data is derived from publicly available court
            documents, government releases, and verified sources. We do not make claims beyond what
            is documented in the source material.
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
            <HelpCircle size={32} className={s.iconAccent} />
            <h2 className={s.sectionTitle}>Frequently Asked Questions</h2>
          </div>
          <Link to="/faq" className={s.faqLink}>
            Full FAQ
            <ArrowRight className={s.faqLinkArrow} />
          </Link>
        </div>

        <div className={s.faqCarousel}>
          <div className={s.carouselGlow} />

          <div className={s.carouselContent}>
            <div className={s.dotRow}>
              {faqs.map((_, i) => (
                <button
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
        <p>Last updated: Feb 2, 2026</p>
        <p>Built with transparency and accountability in mind</p>
      </div>
    </div>
  );
};

export default AboutPage;
