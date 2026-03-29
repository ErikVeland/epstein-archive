import React from 'react';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';
import s from './AlbumSidebar.module.css';

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
  return (
    <aside className={s.sidebar}>
      <h3 className={s.heading}>Albums</h3>
      <div className={s.list}>
        <button
          className={`${s.albumBtn} ${selectedAlbum === null ? s.albumBtnSelected : ''}`}
          onClick={() => onSelectAlbum(null)}
        >
          <span className={s.albumName}>{allLabel}</span>
          <span className={s.badge}>{totalItemCount}</span>
        </button>
        {albums.map((album) => (
          <button
            key={album.id}
            className={`${s.albumBtn} ${selectedAlbum === album.id ? s.albumBtnSelected : ''}`}
            onClick={() => onSelectAlbum(album.id)}
            title={album.name}
          >
            <span className={s.albumName}>{album.name}</span>
            <span className={s.badge}>{album.itemCount || 0}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default AlbumSidebar;
