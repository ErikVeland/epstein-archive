import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { useSensitiveSettings } from '@client/contexts/SensitiveSettingsContext';
import { Link } from 'react-router-dom';
import { apiClient } from '@client/services/apiClient';
import { Button, Surface } from '@client/design-system/lib';
import s from './Footer.module.css';

interface FooterProps {
  onVersionClick?: () => void;
}

interface SystemStatus {
  status: 'checking' | 'operational' | 'error';
  message?: string;
  details?: string;
}

const Footer: React.FC<FooterProps> = ({ onVersionClick }) => {
  const { showAllSensitive, toggleShowAllSensitive } = useSensitiveSettings();

  const { data: systemStatus = { status: 'checking' as const } } = useQuery<SystemStatus>({
    queryKey: ['footer-health'],
    queryFn: async (): Promise<SystemStatus> => {
      try {
        const [health, stats] = await Promise.all([
          apiClient.readinessCheck(),
          apiClient.getStats(),
        ]);
        const typedStats = stats as { totalEntities?: number; totalDocuments?: number };

        const dbOk = health.checks?.db?.ok === true;
        const statsEntities = Number(typedStats?.totalEntities || 0);
        const statsDocuments = Number(typedStats?.totalDocuments || 0);
        const entities = Number(health.checks?.data?.entities ?? statsEntities);
        const documents = Number(health.checks?.data?.documents ?? statsDocuments);

        const hasMinimumData =
          entities > 0 && documents > 0 && statsEntities > 0 && statsDocuments > 0;

        if (health.status === 'ok' && dbOk && hasMinimumData) {
          return { status: 'operational' };
        } else {
          let errorDetail = 'Live services are responding with partial availability.';
          if (health.checks?.db?.ok === false) {
            errorDetail = 'The archive API is reachable, but database checks are failing.';
          } else if (!hasMinimumData) {
            errorDetail = 'Core datasets are still loading or currently unavailable.';
          }

          return { status: 'error', message: 'DEGRADED', details: errorDetail };
        }
      } catch (error) {
        return {
          status: 'error',
          message: 'OFFLINE',
          details:
            error instanceof Error
              ? `Unable to reach live services: ${error.message}`
              : 'Unable to reach live services at the moment.',
        };
      }
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const statusText = {
    checking: 'Checking Live Data',
    operational: 'Live Data Available',
    error: 'Limited Live Data',
  };

  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.grid}>
          {/* Column 1: Brand & Copyright */}
          <div className={s.column}>
            <h3 className={s.brandHeading}>The Epstein Files</h3>
            <p className={s.bodyText}>
              A comprehensive, searchable forensic archive of documents, connections, and financial
              flows regarding the Jeffrey Epstein network.
            </p>
            <div
              className={`${s.statusRow} ${systemStatus.status === 'error' ? s['statusRow--error'] : ''}`}
            >
              <div className={s.statusDot} data-status={systemStatus.status} />
              <p className={s.statusText}>{statusText[systemStatus.status]}</p>

              {/* Status Tooltip */}
              {systemStatus.status === 'error' && (
                <Surface variant="glass-strong" className={s.statusTooltip}>
                  <div className={s.statusTooltipTitle}>Live Data Status</div>
                  <div className={s.statusTooltipMessage}>{systemStatus.message}</div>
                  {systemStatus.details && (
                    <div className={s.statusTooltipDetails}>{systemStatus.details}</div>
                  )}
                  <div className={s.statusTooltipArrow} />
                </Surface>
              )}
            </div>
          </div>

          {/* Column 2: Mission & Transparency */}
          <div className={s.column}>
            <h4 className={s.columnHeading}>Mission</h4>
            <ul className={s.navList}>
              <li>
                <Link to="/about" className={s.navLink}>
                  <span className={s.navLinkText}>Transparency Vow</span>
                  <Icon name="ArrowRight" size="xs" className={s.navLinkIcon} />
                </Link>
              </li>
              <li>
                <Link to="/about" className={s.navLink}>
                  <span className={s.navLinkText}>Methodology &amp; Ethics</span>
                </Link>
              </li>
              <li>
                <Link to="/the-epstein-files" className={s.navLink}>
                  <span className={s.navLinkText}>The Epstein Files</span>
                </Link>
              </li>
              <li>
                <Link to="/epstein-documents" className={s.navLink}>
                  <span className={s.navLinkText}>Epstein Documents</span>
                </Link>
              </li>
              <li>
                <Link to="/epstein-media" className={s.navLink}>
                  <span className={s.navLinkText}>Epstein Media</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className={s.column}>
            <h4 className={s.columnHeading}>Support</h4>
            <ul className={s.navList}>
              <li>
                <a
                  href="https://coff.ee/generik"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.navLink}
                >
                  <span className={s.navLinkText}>Support the Investigation</span>
                  <Icon name="ExternalLink" size="xs" className={s.navLinkIcon} />
                </a>
              </li>
              <li>
                <a
                  href="https://www.gofundme.com/manage/never-stop-talking-about-the-epstein-files"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.navLink}
                >
                  <span className={s.navLinkText}>GoFundMe Campaign</span>
                  <Icon name="ExternalLink" size="xs" className={s.navLinkIcon} />
                </a>
              </li>
              <li>
                <p className={s.supportQuote}>
                  &ldquo;Independent open-source intelligence requires community support.&rdquo;
                </p>
              </li>
            </ul>
          </div>

          {/* Column 4: Network */}
          <div className={s.column}>
            <h4 className={s.columnHeading}>Network</h4>
            <ul className={s.navList}>
              <li>
                <a
                  href="https://github.com/ErikVeland/epstein-archive"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.navLink}
                >
                  <Icon name="Github" size="sm" className={s.githubIcon} />
                  <span className={s.navLinkText}>GitHub Repository</span>
                  <Icon name="ExternalLink" size="xs" className={s.navLinkIcon} />
                </a>
              </li>
              <li>
                <a
                  href="https://about.glasscode.academy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.navLink}
                >
                  <span className={s.navLinkText}>Glass Academy</span>
                  <Icon name="ExternalLink" size="xs" className={s.navLinkIcon} />
                </a>
              </li>
              <li>
                <a
                  href="https://generik.substack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.navLink}
                >
                  <span className={s.navLinkText}>The End Times (Substack)</span>
                  <Icon name="ExternalLink" size="xs" className={s.navLinkIcon} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={s.bottomBar}>
          <div className={s.bottomBarLeft}>
            <span className={s.copyright}>&copy; 2025 Glass Academy. All rights reserved.</span>
            <span className={s.divider}>|</span>
            <Button
              unstyled
              onClick={onVersionClick}
              className={s.versionBtn}
              title="View Release Notes"
            >
              <span className={s.versionText}>v{__APP_VERSION__}</span>
              <span className={s.versionDot} />
              <span>Updated: {__BUILD_DATE__}</span>
            </Button>
          </div>
          <div className={s.bottomBarRight}>
            <Button
              unstyled
              onClick={toggleShowAllSensitive}
              className={`${s.sensitiveBtn} ${showAllSensitive ? s.sensitiveBtnActive : ''}`}
              title={
                showAllSensitive
                  ? 'Hide sensitive content by default'
                  : 'Show all sensitive content'
              }
            >
              {showAllSensitive ? <Icon name="Eye" size="sm" /> : <Icon name="EyeOff" size="sm" />}
              <span className={s.sensitiveBtnLabel}>
                {showAllSensitive ? 'Sensitive Content Visible' : 'Sensitive Content'}
              </span>
            </Button>
            <Link to="/privacy" className={s.footerLink}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={s.footerLink}>
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
