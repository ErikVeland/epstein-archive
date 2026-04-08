import React, { useState } from 'react';
import { ZoomIn, Play, Image as ImageIcon } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { Grid } from '../../design-system/components/layout/Grid';
import { LqText } from '../../design-system/components/typography/Text';
import styles from './EntityMediaGallery.module.css';

interface MediaItem {
  id: string;
  filePath: string;
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
        <ImageIcon className={styles.emptyStateIcon} />
        <LqText variant="small" color="muted">
          No media assets found for {entityName}
        </LqText>
      </Surface>
    );
  }

  const getMediaUrl = (item: MediaItem) => {
    return `/api/media/images/${item.id}/thumbnail`;
  };

  const getFullSizeUrl = (item: MediaItem) => {
    return `/api/media/images/${item.id}`;
  };

  return (
    <Box className={styles.gallery}>
      <Grid cols={{ base: 2, sm: 3, md: 4 }} gap={12}>
        {media.map((item) => (
          <Surface
            key={item.id}
            variant="glass"
            onClick={() => setSelectedMedia(item)}
            className={styles.mediaTile}
          >
            <img
              src={getMediaUrl(item)}
              alt={item.title || entityName}
              className={styles.mediaImage}
              loading="lazy"
            />
            {/* Overlay */}
            <Flex align="center" justify="center" className={styles.mediaOverlay}>
              <ZoomIn className={styles.zoomIcon} />
            </Flex>

            {/* Type Indicator */}
            {item.type === 'video' && (
              <Box className={styles.videoBadge}>
                <Play className={styles.videoIcon} />
              </Box>
            )}

            {/* Caption gradient */}
            {item.title && (
              <Box className={styles.caption}>
                <LqText variant="xs" weight="medium" className={styles.captionText}>
                  {item.title}
                </LqText>
              </Box>
            )}
          </Surface>
        ))}
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
              <img
                src={getFullSizeUrl(selectedMedia)}
                alt={selectedMedia.title || entityName}
                className={styles.lightboxImage}
              />
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
