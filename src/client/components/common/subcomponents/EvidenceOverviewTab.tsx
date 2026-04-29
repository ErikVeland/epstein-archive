import React from 'react';
import Icon from '@client/components/common/Icon';
import { Skeleton } from '../Skeleton';
import { SignalPanel } from '@client/components/entities/cards/SignalPanel';
import { DriverChips } from '@client/components/entities/cards/DriverChips';
import { EvidenceCard } from './EvidenceCard';
import { getRiskClass, isVisualMediaItem } from '@client/utils/evidenceUtils';
import { EntityPhoto } from '../EvidenceModal';
import { SignalMetrics, DriverChip } from '@client/utils/forensics';
import s from './EvidenceOverviewTab.module.css';

import { Button } from '@client/design-system/lib';

interface EvidenceEntity {
  id?: string | number;
  fullName?: string;
  mentions?: number;
  redFlagRating?: number;
  photos?: EntityPhoto[];
  blackBookEntries?: Array<{
    id: number;
    phoneNumbers?: string[];
    notes?: string;
  }>;
  bio?: string;
  description?: string;
}

interface ForensicData {
  ladder: { level?: string; description?: string };
  drivers: DriverChip[];
  signals: SignalMetrics;
}

interface SignificantPassage {
  documentId?: string | number;
  filename?: string;
  passage?: string;
  source?: string;
  keyword?: string;
}

interface EvidenceOverviewTabProps {
  entity: EvidenceEntity | null;
  loading: boolean;
  forensicData: ForensicData | null;
  totalDocs: number;
  mediaItems: EntityPhoto[];
  overviewEvidenceTypesCount: number;
  overviewSignificantPassages: SignificantPassage[];
  openDocumentFromEvidence: (
    id: string | number | undefined,
    options?: { newTab?: boolean },
  ) => void;
  navigateFromModal: (path: string) => void;
  blackBookSectionRef: React.Ref<HTMLDivElement>;
}

