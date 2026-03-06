import React from 'react';
import {
  Shield,
  Database,
  Search,
  TrendingUp,
  Camera,
  FileText,
  Users,
  Target,
  Activity,
} from 'lucide-react';

import { optimizedDataService } from '../../services/OptimizedDataService';

export const About: React.FC = () => {
  const [stats, setStats] = React.useState<any | null>(null);
  const [pipelineStatus, setPipelineStatus] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await optimizedDataService.getStatistics();
        if (data) {
          setStats({
            total: 5200000,
            released: data.totalDocuments || data.documents || 0,
          });
          if (data.collectionCounts) {
            // setIngestionStats(data.collectionCounts); // unused
          }
          if (data.pipeline_status) {
            setPipelineStatus(data.pipeline_status);
          }
        }
      } catch (e) {
        console.error('Failed to fetch stats', e);
      }
    };
    fetchStats();
  }, []);

  const percentage = stats ? ((stats.released / stats.total) * 100).toFixed(4) : '0';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Epstein Archive Investigation Platform
        </h1>
        <p className="text-xl text-slate-400 mb-6">
          Version {__APP_VERSION__} - Lean Schema & Interactive Intelligence
        </p>
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-sm font-semibold animate-pulse mb-6">
          Estimated Time to Completion: ~{pipelineStatus?.eta_minutes || 240} minutes (Downloading &
          Ingesting)
        </div>

        {stats && (
          <div className="inline-flex items-center gap-4 bg-slate-800/80 px-6 py-3 rounded-full border border-emerald-500/30 shadow-lg shadow-emerald-900/10 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                Files Secured
              </span>
              <span className="text-2xl font-mono text-emerald-400 font-bold">
                {stats.released.toLocaleString()}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                Total Archive
              </span>
              <span className="text-2xl font-mono text-slate-500 font-bold">5.2M</span>
            </div>
            <div className="h-8 w-px bg-slate-700"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-emerald-500 uppercase tracking-widest font-semibold animate-pulse">
                Progress
              </span>
              <span className="text-2xl font-mono text-white font-bold">{percentage}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Ingestion Progress Section */}
      <div className="bg-slate-800/50 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Database className="h-6 w-6 text-purple-500" />
          DOJ Disclosure Ingestion Status
        </h2>
        <div className="space-y-8">
          {(pipelineStatus?.datasets || []).map((dataset: any) => {
            const currentIngested = dataset.ingested;
            const currentDownloaded = dataset.downloaded;
            const target = dataset.target;

            const ingestPercent = Math.min(100, (currentIngested / target) * 100);
            const downloadPercent = Math.min(100, (currentDownloaded / target) * 100);
            const isComplete = currentIngested >= target;

            return (
              <div key={dataset.name} className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300 font-medium">{dataset.name}</span>
                  <div className="text-right">
                    <span className="text-slate-400 font-mono block">
                      Download: {currentDownloaded.toLocaleString()} / {target.toLocaleString()} (
                      {downloadPercent.toFixed(1)}%)
                    </span>
                    <span className="text-purple-400 font-mono block">
                      Ingest: {currentIngested.toLocaleString()} / {target.toLocaleString()} (
                      {ingestPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Advanced Dual Progress Bar */}
                <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                  {/* Download Progress (Back Layer) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-500/40 transition-all duration-1000"
                    style={{ width: `${downloadPercent}%` }}
                  />
                  {/* Ingest Progress (Top Layer) */}
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'}`}
                    style={{ width: `${ingestPercent}%` }}
                  >
                    {!isComplete && (
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] skew-x-12"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-6 italic">
          * Live ingestion metrics. Download status reflects filesystem discovery; Ingest status
          reflects database commitment.
        </p>
      </div>

      {/* Mission Statement */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Target className="h-6 w-6 text-rose-500" />
          Mission
        </h2>
        <p className="text-slate-300 text-lg leading-relaxed">
          The Epstein Archive is a comprehensive investigative platform designed to organise,
          analyse, and present evidence related to the Jeffrey Epstein case. Our mission is to
          provide researchers, journalists, and the public with powerful tools to explore
          connections, identify patterns, and uncover insights from thousands of documents, flight
          logs, and evidence records.
        </p>
      </div>

      {/* System Analysis & Improvements */}
      <div className="bg-slate-800/50 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-emerald-500" />
          System Analysis & Improvements
        </h2>
        <p className="text-slate-300 mb-6 leading-relaxed">
          We have transformed the "chaotic archive" of disparate files described in recent analysis
          into a <strong>Forensic Intelligence Platform</strong>. By moving beyond static lists to a
          dynamic, interconnected system, we respect the complexity and legal nuance of the case.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 border-b border-slate-600 text-slate-200 font-semibold bg-slate-700/50 rounded-tl-lg">
                  Article Concept
                </th>
                <th className="p-4 border-b border-slate-600 text-slate-200 font-semibold bg-slate-700/50">
                  Current "Status Quo"
                </th>
                <th className="p-4 border-b border-slate-600 text-slate-200 font-semibold bg-slate-700/50 rounded-tr-lg">
                  Platform Improvement
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-medium text-white">Data Structure</td>
                <td className="p-4 text-slate-400">"Chaotic archive", "image scans"</td>
                <td className="p-4 text-emerald-400 font-medium">
                  Structured Database & Searchable Text (OCR)
                </td>
              </tr>
              <tr className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-medium text-white">Flight Logs</td>
                <td className="p-4 text-slate-400">Static lists, "Guilt by association"</td>
                <td className="p-4 text-emerald-400 font-medium">
                  Network Graph & Forensic Cross-Referencing
                </td>
              </tr>
              <tr className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-medium text-white">Black Book</td>
                <td className="p-4 text-slate-400">"Rolodex" conflated with "Client List"</td>
                <td className="p-4 text-emerald-400 font-medium">
                  Searchable Contact Database (distinct from criminal evidence)
                </td>
              </tr>
              <tr className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-medium text-white">Emails</td>
                <td className="p-4 text-slate-400">Massive unreadable cache</td>
                <td className="p-4 text-emerald-400 font-medium">
                  Communication Pattern Analysis (Frequency, Timing, Network)
                </td>
              </tr>
              <tr className="hover:bg-slate-700/30 transition-colors">
                <td className="p-4 font-medium text-white">Nuance</td>
                <td className="p-4 text-slate-400">Lost in public discussion</td>
                <td className="p-4 text-emerald-400 font-medium">
                  Red Flag Index (Quantified Risk vs. Association)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <FileText className="h-6 w-6 text-cyan-500" />
          How We Process Data
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                1
              </span>
              Ingestion
            </h4>
            <p className="text-sm text-slate-400">
              We ingest raw PDFs, images, and emails from varied sources. Every file is registered,
              hashed for integrity, and categorised.
            </p>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                2
              </span>
              Digitization (OCR)
            </h4>
            <p className="text-sm text-slate-400">
              Scanning software reads every page. We use <strong>Competitive OCR</strong> to compare
              results from different engines and extract the most accurate text possible.
            </p>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                3
              </span>
              Analysis
            </h4>
            <p className="text-sm text-slate-400">
              Our system scans for <strong>Visual Redactions</strong> (black boxes) to flag hidden
              info, and uses AI to identify people in photos.
            </p>
          </div>
          <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
            <h4 className="font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">
                4
              </span>
              Connection
            </h4>
            <p className="text-sm text-slate-400">
              We link people, organisations, and events across documents to build a searchable
              knowledge graph.
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-8 w-8 text-blue-500" />
            <h3 className="text-xl font-bold text-white">Evidence Pipeline</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• 51,379+ enriched evidence records</li>
            <li>• OCR processing for scanned documents</li>
            <li>• Automated entity extraction</li>
            <li>• Red Flag Index (0-5 scale) for evidence rating</li>
            <li>• Risk Index scoring system</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-8 w-8 text-purple-500" />
            <h3 className="text-xl font-bold text-white">Entity Network</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• 45,968+ identified entities</li>
            <li>• Person and organisation tracking</li>
            <li>• Relationship mapping</li>
            <li>• Connection strength analysis</li>
            <li>• Social network visualization</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Search className="h-8 w-8 text-green-500" />
            <h3 className="text-xl font-bold text-white">Advanced Search</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Full-text search across all documents</li>
            <li>• Entity-based filtering</li>
            <li>• Date range queries</li>
            <li>• Evidence type filtering</li>
            <li>• Contextual search results</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Camera className="h-8 w-8 text-rose-500" />
            <h3 className="text-xl font-bold text-white">Media Browser</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Photo album organisation</li>
            <li>• Image metadata extraction</li>
            <li>• Advanced search and filtering</li>
            <li>• Format and date-based sorting</li>
            <li>• Thumbnail generation</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="h-8 w-8 text-amber-500" />
            <h3 className="text-xl font-bold text-white">Document Analysis</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Flight log parsing and analysis</li>
            <li>• Court document processing</li>
            <li>• Timeline reconstruction</li>
            <li>• Pattern detection</li>
            <li>• Cross-reference verification</li>
          </ul>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-8 w-8 text-cyan-500" />
            <h3 className="text-xl font-bold text-white">Analytics Dashboard</h3>
          </div>
          <ul className="text-slate-300 space-y-2">
            <li>• Interactive data visualizations</li>
            <li>• Statistical analysis tools</li>
            <li>• Trend identification</li>
            <li>• Geographic mapping</li>
            <li>• Timeline analysis</li>
          </ul>
        </div>
      </div>

      {/* Technical Stack */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-500" />
          Technical Architecture
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Frontend</h4>
            <ul className="text-slate-300 space-y-1 text-sm">
              <li>• React 18 with TypeScript</li>
              <li>• Vite build system</li>
              <li>• TailwindCSS styling</li>
              <li>• Recharts visualizations</li>
              <li>• Lucide icons</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Backend</h4>
            <ul className="text-slate-300 space-y-1 text-sm">
              <li>• Node.js + Express</li>
              <li>• TypeScript</li>
              <li>• PostgreSQL database</li>
              <li>• RESTful API architecture</li>
              <li>• MediaService integration</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-3">Testing & QA</h4>
            <ul className="text-slate-300 space-y-1 text-sm">
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
      <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">Data Sources</h2>
        <p className="text-slate-300 mb-6">
          This archive aggregates publicly available information from various sources. Click on a
          source to explore the related documents and evidence within the platform.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/blackbook"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Unredacted Black Book
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              1,101 contacts from Epstein's original 1990s address book.
            </p>
          </a>

          <a
            href="/documents?q=Flight%20Log"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Epstein Flight Logs
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              Pilot logs documenting travel on Epstein's private aircraft ("Lolita Express").
            </p>
          </a>

          <a
            href="/documents?q=Jeeproject"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              The Estate Emails ("Jeeproject")
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                26,020 MSGs
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Massive archive of Yahoo emails (2007-2019) from the "Jeeproject" account.
            </p>
          </a>

          <a
            href="/documents?q=Oversight"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              House Oversight Production
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                ~15,500 FILES
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              "Seventh Production" release containing photos and documents.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 bg-rose-500/50 rounded-sm"></span>
              Average Redaction: 12.4% (Calculated via OCR)
            </div>
          </a>

          <a
            href="/documents?q=DOJ%20VOL00001"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              DOJ Evidence Vol. 1
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                NEW
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Raw digital evidence from the 2019 FBI raid of the NYC residence.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 bg-emerald-500/50 rounded-sm"></span>
              99.8% Unredacted (Raw Evidence)
            </div>
          </a>

          <a
            href="/documents?q=Ehud%20Barak"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Ehud Barak Emails
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                1,411 MSGs
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Correspondence exchanged with former Israeli PM Ehud Barak (2013-2016).
            </p>
          </a>

          <a
            href="/documents?q=Indictment"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Legal Indictments
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              2019 SDNY Sex Trafficking Indictment and related federal filings.
            </p>
          </a>

          <a
            href="/documents?q=FBI"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              FBI Investigation Files
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              Bureau 'Phase 1' release files regarding Epstein's activities.
            </p>
          </a>

          <a
            href="/documents?q=Masseuse"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Masseuse List
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                KEY
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Detailed schedule and contact list of massage staff.
            </p>
          </a>

          <a
            href="/documents?q=Incriminating"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              "Incriminating" Docs
              <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                KEY
              </span>
            </h3>
            <p className="text-sm text-slate-400">
              Documents explicitly marked as incriminating in the archive.
            </p>
          </a>

          <a
            href="/documents?q=Deposition"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Civil Depositions
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              Testimony from Maxwell, Giuffre, Sjoberg, and others (2016).
            </p>
          </a>

          <a
            href="/documents?q=Katie%20Johnson"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              Katie Johnson Lawsuit
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              Federal complaint alleging abuse by Epstein and Trump.
            </p>
          </a>

          <a
            href="/documents?q=Birthday%20Book"
            className="block p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600 hover:border-blue-500 group"
          >
            <h3 className="font-bold text-white mb-1 group-hover:text-blue-400 flex items-center">
              The Birthday Book
              <Search className="h-4 w-4 ml-2 opacity-50 group-hover:opacity-100" />
            </h3>
            <p className="text-sm text-slate-400">
              Photo book and messages given to Epstein for his 50th birthday.
            </p>
          </a>
        </div>
      </div>

      {/* Community Acknowledgments */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Users className="h-6 w-6 text-purple-400" />
          Community Acknowledgments
        </h2>
        <div className="space-y-4 text-slate-300">
          <p>
            This platform is built upon the courageous work of survivors and independent researchers
            who have fought to bring these documents to light.
          </p>
          <ul className="space-y-3 mt-4">
            <li className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <div>
                <strong>Manuel Sascha Barros</strong> (
                <a
                  href="https://www.threads.com/@saschabarros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  @saschabarros
                </a>
                ) — For their courageous testimony and continued fight for survivors.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <div>
                <strong>Lisa Noelle Voldeng</strong> (
                <a
                  href="https://www.threads.com/@lvoldeng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  @lvoldeng
                </a>
                ) — For the interview and bringing this into the sunlight. (
                <a
                  href="https://lisevoldeng.substack.com/p/dont-worry-boys-are-hard-to-find?r=1uodw7&triedRedirect=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  Read on Substack
                </a>
                )
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <div>
                <strong>Gareth Wright</strong> (
                <a
                  href="https://www.threads.com/@roguerevision"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline"
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
      <div className="bg-slate-800/50 rounded-xl p-8 mb-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Activity className="h-6 w-6 text-cyan-400" />
          Version History
        </h2>
        <div className="space-y-6">
          <div className="border-l-2 border-emerald-500 pl-4">
            <h4 className="text-white font-bold flex items-center gap-2">
              v13.0.1{' '}
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
                PARTIAL GO
              </span>
            </h4>
            <p className="text-xs text-slate-500 mb-2">February 11, 2026</p>
            <ul className="text-sm text-slate-400 space-y-1">
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
          <div className="border-l-2 border-slate-700 pl-4">
            <h4 className="text-slate-200 font-bold">
              v13.0.0{' '}
              <span className="text-[10px] bg-slate-500/20 text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/30 font-bold">
                CERTIFIED
              </span>
            </h4>
            <p className="text-xs text-slate-500 mb-2">February 11, 2026</p>
            <ul className="text-sm text-slate-400 space-y-1">
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
          <div className="border-l-2 border-slate-700 pl-4">
            <h4 className="text-slate-200 font-bold">v12.15.0</h4>
            <p className="text-xs text-slate-500 mb-2">February 11, 2026</p>
            <ul className="text-sm text-slate-400 space-y-1">
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
          <div className="border-l-2 border-slate-700 pl-4">
            <h4 className="text-slate-200 font-bold">v12.14.1</h4>
            <p className="text-xs text-slate-500 mb-2">February 11, 2026</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Restored missing entity biographies and descriptions in profile cards.</li>
              <li>
                • Fixed document association tracking to ensure accurate mention counts in modals.
              </li>
              <li>• Optimized API field mapping for unified entity intelligence.</li>
            </ul>
          </div>
          <div className="border-l-2 border-slate-700 pl-4">
            <h4 className="text-slate-200 font-bold">v12.14.0</h4>
            <p className="text-xs text-slate-500 mb-2">February 10, 2026</p>
            <ul className="text-sm text-slate-400 space-y-1">
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
      <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-amber-400 mb-3">Disclaimer</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          This platform is designed for research and investigative purposes. All information
          presented is derived from publicly available sources. Users should verify information
          independently and exercise critical judgment when analyzing evidence. The presence of an
          individual's name in this database does not imply wrongdoing or criminal activity.
        </p>
      </div>

      {/* Footer */}
      <div className="text-center mt-12 pt-8 border-t border-slate-700">
        <p className="text-slate-400">Built with transparency and accountability in mind</p>
        <p className="text-slate-500 text-sm mt-2">Last Updated: {__BUILD_DATE__}</p>
      </div>
    </div>
  );
};
