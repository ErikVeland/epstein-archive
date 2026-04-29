import React, { useState } from 'react';
import Icon from '@client/components/common/Icon';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Grid } from '@client/design-system/components/layout/Grid';
import { LqText } from '@client/design-system/components/typography/Text';
import styles from './EntityMediaGallery.module.css';

interface MediaItem {
  id: string;
  filePath: string;
  fileType?: string;
  thumbnailPath?: string;
  title?: string;
  type?: 'image' | 'video' | 'audio';
  redFlagRating?: number;
}

interface EntityMediaGalleryProps {
  media: MediaItem[];
  entityName: string;
  loading?: boolean;
}

export const EntityMediaGallery: React.FC<EntityMediaGalleryProps> = ({
  media,
  entityName,
  loading,
}) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  useScrollLock(!!selectedMedia);

  if (loading) {
    return (
      <Grid cols={{ base: 2, sm: 3, md: 4 }} gap={12} className={styles.loadingGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Surface key={i} variant="glass" className={styles.loadingTile} />
        ))}
      </Grid>
    );
  }

  if (!media || media.length === 0) {
    return (
      <Surface variant="glass" className={styles.emptyState}>
        <Icon name="Image" className={styles.emptyStateIcon} />
        <LqText variant="small" color="muted">
          No media assets found for {entityName}
        </LqText>
      </Surface>
    );
  }

  const getMediaType = (item: MediaItem): 'image' | 'video' | 'audio' | 'other' => {
    const signature =
      `${item.type || ''} ${item.fileType || ''} ${item.filePath || ''}`.toLowerCase();
    if (signature.includes('video') || /\.(mp4|webm|mov|m4v|mkv|avi)($|\?)/i.test(signature)) {
      return 'video';
    }
    if (
      signature.includes('audio') ||
      signature.includes('recording') ||
      /\.(mp3|wav|m4a|aac|ogg|flac)($|\?)/i.test(signature)
    ) {
      return 'audio';
    }
    if (signature.includes('image') || /\.(png|jpe?g|webp|gif|bmp|tiff?)($|\?)/i.test(signature)) {
      return 'image';
    }
    return 'other';
  };

  const getMediaUrl = (item: MediaItem) => {
    const type = getMediaType(item);
    if (type === 'image')
      return `/api/media/images/${encodeURIComponent(String(item.id))}/thumbnail`;
    if (type === 'video' && item.thumbnailPath) {
      return `/api/media/images/${encodeURIComponent(String(item.id))}/thumbnail`;
    }
    return null;
  };

  const getFullSizeUrl = (item: MediaItem) => {
    const type = getMediaType(item);
    if (type === 'video') return `/api/media/video/${encodeURIComponent(String(item.id))}/stream`;
    if (type === 'audio') return `/api/media/audio/${encodeURIComponent(String(item.id))}/stream`;
    return `/api/media/images/${encodeURIComponent(String(item.id))}/file`;
  };

  return (
    <Box className={styles.gallery}>
      <Grid cols={{ base: 2, sm: 3, md: 4 }} gap={12}>
        {media.map((item) => {
          const type = getMediaType(item);
          const previewUrl = getMediaUrl(item);
          return (
            <Surface
              key={item.id}
              variant="glass"
              onClick={() => setSelectedMedia(item)}
              className={styles.mediaTile}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={item.title || entityName}
                  className={styles.mediaImage}
                  loading="lazy"
                />
              ) : (
                <Flex align="center" justify="center" className={styles.mediaPlaceholder}>
                  {type === 'video' ? (
                    <Icon name="Play" />
                  ) : type === 'audio' ? (
                    <Icon name="Music" />
                  ) : (
                    <Icon name="FileText" />
                  )}
                </Flex>
              )}
              <Flex align="center" justify="center" className={styles.mediaOverlay}>
                <Icon name="ZoomIn" className={styles.zoomIcon} />
              </Flex>

              {type !== 'image' && (
                <Box className={styles.videoBadge}>
                  {type === 'audio' ? (
                    <Icon name="Music" className={styles.videoIcon} />
                  ) : (
                    <Icon name="Play" className={styles.videoIcon} />
                  )}
                </Box>
              )}

              {item.title && (
                <Box className={styles.caption}>
                  <LqText variant="xs" weight="medium" className={styles.captionText}>
                    {item.title}
                  </LqText>
                </Box>
              )}
            </Surface>
          );
        })}
      </Grid>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <Box className={styles.lightboxBackdrop} onClick={() => setSelectedMedia(null)}>
          <Box className={styles.lightboxShell}>
            {/* Close Button */}
            <CloseButton
              onClick={() => setSelectedMedia(null)}
              size="md"
              label="Close media lightbox"
              className={styles.closeButton}
            />

            {/* Main Image */}
            <Surface
              variant="glass"
              className={styles.lightboxMediaFrame}
              onClick={(e) => e.stopPropagation()}
            >
              {getMediaType(selectedMedia) === 'video' ? (
                <video
                  src={getFullSizeUrl(selectedMedia)}
                  className={styles.lightboxImage}
                  controls
                />
              ) : getMediaType(selectedMedia) === 'audio' ? (
                <audio
                  src={getFullSizeUrl(selectedMedia)}
                  className={styles.lightboxAudio}
                  controls
                />
              ) : (
                <img
                  src={getFullSizeUrl(selectedMedia)}
                  alt={selectedMedia.title || entityName}
                  className={styles.lightboxImage}
                />
              )}
            </Surface>

            {/* Caption */}
            <Box
              className={styles.lightboxCaption}
              role="presentation"
              onClick={(e) => e.stopPropagation()}
            >
              <LqText variant="h3" weight="medium" color="primary">
                {selectedMedia.title || entityName}
              </LqText>
              {selectedMedia.redFlagRating && selectedMedia.redFlagRating > 0 && (
                <Flex align="center" gap={1} className={styles.redFlagBadge}>
                  <LqText variant="xs" color="danger">
                    Red Flag Rating: {selectedMedia.redFlagRating}
                  </LqText>
                </Flex>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};