export const EvidenceOverviewTab: React.FC<EvidenceOverviewTabProps> = ({
  entity,
  loading,
  forensicData,
  totalDocs,
  mediaItems,
  overviewEvidenceTypesCount,
  overviewSignificantPassages,
  openDocumentFromEvidence,
  navigateFromModal,
  blackBookSectionRef,
}) => {
  if (loading) {
    return (
      <div className={s.loadingContainer}>
        <div className={s.loadingGrid}>
          <Skeleton className={s.skeletonHero} />
          <Skeleton className={s.skeletonHero} />
        </div>
        <div className={s.loadingStack}>
          <Skeleton className={s.skeletonLabel} />
          <Skeleton className={s.skeletonCard} />
          <Skeleton className={s.skeletonCard} />
        </div>
      </div>
    );
  }

  if (!entity || !forensicData) return null;

  return (
    <div className={s.container}>
      {/* METRICS & SIGNAL PANEL */}
      <div className={s.forensicGrid}>
        <div className={s.metricsCard}>
          <div className={s.metricsBadges}>
            <span className={`${s.riskBadge} ${s[getRiskClass(entity.redFlagRating || 0)]}`}>
              <Icon name="ShieldAlert" size="xs" className={s.badgeIcon} />
              Risk {(entity.redFlagRating || 0).toFixed(0)}/5
            </span>
            <span
              className={`${s.evidenceBadge} ${s[`evidence-${forensicData.ladder.level?.toLowerCase()}`]}`}
            >
              <Icon name="Sparkles" size="xs" className={s.badgeIcon} />
              {forensicData.ladder.level === 'L1'
                ? 'Direct Evidence'
                : forensicData.ladder.level === 'L2'
                  ? 'Inferred Evidence'
                  : forensicData.ladder.level === 'L3'
                    ? 'Agentic Evidence'
                    : 'Evidence Unspecified'}
            </span>
            <span className={s.provenanceBadge}>
              <Icon name="ShieldCheck" size="xs" className={s.badgeIcon} />
              EXO-PROVENANCE v2
            </span>
          </div>

          <div className={s.metricsGrid}>
            <div className={s.metricItem}>
              <div className={`${s.metricValue} ${s.accent}`}>{entity.mentions}</div>
              <div className={s.metricLabel}>Mentions</div>
            </div>
            <div className={s.metricItem}>
              <div className={`${s.metricValue} ${s.accentEmails}`}>
                {totalDocs > 0 ? totalDocs : entity.mentions}
              </div>
              <div className={s.metricLabel}>Documents</div>
            </div>
            <div className={s.metricItem}>
              <div className={`${s.metricValue} ${s.accent}`}>
                {mediaItems.length || entity.photos?.length || 0}
              </div>
              <div className={s.metricLabel}>Media</div>
            </div>
            <div className={s.metricItem}>
              <div className={`${s.metricValue} ${s.accentEvidence}`}>
                {overviewEvidenceTypesCount}
              </div>
              <div className={s.metricLabel}>Source Types</div>
            </div>
          </div>

          <div className={s.driversSection}>
            <h4 className={s.sectionHeader}>
              <Icon name="Activity" size="xs" className={s.headerIcon} /> Key Drivers
            </h4>
            <DriverChips chips={forensicData.drivers} />
          </div>
        </div>

        <div className={s.signalsCard}>
          <h4 className={s.sectionHeaderWithMeta}>
            <span>Forensic Signals</span>
            <span className={s.headerMeta}>EXO-METRICS v2</span>
          </h4>
          <SignalPanel metrics={forensicData.signals} />

          <div className={s.analysisNote}>
            <div className={s.analysisLabel}>Analysis</div>
            <div className={s.analysisText}>{forensicData.ladder.description}</div>
          </div>
        </div>
      </div>

      {/* VERIFIED MEDIA PREVIEW */}
      {mediaItems.length > 0 && (
        <div className={s.mediaSection}>
          <h3 className={s.tabTitle}>
            <Icon name="Image" size="sm" className={s.mediaIcon} /> Verified Media
          </h3>
          <div className={s.mediaGrid}>
            {mediaItems
              .filter((m) => isVisualMediaItem(m))
              .slice(0, 4)
              .map((item, idx) => {
                const previewSrc = item.thumbnailUrl || item.url || item.fullUrl;
                const type = item.fileType || item.sourceType || 'image';
                const isVideo = type.toLowerCase().includes('video');

                return (
                  <div key={idx} className={s.mediaCard} onClick={() => navigateFromModal('media')}>
                    {previewSrc ? (
                      <div className={s.mediaThumbWrapper}>
                        <img
                          src={previewSrc}
                          alt={item.title || 'Media'}
                          className={s.mediaThumb}
                        />
                        {isVideo && (
                          <div className={s.videoOverlay}>
                            <Icon name="Play" size="sm" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={s.mediaPlaceholder}>
                        {isVideo ? (
                          <Icon name="Video" size="md" />
                        ) : (
                          <Icon name="Image" size="md" />
                        )}
                      </div>
                    )}
                    <div className={s.mediaMeta}>
                      <span className={s.mediaTitle}>{item.title || 'Verified Media'}</span>
                    </div>
                  </div>
                );
              })}
            {mediaItems.length > 4 && (
              <button className={s.moreMediaButton} onClick={() => navigateFromModal('media')}>
                +{mediaItems.length - 4} More
              </button>
            )}
          </div>
        </div>
      )}

      {/* HIGH SIGNIFICANCE EVIDENCE */}
      <div className={s.evidenceSection}>
        <h3 className={s.tabTitle}>
          <Icon name="AlertTriangle" size="sm" className={s.criticalIcon} /> High Significance
          Evidence
        </h3>
        {overviewSignificantPassages.length > 0 ? (
          <div className={s.evidenceGrid}>
            {overviewSignificantPassages.map((passage, idx) => (
              <EvidenceCard
                key={idx}
                document={{
                  id: passage.documentId,
                  title: passage.filename,
                  contentPreview: passage.passage,
                  evidenceType: passage.source,
                  keyword: passage.keyword,
                }}
                entityName={entity.fullName}
                onOpen={openDocumentFromEvidence}
              />
            ))}
          </div>
        ) : (
          <div className={s.emptyEvidence}>
            <p>No high-significance evidence passages currently extracted for this entity.</p>
            <p className={s.emptySubtext}>
              Full document mentions are available in the Documents tab.
            </p>
          </div>
        )}
      </div>

      {/* BLACK BOOK ENTRY */}
      {entity.blackBookEntries && entity.blackBookEntries.length > 0 && (
        <div ref={blackBookSectionRef} className={s.blackbookCard}>
          <div className={s.blackbookHeader}>
            <h3 className={s.blackbookTitle}>
              <Icon name="BookOpen" size="sm" className={s.investigateIcon} /> Black Book Entry
            </h3>
            <Button
              unstyled
              onClick={() =>
                navigateFromModal(`/blackbook?search=${encodeURIComponent(entity.fullName || '')}`)
              }
              className={s.viewFullLink}
            >
              View in Black Book <Icon name="ExternalLink" size="xs" />
            </Button>
          </div>

          <div className={s.blackbookContent}>
            {entity.blackBookEntries.map((entry, idx: number) => (
              <div key={idx} className={s.entryGroup}>
                {entry.phoneNumbers && entry.phoneNumbers.length > 0 && (
                  <div className={s.phoneList}>
                    {entry.phoneNumbers.map((phone: string, i: number) => (
                      <span key={i} className={s.phoneChip}>
                        <Icon name="Phone" className={s.phoneIcon} /> {phone}
                      </span>
                    ))}
                  </div>
                )}

                {entry.notes && <p className={s.entryNotes}>{entry.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BIO */}
      <div className={s.bioSection}>
        <h3 className={s.bioHeader}>Biography</h3>
        <p className={s.bioText}>
          {entity.bio || entity.description || 'No biographical data available.'}
        </p>
      </div>
    </div>
  );
};
