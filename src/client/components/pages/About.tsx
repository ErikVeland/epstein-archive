/// <reference types="vite/client" />
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';

import { optimizedDataService } from '@client/services/OptimizedDataService';
import { GlobalStatsPayload } from '@client/types/api';
import s from './About.module.css';

interface AboutStats {
  total: number;
  released: number;
}

interface PipelineDataset {
  name: string;
  target: number;
  ingested: number;
  downloaded: number;
}

interface PipelineStatus {
  datasets?: PipelineDataset[];
  eta_minutes?: number;
}

export const About: React.FC = () => {
  const backLinkState = useBackLinkState();
  const { data: statsData = null } = useQuery<GlobalStatsPayload | null>({
    queryKey: ['about-statistics'],
    queryFn: async () => await optimizedDataService.getStatistics(),
    staleTime: 300_000,
  });

  const stats: AboutStats | null = statsData
    ? { total: 5200000, released: statsData.totalDocuments || 0 }
    : null;
  const pipelineStatus: PipelineStatus | null = statsData?.pipeline_status || null;

  const percentage = stats ? ((stats.released / stats.total) * 100).toFixed(4) : '0';

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <h1 className={s.title}>Epstein Archive Investigation Platform</h1>
        <p className={s.subtitle}>
          Version {__APP_VERSION__} - Lean Schema &amp; Interactive Intelligence
        </p>
        <div className={`${s.etaBadge} ${s.pulse}`}>
          Estimated Time to Completion: ~{pipelineStatus?.eta_minutes || 240} minutes (Downloading
          &amp; Ingesting)
        </div>

        {stats && (
          <div className={s.statsRow}>
            <div className={s.statCol}>
              <span className={s.statLabel}>Files Secured</span>
              <span className={s.statValueEmerald}>{stats.released.toLocaleString()}</span>
            </div>
            <div className={s.statDivider}></div>
            <div className={s.statCol}>
              <span className={s.statLabel}>Total Archive</span>
              <span className={s.statValueMuted}>5.2M</span>
            </div>
            <div className={s.statDivider}></div>
            <div className={s.statCol}>
              <span className={`${s.statLabelProgress} ${s.pulse}`}>Progress</span>
              <span className={s.statValuePrimary}>{percentage}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Ingestion Progress Section */}
      <div className={s.panel}>
        <h2 className={s.sectionTitle}>
          <Icon name="Database" size="lg" className={s.iconPurple} />
          DOJ Disclosure Ingestion Status
        </h2>
        <div className={s.datasetsStack}>
          {(pipelineStatus?.datasets || []).map((dataset: PipelineDataset) => {
            const currentIngested = dataset.ingested;
            const currentDownloaded = dataset.downloaded;
            const target = Math.max(dataset.target || 0, currentIngested, currentDownloaded);

            const ingestPercent = Math.min(100, target > 0 ? (currentIngested / target) * 100 : 0);
            const downloadPercent = Math.min(
              100,
              target > 0 ? (currentDownloaded / target) * 100 : 0,
            );
            const isComplete = currentIngested >= target;

            return (
              <div key={dataset.name} className={s.datasetItem}>
                <div className={s.datasetHeader}>
                  <span className={s.datasetName}>{dataset.name}</span>
                  <div className={s.datasetStats}>
                    <span className={s.datasetDownloadStat}>
                      Download: {currentDownloaded.toLocaleString()} / {target.toLocaleString()} (
                      {downloadPercent.toFixed(1)}%)
                    </span>
                    <span className={s.datasetIngestStat}>
                      Ingest: {currentIngested.toLocaleString()} / {target.toLocaleString()} (
                      {ingestPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Advanced Dual Progress Bar */}
                <div className={s.progressTrack}>
                  {/* Download Progress (Back Layer) */}
                  <div className={s.downloadBar} style={{ width: `${downloadPercent}%` }} />
                  {/* Ingest Progress (Top Layer) */}
                  <div
                    data-complete={isComplete ? 'true' : undefined}
                    className={s.ingestBar}
                    style={{ width: `${ingestPercent}%` }}
                  >
                    {!isComplete && <div className={`${s.shimmer} ${s.skewX12}`}></div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className={s.metricsNote}>
          * Live ingestion metrics. Download status reflects filesystem discovery; Ingest status
          reflects database commitment.
        </p>
      </div>

      {/* Mission Statement */}
      <div className={s.panelGradient}>
        <h2 className={s.sectionTitleNoGap}>
          <Icon name="Target" size="lg" className={s.iconRose} />
          Mission
        </h2>
        <p className={s.missionText}>
          The Epstein Archive is a comprehensive investigative platform designed to organise,
          analyse, and present evidence related to the Jeffrey Epstein case. Our mission is to
          provide researchers, journalists, and the public with powerful tools to explore
          connections, identify patterns, and uncover insights from thousands of documents, flight
          logs, and evidence records.
        </p>
      </div>

      {/* System Analysis & Improvements */}
      <div className={s.panel}>
        <h2 className={s.sectionTitle}>
          <Icon name="Shield" size="lg" className={s.iconEmerald} />
          System Analysis &amp; Improvements
        </h2>
        <p className={s.sectionBody}>
          We have transformed the "chaotic archive" of disparate files described in recent analysis
          into a <strong>Forensic Intelligence Platform</strong>. By moving beyond static lists to a
          dynamic, interconnected system, we respect the complexity and legal nuance of the case.
        </p>

        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead className={s.tableHead}>
              <tr>
                <th>Article Concept</th>
                <th>Current "Status Quo"</th>
                <th>Platform Improvement</th>
              </tr>
            </thead>
            <tbody>
              <tr className={s.tableRow}>
                <td className={s.tdPrimary}>Data Structure</td>
                <td className={s.tdMuted}>"Chaotic archive", "image scans"</td>
                <td className={s.tdEmerald}>Structured Database &amp; Searchable Text (OCR)</td>
              </tr>
              <tr className={s.tableRow}>
                <td className={s.tdPrimary}>Flight Logs</td>
                <td className={s.tdMuted}>Static lists, "Guilt by association"</td>
                <td className={s.tdEmerald}>Network Graph &amp; Forensic Cross-Referencing</td>
              </tr>
              <tr className={s.tableRow}>
                <td className={s.tdPrimary}>Black Book</td>
                <td className={s.tdMuted}>"Rolodex" conflated with "Client List"</td>
                <td className={s.tdEmerald}>
                  Searchable Contact Database (distinct from criminal evidence)
                </td>
              </tr>
              <tr className={s.tableRow}>
                <td className={s.tdPrimary}>Emails</td>
                <td className={s.tdMuted}>Massive unreadable cache</td>
                <td className={s.tdEmerald}>
                  Communication Pattern Analysis (Frequency, Timing, Network)
                </td>
              </tr>
              <tr className={s.tableRowLast}>
                <td className={s.tdPrimary}>Nuance</td>
                <td className={s.tdMuted}>Lost in public discussion</td>
                <td className={s.tdEmerald}>Red Flag Index (Quantified Risk vs. Association)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={s.panel}>
        <h2 className={s.sectionTitle}>
          <Icon name="FileText" size="lg" className={s.accentIcon} />
          How We Process Data
        </h2>
        <div className={s.processGrid}>
          <div className={s.processCard}>
            <h4 className={s.processCardTitle}>
              <span className={s.processStep}>1</span>
              Ingestion
            </h4>
            <p className={s.processCardBody}>
              We ingest raw PDFs, images, and emails from varied sources. Every file is registered,
              hashed for integrity, and categorised.
            </p>
          </div>
          <div className={s.processCard}>
            <h4 className={s.processCardTitle}>
              <span className={s.processStep}>2</span>
              Digitization (OCR)
            </h4>
            <p className={s.processCardBody}>
              Scanning software reads every page. We use <strong>Competitive OCR</strong> to compare
              results from different engines and extract the most accurate text possible.
            </p>
          </div>
          <div className={s.processCard}>
            <h4 className={s.processCardTitle}>
              <span className={s.processStep}>3</span>
              Analysis
            </h4>
            <p className={s.processCardBody}>
              Our system scans for <strong>Visual Redactions</strong> (black boxes) to flag hid' +
              'den info, and uses AI to identify people in photos.
            </p>
          </div>
          <div className={s.processCard}>
            <h4 className={s.processCardTitle}>
              <span className={s.processStep}>4</span>
              Connection
            </h4>
            <p className={s.processCardBody}>
              We link people, organisations, and events across documents to build a searchable
              knowledge graph.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className={s.featuresGrid}>
        <div className={s.featureCard}>
          <div className={s.featureCardHeader}>
            <Icon name="Database" size="xl" className={s.accentIcon} />
            <h3 className={s.featureCardTitle}>Evidence Pipeline</h3>
          </div>
          <ul className={s.featureList}>
            <li>• 51,379+ enriched evidence records</li>
            <li>• OCR processing for scanned documents</li>
            <li>• Automated entity extraction</li>
            <li>• Red Flag Index (0-5 scale) for evidence rating</li>
            <li>• Risk Index scoring system</li>
          </ul>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureCardHeader}>
            <Icon name="Users" size="xl" className={s.iconPurple} />
            <h3 className={s.featureCardTitle}>Entity Network</h3>
          </div>
          <ul className={s.featureList}>
            <li>• 45,968+ identified entities</li>
            <li>• Person and organisation tracking</li>
            <li>• Relationship mapping</li>
            <li>• Connection strength analysis</li>
            <li>• Social network visualization</li>
          </ul>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureCardHeader}>
            <Icon name="Search" size="xl" className={s.iconGreen} />
            <h3 className={s.featureCardTitle}>Advanced Search</h3>
          </div>
          <ul className={s.featureList}>
            <li>• Full-text search across all documents</li>
            <li>• Entity-based filtering</li>
            <li>• Date range queries</li>
            <li>• Evidence type filtering</li>
            <li>• Contextual search results</li>
          </ul>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureCardHeader}>
            <Icon name="Camera" size="xl" className={s.iconRose} />
            <h3 className={s.featureCardTitle}>Media Browser</h3>
          </div>
          <ul className={s.featureList}>
            <li>• Photo album organisation</li>
            <li>• Image metadata extraction</li>
            <li>• Advanced search and filtering</li>
            <li>• Format and date-based sorting</li>
            <li>• Thumbnail generation</li>
          </ul>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureCardHeader}>
            <Icon name="FileText" size="xl" className={s.iconAmber} />
            <h3 className={s.featureCardTitle}>Document Analysis</h3>
          </div>
          <ul className={s.featureList}>
            <li>• Flight log parsing and analysis</li>
            <li>• Court document processing</li>
            <li>• Timeline reconstruction</li>
            <li>• Pattern detection</li>
            <li>• Cross-reference verification</li>
          </ul>
        </div>

        <div className={s.featureCard}>
          <div className={s.featureCardHeader}>
            <Icon name="TrendingUp" size="xl" className={s.accentIcon} />
            <h3 className={s.featureCardTitle}>Analytics Dashboard</h3>
          </div>
          <ul className={s.featureList}>
            <li>• Interactive data visualizations</li>
            <li>• Statistical analysis tools</li>
            <li>• Trend identification</li>
            <li>• Geographic mapping</li>
            <li>• Timeline analysis</li>
          </ul>
        </div>
      </div>

      {/* Technical Stack */}
      <div className={s.panelGradient}>
        <h2 className={s.sectionTitle}>
          <Icon name="Shield" size="lg" className={s.accentIcon} />
          Technical Architecture
        </h2>
        <div className={s.techGrid}>
          <div>
            <h4 className={s.techColTitle}>Frontend</h4>
            <ul className={s.techList}>
              <li>• React 18 with TypeScript</li>
              <li>• Vite build system</li>
              <li>• Vanilla CSS Modules</li>
              <li>• Recharts visualizations</li>
              <li>• Lucide icons</li>
            </ul>
          </div>
          <div>
            <h4 className={s.techColTitle}>Backend</h4>
            <ul className={s.techList}>
              <li>• Node.js + Express</li>
              <li>• TypeScript</li>
              <li>• PostgreSQL database</li>
              <li>• RESTful API architecture</li>
              <li>• MediaService integration</li>
            </ul>
          </div>
          <div>
            <h4 className={s.techColTitle}>Testing &amp; QA</h4>
            <ul className={s.techList}>
              <li>• Playwright E2E testing</li>
              <li>• ESLint code quality</li>
              <li>• TypeScript type safety</li>
              <li>• Automated testing pipelines</li>
              <li>• Continuous validation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className={s.panel}>
        <h2 className={s.sectionTitle}>Data Sources</h2>
        <p className={s.sectionBody}>
          This archive aggregates publicly available information from various sources. Click on a
          source to explore the related documents and evidence within the platform.
        </p>

        <div className={s.sourcesGrid}>
          <Link to="/blackbook" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Unredacted Black Book
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              1,101 contacts from Epstein's original 1990s address book.
            </p>
          </Link>

          <Link to="/documents?q=Flight%20Log" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Epstein Flight Logs
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              Pilot logs documenting travel on Epstein's private aircraft ("Lolita Express").
            </p>
          </Link>

          <Link to="/documents?q=Jeeproject" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              The Estate Emails ("Jeeproject")
              <span className={s.badgeEmerald}>26,020 MSGs</span>
            </h3>
            <p className={s.sourceCardDesc}>
              Massive archive of Yahoo emails (2007-2019) from the "Jeeproject" account.
            </p>
          </Link>

          <Link to="/documents?q=Oversight" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              House Oversight Production
              <span className={s.badgeEmerald}>~15,500 FILES</span>
            </h3>
            <p className={s.sourceCardDesc}>
              "Seventh Production" release containing photos and documents.
            </p>
            <div className={s.sourceCardMeta}>
              <span className={s.dotRose}></span>
              Average Redaction: 12.4% (Calculated via OCR)
            </div>
          </Link>

          <Link to="/documents?q=DOJ%20VOL00001" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              DOJ Evidence Vol. 1<span className={s.badgeAmber}>NEW</span>
            </h3>
            <p className={s.sourceCardDesc}>
              Raw digital evidence from the 2019 FBI raid of the NYC residence.
            </p>
            <div className={s.sourceCardMeta}>
              <span className={s.dotEmerald}></span>
              99.8% Unredacted (Raw Evidence)
            </div>
          </Link>

          <Link to="/documents?q=Ehud%20Barak" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Ehud Barak Emails
              <span className={s.badgeEmerald}>1,411 MSGs</span>
            </h3>
            <p className={s.sourceCardDesc}>
              Correspondence exchanged with former Israeli PM Ehud Barak (2013-2016).
            </p>
          </Link>

          <Link to="/documents?q=Indictment" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Legal Indictments
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              2019 SDNY Sex Trafficking Indictment and related federal filings.
            </p>
          </Link>

          <Link to="/documents?q=FBI" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              FBI Investigation Files
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              Bureau 'Phase 1' release files regarding Epstein's activities.
            </p>
          </Link>

          <Link to="/documents?q=Masseuse" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Masseuse List
              <span className={s.badgeRed}>KEY</span>
            </h3>
            <p className={s.sourceCardDesc}>Detailed schedule and contact list of massage staff.</p>
          </Link>

          <Link to="/documents?q=Incriminating" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              "Incriminating" Docs
              <span className={s.badgeRed}>KEY</span>
            </h3>
            <p className={s.sourceCardDesc}>
              Documents explicitly marked as incriminating in the archive.
            </p>
          </Link>

          <Link to="/documents?q=Deposition" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Civil Depositions
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              Testimony from Maxwell, Giuffre, Sjoberg, and others (2016).
            </p>
          </Link>

          <Link to="/documents?q=Katie%20Johnson" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              Katie Johnson Lawsuit
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              Federal complaint alleging abuse by Epstein and Trump.
            </p>
          </Link>

          <Link to="/documents?q=Birthday%20Book" state={backLinkState} className={s.sourceCard}>
            <h3 className={s.sourceCardTitle}>
              The Birthday Book
              <Icon name="Search" size="sm" className={s.searchLinkIcon} />
            </h3>
            <p className={s.sourceCardDesc}>
              Photo book and messages given to Epstein for his 50th birthday.
            </p>
          </Link>
        </div>
      </div>

      {/* Community Acknowledgments */}
      <div className={s.panelGradientAlt}>
        <h2 className={s.sectionTitle}>
          <Icon name="Users" size="lg" className={s.iconPurple400} />
          Community Acknowledgments
        </h2>
        <div className={s.ackBody}>
          <p>
            This platform is built upon the courageous work of survivors and independent researchers
            who have fought to bring these documents to light.
          </p>
          <ul className={s.ackList}>
            <li className={s.ackItem}>
              <span className={s.ackBullet}>•</span>
              <div>
                <strong>Manuel Sascha Barros</strong> (
                <a
                  href="https://www.threads.com/@saschabarros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.ackLink}
                >
                  @saschabarros
                </a>
                ) — For their courageous testimony and continued fight for survivors.
              </div>
            </li>
            <li className={s.ackItem}>
              <span className={s.ackBullet}>•</span>
              <div>
                <strong>Lisa Noelle Voldeng</strong> (
                <a
                  href="https://www.threads.com/@lvoldeng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.ackLink}
                >
                  @lvoldeng
                </a>
                ) — For the interview and bringing this into the sunlight. (
                <a
                  href="https://lisevoldeng.substack.com/p/dont-worry-boys-are-hard-to-find?r=1uodw7&triedRedirect=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.ackLink}
                >
                  Read on Substack
                </a>
                )
              </div>
            </li>
            <li className={s.ackItem}>
              <span className={s.ackBullet}>•</span>
              <div>
                <strong>Gareth Wright</strong> (
                <a
                  href="https://www.threads.com/@roguerevision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.ackLink}
                >
                  @roguerevision
                </a>
                ) — For the comprehensive transcriptions.
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Version History */}
      <div className={s.panel}>
        <h2 className={s.sectionTitle}>
          <Icon name="Activity" size="lg" className={s.accentIcon} />
          Version History
        </h2>
        <div className={s.versionStack}>
          {/* v18.2.0 */}
          <div className={s.versionEntryActive}>
            <h4 className={s.versionTitle}>
              v18.2.0 <span className={s.versionBadge}>LIQUID GLASS</span>
            </h4>
            <p className={s.versionDate}>April 1, 2026</p>
            <ul className={s.versionList}>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  <strong>Liquid Glass Core:</strong> Complete architectural shift to a unified,
                  bespoke design system for superior clarity and responsiveness across all devices.
                </span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  <strong>VIP Network Expansion:</strong> Integrated forensic intelligence for
                  high-profile identities (Doronin/DV) with advanced name-resolution mapping.
                </span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  <strong>Performance Optimization:</strong> Significant reduction in client-side
                  overhead through technical debt purge and optimized document rendering pipelines.
                </span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  <strong>Production Hardening:</strong> Finalized structural audit of high-density
                  DOJ media collections with enhanced video and document stability.
                </span>
              </li>
            </ul>
          </div>

          {/* v18.1.2 */}
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>
              v18.1.2 <span className={s.versionBadge}>PATCH</span>
            </h4>
            <p className={s.versionDate}>March 31, 2026</p>
            <ul className={s.versionList}>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  DOJ Prison Surveillance album: all 419 DOJ VOL8 videos now grouped under a
                  dedicated album in the video browser.
                </span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  Video titles updated to include recording timestamp extracted from file metadata
                  (e.g. EFTA00010707 — Nov 16, 2021 8:50 PM UTC).
                </span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  Added "People in Frame" filter to the video browser — surfaces only videos with
                  identified individuals linked.
                </span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  Video cards now display recording date and linked people's names inline.
                </span>
              </li>
            </ul>
          </div>

          {/* v18.1.0 */}
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>
              v18.1.0 <span className={s.versionBadgeMuted}>LIQUID GLASS</span>
            </h4>
            <p className={s.versionDate}>March 30, 2026</p>
            <ul className={s.versionList}>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>Complete migration to CSS Modules across all major pages and modals.</span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>Full enforcement of strict Design Token usage via CI automation.</span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>
                  Optimized Global Evidence Search with advanced filtering and semantic styling.
                </span>
              </li>
            </ul>
          </div>

          {/* v18.0.0 */}
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>
              v18.0.0 <span className={s.versionBadgeMuted}>CORE UPDATE</span>
            </h4>
            <p className={s.versionDate}>March 28, 2026</p>
            <ul className={s.versionList}>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>Major overhaul of the Evidence Repository architecture.</span>
              </li>
              <li className={s.versionListItem}>
                <span className={s.ackBullet}>•</span>
                <span>Improved ingestion pipeline for dual-script intelligence gathering.</span>
              </li>
            </ul>
          </div>

          {/* v13.0.1 */}
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>
              v13.0.1 <span className={s.versionBadge}>PARTIAL GO</span>
            </h4>
            <p className={s.versionDate}>February 11, 2026</p>
            <ul className={s.versionList}>
              <li>
                • **Live Ingestion Stats**: Real-time dashboard integration for DOJ dataset
                processing.
              </li>
              <li>
                • **Exo Cluster Optimization**: Enhanced AI enrichment pipeline for distributed
                Llama-3.1 inference.
              </li>
              <li>
                • **Forensic Snapshot**: Production release of the v13.0.0 codebase with
                user-approved partial certification.
              </li>
            </ul>
          </div>
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>
              v13.0.0 <span className={s.versionBadgeMuted}>CERTIFIED</span>
            </h4>
            <p className={s.versionDate}>February 11, 2026</p>
            <ul className={s.versionList}>
              <li>
                • **Forensic Observability**: Integrated Ingestion History and Backup Management
                into the Admin Dashboard.
              </li>
              <li>
                • **Zero-Downtime Snapshots**: Native database backup system with automated
                compression and 7-day rotation.
              </li>
              <li>
                • **Evidence Tracking**: Full provenance for entities and relationships, linking
                every claim to a specific ingest run.
              </li>
              <li>
                • **Integrity Monitoring**: Real-time forensic health checks for FTS synchronization
                and database consistency.
              </li>
            </ul>
          </div>
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>v12.15.0</h4>
            <p className={s.versionDate}>February 11, 2026</p>
            <ul className={s.versionList}>
              <li>
                • **Strict Type Safety**: Consolidated server types and removed unsafe assertions.
              </li>
              <li>
                • **Enhanced Media Linking**: Fixed photo tagging to surface all mentioned entities
                in galleries.
              </li>
              <li>
                • **Metadata Panel**: Added Unredaction Analysis and Knowledge Graph Claims to
                document views.
              </li>
            </ul>
          </div>
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>v12.14.1</h4>
            <p className={s.versionDate}>February 11, 2026</p>
            <ul className={s.versionList}>
              <li>• Restored missing entity biographies and descriptions in profile cards.</li>
              <li>
                • Fixed document association tracking to ensure accurate mention counts in modals.
              </li>
              <li>• Optimized API field mapping for unified entity intelligence.</li>
            </ul>
          </div>
          <div className={s.versionEntry}>
            <h4 className={s.versionTitle}>v12.14.0</h4>
            <p className={s.versionDate}>February 10, 2026</p>
            <ul className={s.versionList}>
              <li>
                • <strong>Mobile UX Hardening:</strong> Implemented sticky headers, background
                scroll-lock, and responsive modal scaling.
              </li>
              <li>
                • <strong>Schema Unification:</strong> Standardized media and entity mention
                structures across the entire archive.
              </li>
              <li>
                • <strong>WikiLink Engine:</strong> Automated cross-referencing for entities
                discovered within document text.
              </li>
              <li>
                • <strong>Ingestion Reliability:</strong> Hardened corpus ingestion and validation
                pipelines for production datasets.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className={s.disclaimer}>
        <h3 className={s.disclaimerTitle}>Disclaimer</h3>
        <p className={s.disclaimerBody}>
          This platform is designed for research and investigative purposes. All information
          presented is derived from publicly available sources. Users should verify information
          independently and exercise critical judgment when analyzing evidence. The presence of an
          individual's name in this database does not imply wrongdoing or criminal activity.
        </p>
      </div>

      {/* Footer */}
      <div className={s.footer}>
        <p className={s.footerText}>Built with transparency and accountability in mind</p>
        <p className={s.footerSub}>Last Updated: {__BUILD_DATE__}</p>
      </div>
    </div>
  );
};
