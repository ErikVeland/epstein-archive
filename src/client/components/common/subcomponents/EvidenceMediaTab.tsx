import React from 'react';
import {
  Search,
  FileText,
  ShieldAlert,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import {
  formatMetaDate,
  isVisualMediaItem,
  getRiskClass,
  naturalSortMedia,
} from '../../../utils/evidenceUtils';
import { cn } from '../../../utils/cn';
import { EntityPhoto } from '../EvidenceModal';
import s from './EvidenceMediaTab.module.css';

interface EvidenceEntity {
  photos?: EntityPhoto[];
}

interface EvidenceMediaTabProps {
  entity: EvidenceEntity | null;
  mediaItems: EntityPhoto[];
  isMediaLoading: boolean;
  brokenMediaIds: Record<string, boolean>;
  setBrokenMediaIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const EvidenceMediaTab: React.FC<EvidenceMediaTabProps> = ({
  entity,
  mediaItems,
  isMediaLoading,
  brokenMediaIds,
  setBrokenMediaIds,
}) => {
  const displayItems = React.useMemo(() => {
    const items = mediaItems.length > 0 ? mediaItems : entity?.photos || [];
    return naturalSortMedia(items);
  }, [mediaItems, entity?.photos]);

  return (
    <div className={s.container} data-testid="entity-modal-tab-media">
      {isMediaLoading ? (
        <div className={s.loadingState}>
          <Search size={48} className={s.loadingIcon} />
          <p>Loading linked media…</p>
        </div>
      ) : displayItems.length > 0 ? (
        <div className={s.grid}>
          {displayItems.map((photo: EntityPhoto, i: number) => {
            const title = photo.title || photo.caption || photo.filename || `Media item ${i + 1}`;
            const sourceType = photo.sourceType || photo.type || 'Media';
            const date = formatMetaDate(photo.date || photo.createdAt || photo.timestamp);
            const taggedPeople = Array.isArray(photo.taggedPeople)
              ? photo.taggedPeople
              : Array.isArray(photo.people)
                ? photo.people
                : Array.isArray(photo.entities)
                  ? photo.entities
                  : [];
            const riskRating = Number(photo.riskRating || photo.redFlagRating || 0);
            const hasDirectSignal = Boolean(photo.directEvidence || photo.verified);
            const id = String(photo.id || i);

            return (
              <article key={i} className={s.card}>
                <div className={s.mediaWrapper}>
                  {/* Background Blur Layer (Liquid Glass aesthetic) */}
                  {photo.metadata?.isSensitive && (
                    <div className={s.blurLayer}>
                      <img
                        src={photo.url || photo.thumbnailUrl || photo.fullUrl}
                        alt=""
                        className={s.blurImage}
                      />
                    </div>
                  )}

                  {brokenMediaIds[id] || !isVisualMediaItem(photo) ? (
                    <div className={s.mediaPlaceholder}>
                      <div className={s.placeholderContent}>
                        <FileText size={28} />
                        <span className={s.sourceLabel}>{sourceType}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={s.imageContainer}>
                      <img
                        src={photo.url || photo.thumbnailUrl || photo.fullUrl}
                        alt={title}
                        className={cn(s.image, photo.metadata?.isSensitive && s.imageBlurred)}
                        onError={(event) => {
                          const fallbackUrl =
                            photo.fullUrl || photo.filePath || `/api/media/images/${id}/file`;
                          const img = event.currentTarget;
                          if (img.dataset.fallbackApplied !== '1') {
                            img.dataset.fallbackApplied = '1';
                            img.src = fallbackUrl;
                            return;
                          }
                          setBrokenMediaIds((prev) => ({ ...prev, [id]: true }));
                        }}
                      />

                      {/* Sensitive Content Overlay */}
                      {photo.metadata?.isSensitive && (
                        <div className={s.sensitiveOverlay}>
                          <div className={s.sensitiveIndicator}>
                            <div className={s.sensitiveIconBadge}>
                              <ShieldAlert size={24} />
                            </div>
                            <div className={s.sensitiveTextGroup}>
                              <span className={s.sensitiveTitle}>Sensitive Content</span>
                              <span className={s.sensitiveAction}>Click to reveal</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className={s.cardBody}>
                  <div className={s.cardHeader}>
                    <h4 className={s.title}>{title}</h4>
                    <div className={s.badges}>
                      {riskRating > 0 && (
                        <span className={`${s.riskBadge} ${s[getRiskClass(riskRating)]}`}>
                          <ShieldAlert size={12} className={s.badgeIcon} />
                          {riskRating.toFixed(0)}/5
                        </span>
                      )}
                      {hasDirectSignal && (
                        <span className={s.directBadge}>
                          <Sparkles size={12} className={s.badgeIcon} />
                          Direct
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={s.metaRow}>
                    <span className={s.metaItem}>
                      <Calendar size={12} />
                      {date}
                    </span>
                    <span className={s.metaItem}>
                      <ImageIcon size={12} />
                      {sourceType}
                    </span>
                  </div>

                  {taggedPeople.length > 0 && (
                    <div className={s.tagsRow}>
                      <span className={s.tagsLabel}>Tagged:</span>{' '}
                      {taggedPeople.slice(0, 3).join(', ')}
                      {taggedPeople.length > 3 ? ` +${taggedPeople.length - 3}` : ''}
                    </div>
                  )}

                  <div className={s.cardFooter}>
                    <button
                      onClick={() =>
                        window.open(
                          photo.fullUrl || photo.url || `/api/media/images/${photo.id}/file`,
                          '_blank',
                        )
                      }
                      className={s.openBtn}
                      aria-label={`Open media item ${title}`}
                      title="Open media in new tab"
                    >
                      View <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={s.emptyState}>
          <Search size={48} className={s.emptyIcon} />
          <p>No media files found for this entity.</p>
        </div>
      )}
    </div>
  );
};
