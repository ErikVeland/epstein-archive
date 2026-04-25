import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  FileText,
  ShieldAlert,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Play,
  Music,
  Maximize2,
  X,
  Loader2,
} from 'lucide-react';
import {
  formatMetaDate,
  isVisualMediaItem,
  getRiskClass,
  naturalSortMedia,
} from '../../../utils/evidenceUtils';
import { cn } from '../../../utils/cn';
import { EntityPhoto } from '../EvidenceModal';
import { AudioPlayer } from '../../media/AudioPlayer';
import { VideoPlayer } from '../../media/VideoPlayer';
import s from './EvidenceMediaTab.module.css';

import { Button } from '../../../design-system/lib';

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

type MediaCategory = 'all' | 'photos' | 'videos' | 'audio';

export const EvidenceMediaTab: React.FC<EvidenceMediaTabProps> = ({
  entity,
  mediaItems,
  isMediaLoading,
  brokenMediaIds,
  setBrokenMediaIds,
}) => {
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  const getMediaType = (item: EntityPhoto): MediaCategory => {
    const type = String(item.sourceType || item.type || item.fileType || '').toLowerCase();
    const url = String(item.fullUrl || item.url || item.filePath || '').toLowerCase();
    const fileName = String(item.filename || '').toLowerCase();

    const isVideo =
      type.includes('video') ||
      url.match(/\.(mp4|webm|mov|mkv|avi)$/) ||
      fileName.match(/\.(mp4|webm|mov|mkv|avi)$/);
    if (isVideo) return 'videos';

    const isAudio =
      type.includes('audio') ||
      type.includes('recording') ||
      url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/) ||
      fileName.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/);
    if (isAudio) return 'audio';

    if (isVisualMediaItem(item) || type.includes('photo') || type.includes('image'))
      return 'photos';
    return 'all';
  };

  const allItems = React.useMemo(() => {
    return mediaItems.length > 0 ? mediaItems : entity?.photos || [];
  }, [mediaItems, entity?.photos]);

  const displayItems = React.useMemo(() => {
    const sorted = naturalSortMedia(allItems);
    if (activeCategory === 'all') return sorted;
    return sorted.filter((item) => getMediaType(item) === activeCategory);
  }, [allItems, activeCategory]);

  const selectedItem = React.useMemo(() => {
    if (selectedItemId === null) return null;
    return allItems.find((item) => String(item.id) === String(selectedItemId)) || null;
  }, [allItems, selectedItemId]);

  const selectedCategory = selectedItem ? getMediaType(selectedItem) : null;

  const { data: enrichedItem, isLoading: isEnriching } = useQuery({
    queryKey: ['media-enrichment', selectedItemId, selectedCategory],
    queryFn: async () => {
      if (!selectedItem || (selectedCategory !== 'audio' && selectedCategory !== 'videos'))
        return null;
      const endpoint = selectedCategory === 'audio' ? 'audio' : 'video';
      const res = await fetch(`/api/media/${endpoint}/${selectedItem.id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return {
        ...data,
        metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
      };
    },
    enabled: !!selectedItemId && (selectedCategory === 'audio' || selectedCategory === 'videos'),
  });

  const finalSelectedItem = enrichedItem || selectedItem;

  const categories: { id: MediaCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Media', icon: <Search size={14} /> },
    { id: 'photos', label: 'Photos', icon: <ImageIcon size={14} /> },
    { id: 'videos', label: 'Videos', icon: <Play size={14} /> },
    { id: 'audio', label: 'Audio', icon: <Music size={14} /> },
  ];

  return (
    <div className={s.container} data-testid="entity-modal-tab-media">
      {/* Sub-Tabs */}
      <div className={s.subNavBar}>
        {categories.map((cat) => (
          <Button
            unstyled
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(s.subTab, activeCategory === cat.id && s.subTabActive)}
          >
            {cat.icon}
            {cat.label}
          </Button>
        ))}
      </div>

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
            const category = getMediaType(photo);
            const previewSrc = photo.thumbnailUrl || photo.url || photo.fullUrl;
            const canRenderImagePreview =
              category === 'photos' || (category === 'videos' && Boolean(photo.thumbnailUrl));

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

                  {brokenMediaIds[id] || !canRenderImagePreview ? (
                    <div className={s.mediaPlaceholder}>
                      <div className={s.placeholderContent}>
                        {category === 'audio' ? (
                          <Music size={32} />
                        ) : category === 'videos' ? (
                          <Play size={32} />
                        ) : (
                          <FileText size={28} />
                        )}
                        <span className={s.sourceLabel}>{sourceType}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={s.imageContainer}>
                      <img
                        src={previewSrc}
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

                      {/* Category Icon Badge */}
                      <div className={s.categoryBadge}>
                        {category === 'videos' ? (
                          <Play size={10} fill="currentColor" />
                        ) : (
                          <ImageIcon size={10} />
                        )}
                      </div>
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
                      {category === 'audio' ? (
                        <Music size={12} />
                      ) : category === 'videos' ? (
                        <Play size={12} />
                      ) : (
                        <ImageIcon size={12} />
                      )}
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
                    <Button
                      unstyled
                      onClick={() => setSelectedItemId(photo.id || id)}
                      className={s.openBtn}
                      aria-label={`Open media item ${title}`}
                    >
                      {category === 'photos' ? 'Inspect' : 'Play'} <Maximize2 size={12} />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={s.emptyState}>
          <Search size={48} className={s.emptyIcon} />
          <p>No {activeCategory === 'all' ? 'media' : activeCategory} found for this entity.</p>
        </div>
      )}

      {/* Integrated Player Overlay */}
      {selectedItemId && finalSelectedItem && (
        <div className={s.playerOverlay}>
          <div className={s.playerBackdrop} onClick={() => setSelectedItemId(null)} />
          <div className={s.playerContent}>
            {isEnriching ? (
              <div className={s.playerLoader}>
                <Loader2 size={48} className={s.spin} />
                <p>Initializing Forensic Stream…</p>
              </div>
            ) : selectedCategory === 'audio' ? (
              <AudioPlayer
                src={
                  finalSelectedItem.fullUrl ||
                  finalSelectedItem.url ||
                  `/api/media/audio/${finalSelectedItem.id}/stream`
                }
                title={finalSelectedItem.title || finalSelectedItem.filename || 'Audio Recording'}
                transcript={finalSelectedItem.metadata?.transcript}
                chapters={finalSelectedItem.metadata?.chapters}
                isSensitive={finalSelectedItem.metadata?.isSensitive}
                onClose={() => setSelectedItemId(null)}
                autoPlay
              />
            ) : selectedCategory === 'videos' ? (
              <VideoPlayer
                src={
                  finalSelectedItem.fullUrl ||
                  finalSelectedItem.url ||
                  `/api/media/video/${finalSelectedItem.id}/stream`
                }
                title={finalSelectedItem.title || finalSelectedItem.filename || 'Video Evidence'}
                transcript={finalSelectedItem.metadata?.transcript}
                chapters={finalSelectedItem.metadata?.chapters}
                isSensitive={finalSelectedItem.metadata?.isSensitive}
                onClose={() => setSelectedItemId(null)}
                autoPlay
              />
            ) : (
              <div className={s.imageViewer}>
                <div className={s.imageViewerHeader}>
                  <h3 className={s.imageViewerTitle}>
                    {finalSelectedItem.title || finalSelectedItem.filename}
                  </h3>
                  <Button
                    unstyled
                    className={s.closeViewer}
                    onClick={() => setSelectedItemId(null)}
                  >
                    <X size={20} />
                  </Button>
                </div>
                <div className={s.imageViewerMain}>
                  <img
                    src={
                      finalSelectedItem.fullUrl ||
                      finalSelectedItem.url ||
                      `/api/media/images/${finalSelectedItem.id}/file`
                    }
                    alt={finalSelectedItem.title}
                    className={s.fullImage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
