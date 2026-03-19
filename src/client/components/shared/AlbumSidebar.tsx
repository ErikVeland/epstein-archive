import React from 'react';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';

interface AlbumSidebarProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  totalItemCount: number;
  /** Label for "All" option (e.g., "All Audio", "All Videos", "All Photos") */
  allLabel: string;
}

/**
 * Shared album sidebar component used across Audio, Video, and Photo browsers.
 * Displays a list of albums with selection state and item counts.
 */
export function AlbumSidebar({
  albums,
  selectedAlbum,
  onSelectAlbum,
  totalItemCount,
  allLabel,
}: AlbumSidebarProps): React.ReactElement {
  const getButtonClasses = (isSelected: boolean): string => {
    const base =
      'w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors border-l-2';

    if (isSelected) {
      return `${base} bg-cyan-900/20 text-[var(--accent)] border-[var(--accent)]`;
    }
    return `${base} text-[var(--text-muted)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)] border-transparent`;
  };

  return (
    <aside className="hidden md:flex w-60 bg-[var(--glass-bg-strong)] border-r border-[var(--glass-border)] flex-col shrink-0">
      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3">
        Albums
      </h3>
      <div className="flex-1 overflow-y-auto">
        <button
          className={getButtonClasses(selectedAlbum === null)}
          onClick={() => onSelectAlbum(null)}
        >
          <span className="truncate">{allLabel}</span>
          <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
            {totalItemCount}
          </span>
        </button>
        {albums.map((album) => (
          <button
            key={album.id}
            className={getButtonClasses(selectedAlbum === album.id)}
            onClick={() => onSelectAlbum(album.id)}
            title={album.name}
          >
            <span className="truncate">{album.name}</span>
            <span className="text-xs opacity-70 bg-[var(--glass-bg)] px-1.5 py-0.5 rounded-full">
              {album.itemCount || 0}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default AlbumSidebar;
