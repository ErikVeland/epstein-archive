import React from 'react';
import Icon from '../common/Icon';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';
import s from './MobileAlbumDropdown.module.css';

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
    <div className={s.root}>
      <button onClick={onToggle} className={s.trigger}>
        <span className={s.triggerLabel}>
          <Icon name="Folder" size="sm" />
          {displayName}
        </span>
        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size="sm" />
      </button>
      {isOpen && (
        <div className={`${s.dropdown} dropdown-surface`}>
          <button
            className={`${s.option} ${selectedAlbum === null ? s.optionSelected : ''}`}
            onClick={() => handleSelect(null)}
          >
            <span>{allLabel}</span>
            <span className={s.badge}>{totalItemCount}</span>
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              className={`${s.option} ${s.optionDivided} ${selectedAlbum === album.id ? s.optionSelected : ''}`}
              onClick={() => handleSelect(album.id)}
            >
              <span className={s.albumName}>{album.name}</span>
              <span className={s.badge}>{album.itemCount || 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileAlbumDropdown;
