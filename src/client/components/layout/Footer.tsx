import React, { useState, useEffect } from 'react';
import { ExternalLink, Github, Eye, EyeOff } from 'lucide-react';
import { useSensitiveSettings } from '../../contexts/SensitiveSettingsContext';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/apiClient';

interface FooterProps {
  onVersionClick?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onVersionClick }) => {
  const [systemStatus, setSystemStatus] = useState<{
    status: 'checking' | 'operational' | 'error';
    message?: string;
    details?: string;
  }>({ status: 'checking' });
  const { showAllSensitive, toggleShowAllSensitive } = useSensitiveSettings();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const [healthRes, statsRes, subjectsRes, documentsRes, mailboxesRes] =
          await Promise.allSettled([
            apiClient.readinessCheck(),
            apiClient.getStats(),
            apiClient.getSubjects({}, 1, 1),
            apiClient.getDocuments({}, 1, 1),
            apiClient.getEmailMailboxes(),
          ]);

        if (healthRes.status !== 'fulfilled') {
          throw healthRes.reason;
        }
        if (statsRes.status !== 'fulfilled') {
          throw statsRes.reason;
        }

        const health = healthRes.value;
        const stats = statsRes.value;

        const dbOk = health.checks?.db?.ok === true;
        const statsEntities = Number(stats?.totalEntities || 0);
        const statsDocuments = Number(stats?.totalDocuments || 0);
        // Use ?? so undefined (counts timed out) falls back to stats; only explicit 0 is an error
        const entities = Number(health.checks?.data?.entities ?? statsEntities);
        const documents = Number(health.checks?.data?.documents ?? statsDocuments);
        const probeFailures: string[] = [];

        if (subjectsRes.status !== 'fulfilled') probeFailures.push('subjects');
        if (documentsRes.status !== 'fulfilled') probeFailures.push('documents');
        if (mailboxesRes.status !== 'fulfilled') probeFailures.push('emails/mailboxes');

        const hasMinimumData =
          entities > 0 && documents > 0 && statsEntities > 0 && statsDocuments > 0;
        const probesHealthy = probeFailures.length === 0;

        if (health.status === 'ok' && dbOk && hasMinimumData && probesHealthy) {
          setSystemStatus({ status: 'operational' });
        } else {
          let errorDetail = 'Service reporting unhealthy status';
          if (health.checks?.db?.ok === false) {
            errorDetail = `Database Error: ${health.checks.db.error || 'Connection failed'}`;
          } else if (!hasMinimumData) {
            errorDetail = `Data Error: readiness(entities=${entities}, documents=${documents}), stats(entities=${statsEntities}, documents=${statsDocuments})`;
          } else if (!probesHealthy) {
            errorDetail = `Public Endpoint Error: ${probeFailures.join(', ')}`;
          }

          setSystemStatus({
            status: 'error',
            message: health.status.toUpperCase(),
            details: errorDetail,
          });
        }
      } catch (error) {
        setSystemStatus({
          status: 'error',
          message: 'CONNECTION FAILURE',
          details: error instanceof Error ? error.message : 'Unable to connect to API server',
        });
      }
    };
    checkHealth();
    // Re-check every 30 seconds for faster feedback
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    checking: { color: 'bg-yellow-500', text: 'Checking Status' },
    operational: { color: 'bg-green-600', text: 'Operational' },
    error: { color: 'bg-red-500', text: 'System Issue Detected' },
  };

  return (
    <footer className="w-full bg-[var(--glass-bg)] backdrop-blur-xl border-t border-[var(--glass-border)] py-12 mt-auto z-10 relative">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Column 1: Brand & Copyright */}
          <div className="space-y-6">
            <h3 className="font-display text-xl font-normal text-[var(--text-primary)] tracking-tight">
              The Epstein Files
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs">
              A comprehensive, searchable forensic archive of documents, connections, and financial
              flows regarding the Jeffrey Epstein network.
            </p>
            <div
              className={`pt-2 flex items-center gap-2 group relative ${systemStatus.status === 'error' ? 'cursor-help' : ''}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${statusConfig[systemStatus.status].color}`}
              ></div>
              <p className="text-[var(--text-secondary)] text-xs font-mono">
                {statusConfig[systemStatus.status].text}
              </p>

              {/* Status Tooltip */}
              {systemStatus.status === 'error' && (
                <div className="absolute bottom-full left-0 mb-2 px-3 py-2 glass-panel text-red-400 rounded shadow-[var(--glass-shadow)] text-xs w-64 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none backdrop-blur-md">
                  <div className="font-bold mb-1">System Error:</div>
                  <div className="font-mono mb-1">{systemStatus.message}</div>
                  {systemStatus.details && (
                    <div className="text-[10px] opacity-80 leading-tight border-t border-white/5 pt-1 mt-1">
                      {systemStatus.details}
                    </div>
                  )}
                  <div className="absolute -bottom-1 left-4 w-2 h-2 bg-[var(--bg-surface)] border-r border-b border-[var(--glass-border)] transform rotate-45"></div>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Mission & Transparency */}
          <div className="space-y-6">
            <h4 className="text-xs font-medium text-[var(--text-muted)] border-l-2 border-[var(--glass-border)] pl-3 mb-1 tracking-wide">
              Mission
            </h4>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li>
                <Link
                  to="/about"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    Transparency Vow
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    Methodology & Ethics
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/the-epstein-files"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    The Epstein Files
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/epstein-documents"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    Epstein Documents
                  </span>
                </Link>
              </li>
              <li>
                <Link
                  to="/epstein-media"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    Epstein Media
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-6">
            <h4 className="text-xs font-medium text-[var(--text-muted)] border-l-2 border-[var(--glass-border)] pl-3 mb-1 tracking-wide">
              Support
            </h4>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li>
                <a
                  href="https://coff.ee/generik"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400 transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    Support the Investigation
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <p className="text-xs text-[var(--text-muted)] mt-2 italic border-l-2 border-[var(--glass-border)] pl-3">
                  "Independent open-source intelligence requires community support."
                </p>
              </li>
            </ul>
          </div>

          {/* Column 4: Network */}
          <div className="space-y-6">
            <h4 className="text-xs font-medium text-[var(--text-muted)] border-l-2 border-[var(--glass-border)] pl-3 mb-1 tracking-wide">
              Network
            </h4>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li>
                <a
                  href="https://github.com/ErikVeland/epstein-archive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <Github className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
                  <span className="group-hover:translate-x-1 transition-transform">
                    GitHub Repository
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://about.glasscode.academy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    Glass Academy
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://generik.substack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors flex items-center gap-2 group w-fit"
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    The End Times (Substack)
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--glass-border)] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <span className="text-[var(--text-secondary)]">
              &copy; 2025 Glass Academy. All rights reserved.
            </span>
            <span className="hidden md:inline text-[var(--text-muted)]">|</span>
            <button
              onClick={onVersionClick}
              className="hover:text-[var(--accent)] transition-colors cursor-pointer flex items-center gap-2 px-3 py-1 bg-[var(--glass-bg)] rounded-full border border-[var(--glass-border)] hover:border-[var(--accent)]"
              title="View Release Notes"
            >
              <span className="font-mono text-[var(--accent)]/80">v{__APP_VERSION__}</span>
              <span className="w-1 h-1 bg-[var(--glass-border)] rounded-full"></span>
              <span>Updated: {__BUILD_DATE__}</span>
            </button>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={toggleShowAllSensitive}
              className={`flex items-center gap-2 text-xs transition-colors ${showAllSensitive ? 'text-amber-400 hover:text-amber-300' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              title={
                showAllSensitive
                  ? 'Hide sensitive content by default'
                  : 'Show all sensitive content'
              }
            >
              {showAllSensitive ? <Eye size={12} /> : <EyeOff size={12} />}
              <span className="hidden sm:inline">
                {showAllSensitive ? 'Sensitive Content Visible' : 'Sensitive Content'}
              </span>
            </button>
            <a
              href="#"
              className="hover:text-[var(--text-primary)] transition-colors hover:underline decoration-[var(--glass-border)] underline-offset-4"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-[var(--text-primary)] transition-colors hover:underline decoration-[var(--glass-border)] underline-offset-4"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
