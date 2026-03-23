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
      'Redactions protect the privacy of victims, innocent third parties, and ongoing investigations. Our system analyzes redaction levels to give context on what is hidden.',
  },
];

// Helper to get color classes
const getStatusColor = (color: string) => {
  switch (color) {
    case 'red':
      return { bg: 'bg-[var(--accent-danger)]', text: 'text-[var(--accent-danger)]' };
    case 'yellow':
      return { bg: 'bg-[var(--accent-warning)]', text: 'text-[var(--accent-warning)]' };
    case 'green':
      return { bg: 'bg-[var(--accent-success)]', text: 'text-[var(--accent-success)]' };
    default:
      return { bg: 'bg-[var(--glass-bg-highlight)]', text: 'text-[var(--text-secondary)]' };
  }
};

const getImpactColor = (color: string) => {
  switch (color) {
    case 'purple':
      return 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30';
    case 'blue':
      return 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/30';
    case 'slate':
      return 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border-[var(--glass-border)]';
    default:
      return 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border-[var(--glass-border)]';
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
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold text-[var(--text-primary)]">About the Epstein Archive</h1>
        <p className="text-xl text-[var(--text-secondary)]">
          Making government documents accessible through advanced search and analysis
        </p>
      </div>

      {/* What is this */}
      <section className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-8 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-[var(--accent)]" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">What is this?</h2>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          The Epstein Archive is a comprehensive, searchable database of publicly released court
          documents, depositions, and evidence related to the Jeffrey Epstein case. Our mission is
          to make government information more accessible to journalists, researchers, and the
          public.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          This is not a "client list" or conspiracy theory database. It is a forensic analysis tool
          built on actual court records, applying advanced natural language processing to extract
          entities, relationships, and patterns from thousands of pages of legal documents.
        </p>
      </section>

      {/* The Dataset */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-8 w-8 text-[var(--accent-success)]" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">The Dataset</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--accent)]" />
              Documents
            </h3>
            <p className="text-3xl font-bold text-[var(--accent)] mb-2">
              {stats.documents.toLocaleString()}
            </p>
            <p className="text-[var(--text-muted)] mb-4">
              Court documents, depositions, emails, and exhibits from multiple sources
            </p>
            <div className="pt-4 border-t border-[var(--glass-border)]">
              <p className="text-sm font-semibold text-[var(--accent-success)] mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" /> AI Semantic Repair
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                {stats.documentsFixed.toLocaleString()}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Fixed & Refined for Readability</p>
            </div>
          </div>

          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--accent-success)]" />
              Entities
            </h3>
            <p className="text-3xl font-bold text-[var(--accent-success)] mb-2">
              {stats.entities.toLocaleString()}
            </p>
            <p className="text-[var(--text-muted)]">
              People, organisations, and locations extracted from documents
            </p>
          </div>

          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Phone className="w-5 h-5 text-[var(--accent)]" />
              Black Book
            </h3>
            <p className="text-3xl font-bold text-[var(--accent)] mb-2">
              {stats.blackBook.toLocaleString()}
            </p>
            <p className="text-[var(--text-muted)]">Contact entries from Epstein's address book</p>
          </div>

          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6">
            <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[var(--accent-warning)]" />
              Media
            </h3>
            <p className="text-3xl font-bold text-[var(--accent-warning)] mb-2">
              {stats.media.toLocaleString()}
            </p>
            <p className="text-[var(--text-muted)]">
              Images across {stats.albums.toLocaleString()} categorised albums
            </p>
          </div>
        </div>

        <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">Document Sources</h3>
            <span className="px-2 py-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-medium">
              Verified Sources
            </span>
          </div>
          <p className="text-[var(--text-muted)] text-sm">
            Redaction percentages below combine what the government released with what our pipeline
            can safely recover via automated unredaction and OCR. Collections like the Black Book,
            Flight Logs, and DOJ VOL00001 FBI raid evidence are effectively fully readable, while
            later DOJ discovery volumes remain heavily censored despite technical improvements.
          </p>

          {/* Mobile Card View (< md) */}
          <div className="space-y-4 md:hidden">
            {documentSources.map((source, idx) => (
              <div
                key={idx}
                className="bg-[var(--glass-bg-highlight)]/30 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] space-y-3 shadow-sm"
              >
                <div className="flex justify-between items-start gap-3">
                  <h4 className="font-bold text-[var(--text-primary)] text-lg leading-tight">
                    {source.title}
                  </h4>
                  <span
                    className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getImpactColor(source.impactColor ?? 'slate')}`}
                  >
                    {source.impact}
                  </span>
                </div>

                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {source.documentCount?.toLocaleString() || '—'} documents
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${getStatusColor(source.redactionColor ?? 'green').bg}`}
                    ></span>
                    <span className={getStatusColor(source.redactionColor ?? 'green').text}>
                      {source.redactionStatus}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {source.link ? (
                      <a
                        href={source.link}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors text-xs font-medium border border-[var(--accent)]/20"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    ) : (
                      <a
                        href={`/documents?search=${encodeURIComponent(source.search || '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors text-xs font-medium border border-[var(--accent)]/20"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--glass-border)] text-[var(--text-muted)] text-sm">
                  <th className="py-3 px-4 font-medium">Title</th>
                  <th className="py-3 px-4 font-medium text-right">Documents</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Redaction Status</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Impact</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-700/50">
                {documentSources.map((source, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[var(--glass-bg-highlight)]/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                      {source.title}
                    </td>

                    <td className="py-3 px-4 text-right text-[var(--accent)] font-mono">
                      {source.documentCount?.toLocaleString() || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${getStatusColor(source.redactionColor ?? 'green').bg}`}
                        ></span>
                        <span className={getStatusColor(source.redactionColor ?? 'green').text}>
                          {source.redactionStatus}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getImpactColor(source.impactColor ?? 'slate')}`}
                      >
                        {source.impact}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {source.link ? (
                          <a
                            href={source.link}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:text-[var(--accent)] transition-colors text-xs font-medium border border-[var(--accent)]/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        ) : (
                          <a
                            href={`/documents?search=${encodeURIComponent(source.search || '')}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:text-[var(--accent)] transition-colors text-xs font-medium border border-[var(--accent)]/20"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        )}
                        {source.title === 'Unredacted Black Book' && (
                          <a
                            href="/api/downloads/release/black-book"
                            download
                            className="inline-flex items-center justify-center p-1.5 rounded-md bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)] transition-colors border border-[var(--glass-border)]"
                            title="Download Original"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {source.title === 'Flight Logs' && (
                          <a
                            href="/api/downloads/release/flight-logs"
                            download
                            className="inline-flex items-center justify-center p-1.5 rounded-md bg-[var(--glass-bg)] text-[var(--text-muted)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)] transition-colors border border-[var(--glass-border)]"
                            title="Download Original"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {source.title !== 'Unredacted Black Book' &&
                          source.title !== 'Flight Logs' && (
                            <button
                              disabled
                              className="inline-flex items-center justify-center p-1.5 rounded-md bg-[var(--glass-bg)]/50 text-[var(--text-primary)] cursor-not-allowed border border-[var(--glass-border)]"
                              title="Download not available"
                            >
                              <Download className="w-3.5 h-3.5" />
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
      <section className="soft-glass-panel-strong rounded-[var(--radius-lg)] p-8 space-y-6">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b soft-glass-divider">
          <FileText className="h-8 w-8 text-[var(--accent)]" />
          <div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              The Epstein Files: Analysis
            </h2>
            <p className="text-[var(--text-muted)] mt-1">
              What Documents Exist and What They Prove | Updated Jan 21, 2026
            </p>
          </div>
        </div>

        <div className="prose prose-invert prose-lg max-w-none text-[var(--text-secondary)] space-y-6">
          <p className="lead text-xl text-[var(--text-primary)]">
            The criminal enterprise of Jeffrey Epstein has created one of the most persistent myths
            in modern American history: the existence of a singular, definitive "Client List." A
            forensic examination of the investigative materials available as of late 2025 reveals a
            different reality.
          </p>

          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-8 mb-4">
            What Documents Actually Exist
          </h3>
          <p>
            The public discourse often conflates distinct datasets—flight logs, contact books, civil
            lawsuit depositions, and estate emails—into a monolithic "Epstein List." In reality, the
            evidence comprises several disparate categories of information, each with unique
            evidentiary value.
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">The Flight Logs</h4>
          <p>
            Pilot-recorded manifests for Epstein’s private aircraft fleet. These are logistical
            records, not criminal ledgers. The presence of a name establishes only presence, not
            purpose. As legal experts note, "being on the flight log doesn’t prove a crime" without
            corroborating testimony.
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">The Black Book</h4>
          <p>
            A compilation of phone numbers and addresses. It represents the infrastructure of
            Epstein's social climbing. Inclusion indicates Epstein had their contact info, not that
            they were "clients."
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">
            The Birthday Book
          </h4>
          <p>
            Released in Sept 2025 by House Oversight. A gift for Epstein's 50th birthday containing
            photos, notes, and ephemera. It offers insight into his social intimacy with the elite
            after initial concerns had arisen.
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">
            The Estate Emails (2009-2019)
          </h4>
          <p>
            A massive cache of 23,000+ pages released in Nov 2025. These cover the post-conviction
            era, revealing who remained in his orbit. Key exchanges include Epstein describing Trump
            as "the dog that hasn’t barked," and routine correspondence with figures like Larry
            Summers and Noam Chomsky.
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">
            DOJ Discovery (VOL00001)
          </h4>
          <p>
            Ingested Dec 21, 2025. This volume contains 3,158 raw digital evidence files seized
            during the July 2019 FBI raid of Epstein's Manhattan mansion. It includes unredacted
            images, metadata, and financial records that were previously held under seal.
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">
            DOJ Discovery (VOL00002-8)
          </h4>
          <p>
            Subsequent volumes contain heavily redacted document productions. Unlike Vol 1's raw
            digital evidence, these volumes consist primarily of procedural documents and
            correspondence where most substantive content has been blacked out under privacy
            protective orders.
          </p>

          <h4 className="text-xl font-semibold text-[var(--text-primary)] mt-4">
            DOJ Data Sets 9-12 (2026)
          </h4>
          <p>
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

          {/* Ingestion Progress Dashboard (Requested placement) */}
          <div className="soft-glass-accent rounded-[var(--radius-xl)] p-8 my-8 not-prose">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-3">
              <Database className="h-6 w-6 text-[var(--accent)]" />
              Dataset Ingestion Dashboard
              <span
                className={`ml-auto text-xs px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  ingestionComplete
                    ? 'bg-[var(--accent-success)]/20 text-[var(--accent-success)] border-[var(--accent-success)]/30'
                    : 'bg-[var(--accent)]/20 text-[var(--accent)] border-[var(--accent)]/20 animate-pulse'
                }`}
              >
                {ingestionComplete ? 'Milestone Reached' : 'Live Status'}
              </span>
            </h3>
            <div className="space-y-8">
              {(pipelineStatus?.datasets || []).map((dataset: PipelineDataset) => {
                const currentIngested = dataset.ingested;
                const currentDownloaded = dataset.downloaded;
                const target = dataset.target;

                const ingestPercent = Math.min(100, (currentIngested / target) * 100);
                const downloadPercent = Math.min(100, (currentDownloaded / target) * 100);
                const isComplete = currentIngested >= target;

                return (
                  <div key={dataset.name} className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--text-primary)] font-semibold">
                        {dataset.name}
                      </span>
                      <div className="text-right">
                        <span className="text-[var(--text-muted)] font-mono text-xs block">
                          FILES SECURED: {currentDownloaded.toLocaleString()} /{' '}
                          {target.toLocaleString()} ({downloadPercent.toFixed(1)}%)
                        </span>
                        <span className="text-[var(--accent)] font-mono text-xs block">
                          INGESTED: {currentIngested.toLocaleString()} / {target.toLocaleString()} (
                          {ingestPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <div className="soft-glass-inset relative h-3 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[var(--glass-bg-highlight)]/20 transition-all duration-1000"
                        style={{ width: `${downloadPercent}%` }}
                      />
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ${isComplete ? 'bg-[var(--accent-success)] shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[var(--accent)] shadow-[0_0_15px_rgba(59,130,246,0.5)]'}`}
                        style={{ width: `${ingestPercent}%` }}
                      >
                        {!isComplete && (
                          <div className="absolute inset-0 bg-white/10 animate-[shimmer_2s_infinite]"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {!ingestionComplete && pipelineStatus?.eta_minutes && (
              <div className="mt-6 pt-4 border-t soft-glass-divider flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
                    <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
                    Cluster throughput: ~{pipelineStatus.throughput_docs_sec?.toFixed(1) ||
                      '68'}{' '}
                    docs/sec
                  </div>
                  <div className="text-xs font-mono text-[var(--accent)]">
                    ETA: ~
                    {pipelineStatus.eta_minutes > 1440
                      ? `${(pipelineStatus.eta_minutes / 1440).toFixed(1)} DAYS`
                      : pipelineStatus.eta_minutes > 120
                        ? `${(pipelineStatus.eta_minutes / 60).toFixed(1)} HOURS`
                        : `${pipelineStatus.eta_minutes} MINUTES`}
                  </div>
                </div>

                {pipelineStatus.active_workers !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((node) => (
                        <div
                          key={node}
                          className={`h-2 w-2 rounded-full ${node <= (pipelineStatus.active_workers ?? 0) ? 'bg-[var(--accent-success)] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-[var(--glass-bg-highlight)]'}`}
                          title={
                            node <= (pipelineStatus.active_workers ?? 0)
                              ? `Node ${node} Active`
                              : `Node ${node} Idle`
                          }
                        />
                      ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      {pipelineStatus.active_workers || 12} Exo Workers Active
                    </span>
                  </div>
                )}
              </div>
            )}
            {ingestionComplete && (
              <div className="mt-6 pt-4 border-t soft-glass-divider flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-[var(--accent-success)]" />
                <p className="text-xs text-[var(--accent-success)]/90 font-mono">
                  Ingestion has reached 100%. Remaining pipeline work is intelligence analysis,
                  entity normalization, OCR cleanup reruns, and graph enrichment.
                </p>
              </div>
            )}
          </div>

          <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-8 mb-4">
            Key Discoveries from DOJ Datasets
          </h3>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Dataset 9 */}
            <div className="soft-glass-inset rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Dataset 9</h4>
                <span className="text-xs font-mono text-[var(--accent-warning)] bg-[var(--accent-warning)]/10 px-2 py-1 rounded border border-[var(--accent-warning)]/20">
                  29% Redacted
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-[var(--text-secondary)]">35 prosecutorial files</span>
                </div>
                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  High-value DOJ files from US Attorney SDNY with an average of 4,490 words per
                  document. Lowest redaction rate indicates maximum transparency for prosecutorial
                  materials.
                </div>
              </div>
            </div>

            {/* Dataset 10 */}
            <div className="soft-glass-inset rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Dataset 10</h4>
                <span className="text-xs font-mono text-[var(--accent-danger)] bg-[var(--accent-danger)]/10 px-2 py-1 rounded border border-[var(--accent-danger)]/20">
                  48% Redacted
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-[var(--text-secondary)]">8,497 financial documents</span>
                </div>
                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  <strong className="text-[var(--text-secondary)]">
                    Deutsche Bank statements and invoices
                  </strong>{' '}
                  with extensive mentions of Jes Staley (698 docs) and Lesley Groff (601 docs).
                  Reveals detailed financial transaction patterns and service charges across Epstein
                  properties.
                </div>
              </div>
            </div>

            {/* Dataset 11 */}
            <div className="soft-glass-inset rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Dataset 11</h4>
                <span className="text-xs font-mono text-[var(--accent-danger)] bg-[var(--accent-danger)]/10 px-2 py-1 rounded border border-[var(--accent-danger)]/20">
                  52% Redacted
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-[var(--text-secondary)]">4,721 multimedia files</span>
                </div>
                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Video evidence, images, and short documents (avg 248 words). Highest redaction
                  rate reflects sensitive nature of visual evidence requiring privacy protection.
                </div>
              </div>
            </div>

            {/* Dataset 12 */}
            <div className="soft-glass-inset rounded-[var(--radius-lg)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-[var(--text-primary)]">Dataset 12</h4>
                <span className="text-xs font-mono text-[var(--accent-success)] bg-[var(--accent-success)]/10 px-2 py-1 rounded border border-[var(--accent-success)]/20">
                  Ingested + Enriched
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-[var(--text-secondary)]">202 investigative documents</span>
                </div>
                <div className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Subject referrals including "Leon Black/Additional HT Subject Referral" and DOJ
                  case correspondence. This smaller tranche is fully ingested and included in the
                  current enrichment corpus.
                </div>
              </div>
            </div>

            {/* Overall Statistics */}
            <div className="soft-glass-accent rounded-[var(--radius-lg)] p-5 md:col-span-2 lg:col-span-2">
              <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                Cross-Dataset Analysis (13,455 Documents)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-[var(--accent)]">6,669</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Communications Documents (50%)
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--accent-success)]">3,928</div>
                  <div className="text-xs text-[var(--text-muted)]">Financial Records (29%)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--accent)]">2,091</div>
                  <div className="text-xs text-[var(--text-muted)]">Location References (16%)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[var(--accent-warning)]">1,212</div>
                  <div className="text-xs text-[var(--text-muted)]">Flight-Related (9%)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="soft-glass-accent rounded-[var(--radius-lg)] p-5 mt-6">
            <h4 className="text-[var(--accent)] font-semibold mb-2 flex items-center gap-2">
              <Info className="h-5 w-5" />
              What We Learned
            </h4>
            <ul className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-2 list-disc list-inside mb-4">
              <li>
                <strong className="text-[var(--text-primary)]">Deutsche Bank connection</strong>:
                Jes Staley's name appears in 698 documents, revealing extensive financial oversight
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Operational network</strong>: Lesley
                Groff coordinated transactions across 601 documents
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Geographic footprint</strong>: 2,091
                location references spanning Palm Beach, Little St James, Manhattan, and Paris
              </li>
              <li>
                <strong className="text-[var(--text-primary)]">Communication patterns</strong>: Half
                of all DOJ documents contain email, message, or call records
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t soft-glass-divider">
              <a
                href="/faq"
                className="text-[var(--accent)] hover:text-[var(--text-primary)] text-sm font-medium inline-flex items-center gap-1 transition-colors"
              >
                <Info className="h-4 w-4" />
                Read Frequently Asked Questions
              </a>
            </div>
          </div>

          <div className="soft-glass-panel rounded-[var(--radius-lg)] p-6 mt-8">
            <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
              <Shield className="h-6 w-6 text-[var(--accent-success)]" />
              Legal Thresholds: Association vs. Complicity
            </h3>

            <div className="grid gap-4 md:grid-cols-3 mb-6">
              {/* Mere Presence */}
              <div className="soft-glass-inset p-4 rounded-[var(--radius-lg)]">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] mb-2">
                  Mere Presence
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Being at a scene (e.g., flight) without participating is not a crime.
                </p>
              </div>

              {/* Complicity */}
              <div className="soft-glass-inset p-4 rounded-[var(--radius-lg)]">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] border border-[var(--accent-warning)]/30 mb-2">
                  Complicity
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Requires proof of specific intent to aid the trafficking.
                </p>
              </div>

              {/* Conspiracy */}
              <div className="soft-glass-inset p-4 rounded-[var(--radius-lg)]">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-danger)]/20 text-[var(--accent-danger)] border border-[var(--accent-danger)]/30 mb-2">
                  Conspiracy
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Requires proof of an agreement to commit a crime.
                </p>
              </div>
            </div>

            <div className="soft-glass-accent rounded-[var(--radius-lg)] p-4 mb-6">
              <h4 className="text-[var(--accent)] font-semibold mb-2 flex items-center gap-2">
                DOJ Findings (July 2025)
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Concluded that while many powerful men associated with Epstein, obtaining evidence
                sufficient for federal prosecution of third parties remains legally distinct from
                proving social association.
              </p>
            </div>

            <div className="text-[var(--text-muted)] text-sm italic border-t soft-glass-divider pt-4">
              <strong className="text-[var(--text-secondary)] not-italic">How we use this:</strong>{' '}
              These legal thresholds directly inform our <strong>Red Flag Index</strong>. Entities
              with mere "Flight Log" appearances receive a low risk score (1-2), while those with
              sworn testimony alleging participation or specific knowledge are flagged with higher
              risk scores (4-5).
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Network className="h-8 w-8 text-[var(--accent)]" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">How It Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6 space-y-3">
            <Search className="h-10 w-10 text-[var(--accent)] mb-2" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">NLP Extraction</h3>
            <p className="text-[var(--text-muted)] text-sm">
              Advanced natural language processing extracts entities, relationships, and context
              from documents
            </p>
          </div>

          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6 space-y-3">
            <Network className="h-10 w-10 text-[var(--accent-success)] mb-2" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Relationship Mapping
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Automatically identifies connections between entities based on co-occurrence and
              context
            </p>
          </div>

          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6 space-y-3">
            <Shield className="h-10 w-10 text-[var(--accent-warning)] mb-2" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Red Flag Index</h3>
            <p className="text-[var(--text-muted)] text-sm">
              Risk scoring system based on document frequency, evidence types, and contextual
              analysis
            </p>
          </div>
        </div>

        <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-6 space-y-3">
          <h3 className="text-xl font-semibold text-[var(--text-primary)]">Key Features</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[var(--text-secondary)]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
              Full-text search across all documents
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
              Entity relationship visualization
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
              Timeline of events and document releases
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
              Forensic document analysis
            </li>
            <li className="flex items-center gap-2 text-[var(--accent)] font-semibold">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              Integrated Side-by-Side PDF Viewer
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
              Investigation workspace with hypothesis tracking
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
              Categorised media library with {stats.media.toLocaleString()} images
            </li>
            <li className="flex items-center gap-2 text-[var(--accent)] font-semibold">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              Audio & Video with synchronized transcripts and chapter markers
            </li>
          </ul>
        </div>
      </section>

      {/* Audio & Video Credits */}
      <section className="bg-[var(--glass-bg-strong)]/60 rounded-[var(--radius-lg)] p-8 space-y-6 border border-[var(--glass-border)]">
        <div className="flex items-center gap-3 mb-2">
          <ImageIcon className="h-8 w-8 text-[var(--accent)]" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Audio & Video with Transcripts
          </h2>
        </div>
        <p className="text-[var(--text-secondary)]">
          The archive features interview audio with precision transcripts, chapter markers, and a
          synchronized reading experience.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Credits</h3>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li>
                Testimony & Interview:
                <a
                  href="https://www.threads.com/@saschabarros"
                  className="text-[var(--accent)] hover:underline ml-1"
                >
                  Sascha Riley
                </a>
              </li>
              <li>
                Investigation & Publication:
                <a
                  href="https://www.threads.com/@lvoldeng"
                  className="text-[var(--accent)] hover:underline ml-1"
                >
                  Lisa Noelle Volding
                </a>
              </li>
              <li>
                Transcripts:
                <a
                  href="https://www.threads.com/@roguerevision"
                  className="text-[var(--accent)] hover:underline ml-1"
                >
                  Gareth Wright
                </a>
              </li>
            </ul>
          </div>
          <div className="bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Original Publication
            </h3>
            <p className="text-[var(--text-secondary)] mb-3">
              Read the original briefing and recordings:
            </p>
            <a
              href="https://lisevoldeng.substack.com/p/dont-worry-boys-are-hard-to-find?r=1uodw7&triedRedirect=true"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] font-semibold shadow-[var(--glass-shadow)] shadow-blue-900/20"
            >
              Read Full Briefing on Substack
            </a>
          </div>
        </div>
      </section>

      {/* What's Next */}
      <section className="surface-glass-card rounded-[var(--radius-lg)] p-8 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <ImageIcon className="h-8 w-8 text-[var(--accent)]" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">
            Fully Ingested, Intelligence Ongoing
          </h2>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          The archive has now reached full ingestion coverage for the currently tracked DOJ and
          media collections. The next stage focuses on intelligence quality: relationship expansion,
          high-confidence entity resolution, and improved provenance linking.
        </p>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          As new documents are released through legal proceedings, FOIA requests, and court
          unsealing orders, this platform remains ready for rapid ingestion while preserving the
          current fully indexed corpus.
        </p>
        <div className="bg-[var(--accent-info)]/20 border border-[var(--accent)]/30 rounded-[var(--radius-lg)] p-4 mt-4">
          <p className="text-[var(--text-primary)] text-sm">
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
              className="text-[var(--accent)] hover:underline underline"
            >
              Forensic Transparancy & Accountability Charter
            </a>
            .
          </p>
        </div>
        <div className="bg-[var(--accent)]/20 border border-[var(--accent)]/30 rounded-[var(--radius-lg)] p-4 mt-4">
          <p className="text-purple-200 text-sm">
            <strong>Find High-Impact Documents:</strong> Use the Document Browser and filter by "Red
            Flag Rating" (highest first) to discover the most significant documents. High-risk
            documents (4-5) contain keywords related to victims, trafficking, key figures, and
            financial transactions.
          </p>
        </div>
      </section>

      {/* Media Coverage */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <Newspaper className="h-8 w-8 text-[var(--accent)]" />
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Media Coverage</h2>
        </div>

        {/* Featured Articles - Hero Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hero 1: Substack Article */}
          <a
            href="https://generik.substack.com/p/the-epstein-files-archive"
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-gradient-to-br from-slate-800 to-slate-900 rounded-[var(--radius-xl)] overflow-hidden border border-[var(--glass-border)] hover:border-orange-500/50 transition-all duration-300 hover:shadow-[var(--glass-shadow)] hover:shadow-orange-500/10"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-orange-600/20 to-amber-600/10 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <FolderOpen className="w-16 h-16 text-orange-500/30" />
              </div>
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-orange-500 text-[var(--text-primary)] text-xs font-bold rounded uppercase tracking-wide">
                  Featured
                </span>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--accent-warning)]">The End Times</span>
                <span>•</span>
                <span>Dec 18, 2025</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-warning)] transition-colors leading-tight">
                The Epstein Files Archive
              </h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed line-clamp-2">
                Making Sense of a Massive Document Trove — An online investigative tool and research
                platform that brings together everything.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[var(--text-primary)] text-xs font-bold">
                  EV
                </div>
                <div>
                  <div className="text-sm text-[var(--text-primary)] font-medium">Erik Veland</div>
                  <div className="text-xs text-[var(--text-muted)]">Author</div>
                </div>
              </div>
            </div>
          </a>

          {/* Hero 2: GovFacts Article */}
          <a
            href="https://govfacts.org/rights-freedoms/government-transparency/public-records-access/the-epstein-files-what-documents-exist-and-what-they-prove/"
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-gradient-to-br from-slate-800 to-slate-900 rounded-[var(--radius-xl)] overflow-hidden border border-[var(--glass-border)] hover:border-[var(--accent)]/50 transition-all duration-300 hover:shadow-[var(--glass-shadow)] hover:shadow-blue-500/10"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-blue-600/20 to-indigo-600/10 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <Scale className="w-16 h-16 text-[var(--accent)]/30" />
              </div>
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 bg-[var(--accent)] text-[var(--text-primary)] text-xs font-bold rounded uppercase tracking-wide">
                  Genesis
                </span>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--accent)]">GovFacts</span>
                <span>•</span>
                <span>Nov 16, 2025</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-tight">
                The Epstein Files: What Documents Exist and What They Prove
              </h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed line-clamp-2">
                A forensic examination of the investigative materials revealing the stark legal
                boundary between social association and criminal complicity.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[var(--text-primary)] text-xs font-bold">
                  AO
                </div>
                <div>
                  <div className="text-sm text-[var(--text-primary)] font-medium">
                    Alison O'Leary
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Journalist</div>
                </div>
              </div>
            </div>
          </a>
        </div>

        {/* More Coverage - Compact Cards */}
        <div className="bg-[var(--glass-bg)]/30 rounded-[var(--radius-xl)] p-6 border border-[var(--glass-border)]">
          <h3 className="text-lg font-semibold text-[var(--text-secondary)] mb-4">More Coverage</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="https://www.wired.com/story/a-complete-guide-to-the-jeffrey-epstein-document-dumps/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-3 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/50 hover:border-red-500/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-red-900/30 flex items-center justify-center shrink-0">
                <Newspaper className="w-7 h-7 text-[var(--accent-danger)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--accent-danger)] font-semibold mb-1">WIRED</div>
                <div className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--accent-danger)] transition-colors line-clamp-2">
                  A Complete Guide to the Jeffrey Epstein Document Dumps
                </div>
              </div>
            </a>
            <a
              href="https://people.com/what-are-the-epstein-files-11781622"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-3 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/50 hover:border-pink-500/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-pink-900/30 flex items-center justify-center shrink-0">
                <Users className="w-7 h-7 text-pink-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-pink-400 font-semibold mb-1">People</div>
                <div className="text-sm text-[var(--text-primary)] font-medium group-hover:text-pink-300 transition-colors line-clamp-2">
                  What Are the Epstein Files? Everything to Know
                </div>
              </div>
            </a>
            <a
              href="https://sfstandard.com/2025/11/21/epstein-emails-san-francisco-jmail/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-3 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/50 hover:border-[var(--accent-success)]/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Mail className="w-7 h-7 text-[var(--accent-success)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--accent-success)] font-semibold mb-1">
                  SF Standard
                </div>
                <div className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--accent-success)] transition-colors line-clamp-2">
                  Welcome to JMail: The easiest way to read all the Jeffrey Epstein emails
                </div>
              </div>
            </a>
            <a
              href="https://www.404media.co/podcast-the-epstein-email-dump-is-a-mess/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-3 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/50 hover:border-[var(--accent)]/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-[var(--accent)]/20 flex items-center justify-center shrink-0">
                <Mic className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--accent)] font-semibold mb-1">404 Media</div>
                <div className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  Podcast: The Epstein Email Dump Is a Mess
                </div>
              </div>
            </a>
            <a
              href="https://www.axios.com/2025/11/12/new-epstein-files-emails-released-doj-trump"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-3 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/50 hover:border-[var(--accent)]/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-cyan-900/30 flex items-center justify-center shrink-0">
                <ClipboardList className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--accent)] font-semibold mb-1">Axios</div>
                <div className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  Here are all the new Epstein files and emails released so far
                </div>
              </div>
            </a>
            <a
              href="https://www.axios.com/2025/12/19/epstein-files-doj-library-images-photos-trump"
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-4 p-3 bg-[var(--glass-bg)]/50 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]/50 hover:border-[var(--accent)]/30 transition-all group"
            >
              <div className="w-16 h-16 rounded-[var(--radius-lg)] bg-cyan-900/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-7 h-7 text-[var(--accent)]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-[var(--accent)] font-semibold mb-1">Axios</div>
                <div className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                  Epstein files are out: What's in the DOJ's library and what's missing
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section className="bg-yellow-900/20 border border-yellow-500/30 rounded-[var(--radius-lg)] p-6 space-y-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-[var(--accent-warning)]" />
          <h2 className="text-2xl font-bold text-yellow-200">Legal Disclaimer</h2>
        </div>
        <div className="text-yellow-100/80 space-y-2 text-sm">
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
      <section className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HelpCircle className="h-8 w-8 text-[var(--accent)]" />
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">
              Frequently Asked Questions
            </h2>
          </div>
          <Link
            to="/faq"
            className="flex items-center gap-2 text-[var(--accent)] hover:text-[var(--accent)] transition-colors group"
          >
            Full FAQ
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative bg-[var(--glass-bg)]/50 rounded-[var(--radius-xl)] p-8 border border-[var(--glass-border)] overflow-hidden min-h-[180px] flex flex-col justify-center">
          {/* Animated background element */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-3xl"></div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              {faqs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFaq(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${i === activeFaq ? 'w-8 bg-[var(--accent)]' : 'w-2 bg-[var(--glass-bg-highlight)]'}`}
                />
              ))}
            </div>

            <div className="transition-all duration-500 ease-in-out">
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {faqs[activeFaq].question}
              </h3>
              <p className="text-[var(--text-secondary)] leading-relaxed text-lg italic">
                "{faqs[activeFaq].answer}"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-[var(--text-muted)] text-sm pt-8 border-t border-[var(--glass-border)]">
        <p>Last updated: Feb 2, 2026</p>
        <p className="mt-2">Built with transparency and accountability in mind</p>
      </div>
    </div>
  );
};

export default AboutPage;
