import React from 'react';
import Icon from '../common/Icon';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';

interface MobileAlbumDropdownProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalItemCount: number;
  /** Label for "All" option (e.g., "All Audio", "All Videos", "All Photos") */
  allLabel: string;
  /** Current album name to display in the dropdown button */
  currentAlbumName?: string;
}

/**
 * Mobile-friendly album dropdown component used across Audio, Video, and Photo browsers.
 * Only visible on mobile screens (hidden on md: and larger).
 */
export function MobileAlbumDropdown({
  albums,
  selectedAlbum,
  onSelectAlbum,
  isOpen,
  onToggle,
  totalItemCount,
  allLabel,
  currentAlbumName,
}: MobileAlbumDropdownProps): React.ReactElement {
  const handleSelect = (albumId: number | null): void => {
    onSelectAlbum(albumId);
    onToggle();
  };

  const displayName = currentAlbumName || allLabel;

  return (
    <div className="md:hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] text-sm h-8"
      >
        <span className="flex items-center gap-[var(--space-2)]">
          <Icon name="Folder" size="sm" />
          {displayName}
        </span>
        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size="sm" />
      </button>
      {isOpen && (
        <div className="absolute left-[var(--space-3)] right-[var(--space-3)] mt-[var(--space-1)] dropdown-surface z-30 max-h-60 overflow-y-auto">
          <button
            className={`w-full px-[var(--space-4)] py-[var(--space-3)] text-left text-sm flex items-center justify-between ${
              selectedAlbum === null
                ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
            }`}
            onClick={() => handleSelect(null)}
          >
            <span>{allLabel}</span>
            <span className="text-xs opacity-70">{totalItemCount}</span>
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              className={`w-full px-[var(--space-4)] py-[var(--space-3)] text-left text-sm flex items-center justify-between border-t border-[var(--glass-border)] ${
                selectedAlbum === album.id
                  ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
              }`}
              onClick={() => handleSelect(album.id)}
            >
              <span className="truncate">{album.name}</span>
              <span className="text-xs opacity-70">{album.itemCount || 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileAlbumDropdown;
