import React, { useState } from 'react';
import { ZoomIn, Play } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import Icon from '../common/Icon';
import { useScrollLock } from '../../hooks/useScrollLock';

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="aspect-square bg-[var(--glass-bg)] rounded-[var(--radius-lg)] border border-[var(--glass-border)]"
          />
        ))}
      </div>
    );
  }

  if (!media || media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] bg-[var(--glass-bg-strong)] rounded-[var(--radius-xl)] border border-[var(--glass-border)] border-dashed">
        <Icon name="Image" size="xl" className="mb-3 opacity-50" />
        <p className="text-sm">No media assets found for {entityName}</p>
      </div>
    );
  }

  const getMediaUrl = (item: MediaItem) => {
    // Assuming API structure based on previous files
    return `/api/media/images/${item.id}/thumbnail`;
  };

  const getFullSizeUrl = (item: MediaItem) => {
    return `/api/media/images/${item.id}`; // Adjust if there's a specific 'full' route, usually just serving the file
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {media.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="group relative aspect-square bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)] hover:border-[var(--accent)]/50 cursor-pointer transition-all hover:shadow-[var(--glass-shadow)] hover:shadow-[var(--accent)]/10"
          >
            <img
              src={getMediaUrl(item)}
              alt={item.title || entityName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-[var(--glass-bg-strong)] group-hover:bg-[var(--glass-bg-strong)] transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="text-[var(--text-primary)] w-6 h-6 drop-shadow-[var(--glass-shadow)] transform scale-75 group-hover:scale-100 transition-transform" />
            </div>

            {/* Type Indicator if needed (e.g. video) */}
            {item.type === 'video' && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--glass-bg-strong)] rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-3 h-3 text-[var(--text-primary)] ml-0.5" />
              </div>
            )}

            {/* Caption gradient */}
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pt-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-xs text-[var(--text-primary)] truncate font-medium">
                  {item.title}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[10000] bg-[var(--glass-bg-strong)] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            {/* Close Button */}
            <CloseButton
              onClick={() => setSelectedMedia(null)}
              size="md"
              label="Close media lightbox"
              className="absolute -top-12 right-0 bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />

            {/* Main Image */}
            <div
              className="relative rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--glass-shadow)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)]"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            >
              <img
                src={getFullSizeUrl(selectedMedia)}
                alt={selectedMedia.title || entityName}
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>

            {/* Caption — role=presentation stops clicks bubbling to the overlay close handler */}
            <div
              className="mt-4 text-center"
              role="presentation"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-[var(--text-primary)]">
                {selectedMedia.title || entityName}
              </h3>
              {selectedMedia.redFlagRating && selectedMedia.redFlagRating > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--accent-danger)]/30 bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] text-xs shadow-[var(--glass-shadow-soft)]">
                  <span>Red Flag Rating: {selectedMedia.redFlagRating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
