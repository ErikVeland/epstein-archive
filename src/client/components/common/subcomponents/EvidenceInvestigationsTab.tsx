import React from 'react';
import { Briefcase, ExternalLink, Clock } from 'lucide-react';
import { formatMetaDate } from '../../../utils/evidenceUtils';
import { cn } from '../../../utils/cn';
import s from './EvidenceInvestigationsTab.module.css';

import { Button } from '../../../design-system/lib';

interface InvestigationEntity {
  id?: string | number;
  uuid?: string;
  title?: string;
  description?: string;
  status?: string;
  updated_at?: string;
  _fallbackReason?: string;
}

interface EvidenceInvestigationsTabProps {
  investigations: InvestigationEntity[];
  isInvestigationsLoading: boolean;
  investigationsInitialized: boolean;
  onOpenCase: (uuid: string) => void;
}

export const EvidenceInvestigationsTab: React.FC<EvidenceInvestigationsTabProps> = ({
  investigations,
  isInvestigationsLoading,
  investigationsInitialized,
  onOpenCase,
}) => {
  return (
    <div className={s.tabContainer} data-testid="entity-modal-tab-investigations">
      <div className={s.header}>
        <h3 className={s.headerTitle}>
          <Briefcase size={16} className={s.investigateIcon} />
          Linked Investigations
        </h3>
        <div className={s.countBadge}>
          {isInvestigationsLoading ? 'Loading cases...' : `${investigations.length} open cases`}
        </div>
      </div>

      <div className={s.listContainer}>
        {isInvestigationsLoading && (
          <div className={s.skeletonStack}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={s.skeletonCard}>
                <div className={s.skeletonTitle} />
                <div className={s.skeletonText} />
                <div className={s.skeletonMetaRow}>
                  <div className={s.skeletonBadge} />
                  <div className={s.skeletonBadge} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isInvestigationsLoading && investigationsInitialized && investigations.length === 0 && (
          <div className={s.emptyState}>
            <Briefcase size={48} className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>No Active Investigations</h4>
            <p className={s.emptyText}>
              This entity is not currently linked as primary evidence in any open investigation
              workflows.
            </p>
          </div>
        )}

        {!isInvestigationsLoading &&
          investigations.map((inv) => (
            <div key={inv.id} className={s.card}>
              <div className={s.cardContent}>
                <div className={s.cardHeader}>
                  <div className={s.cardTitles}>
                    <h4 className={s.cardTitle}>{inv.title}</h4>
                    <p className={s.cardDescription}>
                      {inv.description || 'No case description provided.'}
                    </p>
                  </div>
                  <Button
                    unstyled
                    onClick={() => inv.uuid && onOpenCase(inv.uuid)}
                    className={s.openBtn}
                  >
                    Open Case
                    <ExternalLink size={14} />
                  </Button>
                </div>

                <div className={s.cardFooter}>
                  <span
                    className={cn(
                      s.statusBadge,
                      inv.status === 'open' ? s.statusOpen : s.statusClosed,
                    )}
                  >
                    {inv.status}
                  </span>
                  {inv._fallbackReason && (
                    <span className={s.fallbackBadge}>{inv._fallbackReason}</span>
                  )}
                  <span className={s.metaDate}>
                    <Clock size={12} className={s.dateIcon} />
                    Updated {formatMetaDate(inv.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
