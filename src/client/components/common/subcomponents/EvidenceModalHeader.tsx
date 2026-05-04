import React, { useState } from 'react';
import Icon from '@client/components/common/Icon';
import { CloseButton } from '../CloseButton';
import { Tabs, TabItem } from '../Tabs';
import { EntityPhoto } from '../EvidenceModal';
import s from './EvidenceModalHeader.module.css';

import { Button } from '@client/design-system/lib';

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
  const [showProfilePopover, setShowProfilePopover] = useState(false);
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
                <Icon name="FileText" size="xl" />
              ) : (
                <Icon name="Search" size="xl" />
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
                <Icon name="ShieldAlert" size="xs" className={s.badgeIcon} />
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

              <div className={s.forensicPopoverContainer}>
                <Button
                  unstyled
                  onClick={() => setShowProfilePopover(!showProfilePopover)}
                  className={s.forensicButton}
                >
                  <Icon name="FileText" size="xs" />
                  <span>Profile Summary</span>
                </Button>
                {showProfilePopover && (
                  <div className={s.forensicPopover}>
                    <div className={s.forensicPopoverHeader}>
                      <span>Forensic Profile</span>
                      <Button
                        unstyled
                        onClick={() => setShowProfilePopover(false)}
                        className={s.popoverCloseBtn}
                      >
                        <Icon name="X" size="xs" />
                      </Button>
                    </div>
                    <p className={s.forensicText}>{forensicSummary}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {!loading && (
        <div className={s.actionsArea}>
          <div className={s.quickActions}>
            <Button
              unstyled
              onClick={() => handleQuickAction('blackbook')}
              className={s.blackbookBtn}
            >
              <Icon name="BookOpen" size="sm" />
              Black Book Entry
            </Button>
            <Button
              unstyled
              onClick={() => handleQuickAction('timeline')}
              className={s.timelineBtn}
            >
              <Icon name="Calendar" size="xs" />
              Timeline
            </Button>
            <Button unstyled onClick={() => handleQuickAction('search')} className={s.searchBtn}>
              <Icon name="Search" size="xs" />
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

      <div className={s.mobileTabsDropdownContainer}>
        <label htmlFor="mobile-tabs-select" className={s.mobileTabsLabel}>
          Section:
        </label>
        <select
          id="mobile-tabs-select"
          className={s.mobileTabsSelect}
          value={activeTab}
          onChange={(e) => onTabChange(e.target.value)}
        >
          {tabs.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      <div className={s.desktopTabsContainer}>
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={onTabChange}
          className={s.tabsOverride}
          variant="viewer"
        />
      </div>

      <CloseButton
        onClick={onClose}
        size="md"
        label="Close entity profile"
        className={s.closeBtn}
      />
    </div>
  );
};
