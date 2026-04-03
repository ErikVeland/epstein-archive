import React, { useState } from 'react';
import { ZoomIn, Play, Image as ImageIcon } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { Grid } from '../../design-system/components/layout/Grid';
import { LqText } from '../../design-system/components/typography/Text';

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
      <Grid cols={{ base: 2, sm: 3, md: 4 }} gap={12} className="animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Surface key={i} variant="glass" className="aspect-square rounded-[var(--radius-lg)]" />
        ))}
      </Grid>
    );
  }

  if (!media || media.length === 0) {
    return (
      <Surface
        variant="glass"
        className="flex flex-col items-center justify-center py-12 border-dashed"
      >
        <ImageIcon className="mb-3 opacity-50 w-12 h-12 text-[var(--text-muted)]" />
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
    <Box className="space-y-4">
      <Grid cols={{ base: 2, sm: 3, md: 4 }} gap={12}>
        {media.map((item) => (
          <Surface
            key={item.id}
            variant="glass"
            onClick={() => setSelectedMedia(item)}
            className="group relative aspect-square overflow-hidden cursor-pointer transition-all hover:shadow-[var(--glass-shadow)] hover:shadow-[var(--accent)]/10 hover:border-[var(--accent)]/50"
          >
            <img
              src={getMediaUrl(item)}
              alt={item.title || entityName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {/* Overlay */}
            <Flex
              align="center"
              justify="center"
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ZoomIn className="text-white w-6 h-6 transform scale-75 group-hover:scale-100 transition-transform" />
            </Flex>

            {/* Type Indicator */}
            {item.type === 'video' && (
              <Box className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-3 h-3 text-white ml-0.5" />
              </Box>
            )}

            {/* Caption gradient */}
            {item.title && (
              <Box className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pt-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <LqText variant="xs" weight="medium" className="text-white truncate">
                  {item.title}
                </LqText>
              </Box>
            )}
          </Surface>
        ))}
      </Grid>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <Box
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <Box className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            {/* Close Button */}
            <CloseButton
              onClick={() => setSelectedMedia(null)}
              size="md"
              label="Close media lightbox"
              className="absolute -top-12 right-0 bg-transparent border-white/20 text-white/60 hover:text-white"
            />

            {/* Main Image */}
            <Surface
              variant="glass"
              className="relative overflow-hidden border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={getFullSizeUrl(selectedMedia)}
                alt={selectedMedia.title || entityName}
                className="max-h-[80vh] w-auto object-contain"
              />
            </Surface>

            {/* Caption */}
            <Box
              className="mt-4 text-center"
              role="presentation"
              onClick={(e) => e.stopPropagation()}
            >
              <LqText variant="h3" weight="medium" color="primary">
                {selectedMedia.title || entityName}
              </LqText>
              {selectedMedia.redFlagRating && selectedMedia.redFlagRating > 0 && (
                <Flex
                  align="center"
                  gap={1}
                  className="mt-2 px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 shadow-[var(--glass-shadow-soft)]"
                >
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
