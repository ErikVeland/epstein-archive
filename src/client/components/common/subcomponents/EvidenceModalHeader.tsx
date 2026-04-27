import React from 'react';
import { ShieldAlert, FileText, Search, BookOpen, Calendar } from 'lucide-react';
import { CloseButton } from '../CloseButton';
import { Tabs, TabItem } from '../Tabs';
import { EntityPhoto } from '../EvidenceModal';
import s from './EvidenceModalHeader.module.css';

import { Button } from '../../../design-system/lib';

interface EvidenceEntity {
  id?: string | number;
  fullName?: string;
  primaryRole?: string;
  birthDate?: string | null;
  deathDate?: string | null;
  redFlagRating?: number;
}

interface EvidenceModalHeaderProps {
  entity: EvidenceEntity | null;
  loading: boolean;
  headerPhotoUrl: string | null;
  brokenMediaIds: Record<string, boolean>;
  setBrokenMediaIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleQuickAction: (action: 'blackbook' | 'timeline' | 'search') => void;
  activeQuickAction: 'blackbook' | 'timeline' | 'search' | null;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  forensicSummary: string;
  getRiskClass: (rating: number) => string;
  resolveEntityPhotoUrl: (photo: EntityPhoto | null, preferThumbnail?: boolean) => string | null;
  isVisualMediaItem: (photo: EntityPhoto | null) => boolean;
  headerPhoto: EntityPhoto | null;
}

export const EvidenceModalHeader: React.FC<EvidenceModalHeaderProps> = ({
  entity,
  loading,
  headerPhotoUrl,
  brokenMediaIds,
  setBrokenMediaIds,
  handleQuickAction,
  activeQuickAction,
  tabs,
  activeTab,
  onTabChange,
  onClose,
  forensicSummary,
  getRiskClass,
  resolveEntityPhotoUrl,
  isVisualMediaItem,
  headerPhoto,
}) => {
  const headerPhotoId = headerPhoto?.id ? String(headerPhoto.id) : 'header-photo';

  return (
    <div className={s.header}>
      <div className={s.photoContainer}>
        <div className={s.photoRing}>
          {loading ? (
            <div className={s.skeletonPhoto} />
          ) : headerPhotoUrl && !brokenMediaIds[headerPhotoId] ? (
            <img
              src={headerPhotoUrl}
              alt={entity?.fullName || 'Profile image'}
              className={s.photo}
              onError={(event) => {
                const fallbackUrl = resolveEntityPhotoUrl(headerPhoto, false);
                const img = event.currentTarget;
                if (fallbackUrl && img.dataset.fallbackApplied !== '1' && fallbackUrl !== img.src) {
                  img.dataset.fallbackApplied = '1';
                  img.src = fallbackUrl;
                  return;
                }
                setBrokenMediaIds((prev) => ({ ...prev, [headerPhotoId]: true }));
              }}
            />
          ) : (
            <div className={s.photoPlaceholder}>
              {headerPhoto && !isVisualMediaItem(headerPhoto) ? (
                <FileText size={32} />
              ) : (
                <Search size={32} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className={s.infoColumn}>
        {loading ? (
          <div className={s.skeletonInfo}>
            <div className={s.skeletonTitle} />
            <div className={s.skeletonSubtitle} />
            <div className={s.skeletonMeta}>
              <div className={s.skeletonMetaItem} />
              <div className={s.skeletonMetaItem} />
              <div className={s.skeletonMetaItem} />
            </div>
          </div>
        ) : (
          <>
            <div className={s.titleRow}>
              <h2 className={s.title}>{entity?.fullName}</h2>
              <span className={`${s.riskBadge} ${s[getRiskClass(entity?.redFlagRating || 0)]}`}>
                <ShieldAlert size={12} className={s.badgeIcon} />
                Risk {(entity?.redFlagRating || 0).toFixed(0)}/5
              </span>
            </div>

            <div className={s.subtitleRow}>
              <span className={s.role}>{entity?.primaryRole}</span>
              {(entity?.birthDate || entity?.deathDate) && (
                <>
                  <span className={s.dot} />
                  <span className={s.dates}>
                    {entity?.birthDate ? `b. ${entity.birthDate}` : ''}
                    {entity?.deathDate ? ` • d. ${entity.deathDate}` : ''}
                  </span>
                </>
              )}
            </div>

            <div className={s.forensicContainer}>
              <span className={s.forensicLabel}>Forensic Profile</span>
              <p className={s.forensicText}>{forensicSummary}</p>
            </div>

            <div className={s.desktopActions}>
              <div className={s.quickActions}>
                <Button
                  unstyled
                  onClick={() => handleQuickAction('blackbook')}
                  className={s.blackbookBtn}
                >
                  <BookOpen size={14} />
                  Black Book Entry
                </Button>
                <Button
                  unstyled
                  onClick={() => handleQuickAction('timeline')}
                  className={s.timelineBtn}
                >
                  <Calendar size={12} />
                  Timeline
                </Button>
                <Button
                  unstyled
                  onClick={() => handleQuickAction('search')}
                  className={s.searchBtn}
                >
                  <Search size={12} />
                  Search
                </Button>
              </div>

              {activeQuickAction && (
                <p className={s.actionContext}>
                  Context:{' '}
                  {activeQuickAction === 'blackbook'
                    ? 'Black Book'
                    : activeQuickAction === 'timeline'
                      ? 'Timeline'
                      : 'Search'}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div className={s.mobileActions}>
          <div className={s.quickActions}>
            <Button
              unstyled
              onClick={() => handleQuickAction('blackbook')}
              className={s.blackbookBtn}
            >
              <BookOpen size={14} />
              Black Book Entry
            </Button>
            <Button
              unstyled
              onClick={() => handleQuickAction('timeline')}
              className={s.timelineBtn}
            >
              <Calendar size={12} />
              Timeline
            </Button>
            <Button unstyled onClick={() => handleQuickAction('search')} className={s.searchBtn}>
              <Search size={12} />
              Search
            </Button>
          </div>

          {activeQuickAction && (
            <p className={s.actionContext}>
              Context:{' '}
              {activeQuickAction === 'blackbook'
                ? 'Black Book'
                : activeQuickAction === 'timeline'
                  ? 'Timeline'
                  : 'Search'}
            </p>
          )}
        </div>
      )}

      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={onTabChange}
        className={s.tabsOverride}
        variant="viewer"
      />

      <CloseButton
        onClick={onClose}
        size="md"
        label="Close entity profile"
        className={s.closeBtn}
      />
    </div>
  );
};
