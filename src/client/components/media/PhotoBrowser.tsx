import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FixedSizeGrid as Grid,
  FixedSizeList as List,
  GridChildComponentProps,
  ListChildComponentProps,
  areEqual,
} from 'react-window';
import AutoSizer from '../common/AutoSizer';
import { MediaImage } from '../../types/media.types';
import Icon from '../common/Icon';
import MediaViewerModal from './MediaViewerModal';
import BatchToolbar from '../common/BatchToolbar';
import LazyImage from '../common/LazyImage';
import { SensitiveContent } from '../common/SensitiveContent';
import { useAuth } from '../../contexts/AuthContext';
import { Person } from '../../types';
import { PhotoSortField as SortField, usePhotoBrowserData } from '../../hooks/usePhotoBrowserData';
import { AlbumSidebar } from '../shared/AlbumSidebar';
import { MobileAlbumDropdown } from '../shared/MobileAlbumDropdown';
import { SEO } from '../common/SEO';

// Lazy load EvidenceModal to reduce initial bundle size
const EvidenceModal = React.lazy(() =>
  import('../common/EvidenceModal').then((module) => ({ default: module.EvidenceModal })),
);

interface PhotoBrowserProps {
  onImageClick?: (image: MediaImage) => void;
}

type ViewMode = 'grid' | 'list';

// --- Virtualized Renderers ---

interface ItemData {
  images: MediaImage[];
  selectedImages: Set<number>;
  isBatchMode: boolean;
  onImageClick: (image: MediaImage, index: number, event: React.MouseEvent) => void;
  onToggleSelection: (
    imageId: number,
    index: number,
    event: React.MouseEvent | React.KeyboardEvent,
  ) => void;
  columnCount?: number;
  formatDate: (d: string | undefined | null) => string;
  formatFileSize: (b: number | string | undefined) => string;
}

const GridCell = React.memo(
  ({ columnIndex, rowIndex, style, data }: GridChildComponentProps<ItemData>) => {
    const {
      images,
      selectedImages,
      isBatchMode,
      onImageClick,
      onToggleSelection,
      columnCount = 1,
      formatDate,
      formatFileSize,
    } = data;
    const index = rowIndex * columnCount + columnIndex;

    // Handle empty cells in the last row
    if (index >= images.length) return null;

    const img = images[index];
    const isSelected = selectedImages.has(img.id);

    return (
      <div style={{ ...style, padding: '4px' }}>
        <button
          className={`w-full h-full group relative bg-[var(--app-bg)] border rounded-[var(--radius-lg)] overflow-hidden transition-all shadow-[var(--glass-shadow)] hover:shadow-[var(--accent)]/20 ${isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--glass-border)] hover:border-[var(--accent)]/50'}`}
          onClick={(e) => onImageClick(img, index, e)}
          onKeyDown={(e) => {
            if (isBatchMode && e.key === 'Enter') {
              onToggleSelection(img.id, index, e);
            }
          }}
          tabIndex={isBatchMode ? 0 : -1}
        >
          {/* Selection indicator */}
          {isBatchMode && (
            <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--text-primary)] text-xs font-bold z-10">
              {isSelected ? '✓' : index + 1}
            </div>
          )}
          <SensitiveContent isSensitive={img.isSensitive} className="w-full h-full relative">
            <LazyImage
              key={img.id}
              src={`/api/media/images/${img.id}/thumbnail`}
              alt={img.title}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.onerror = null;
                el.src = `/api/media/images/${img.id}/file`;
              }}
              className="w-full h-full object-contain bg-[var(--glass-bg-strong)]/50"
            />
          </SensitiveContent>
          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            <div
              className="text-xs text-[var(--text-primary)] font-medium truncate"
              title={img.title}
            >
              {img.title}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex justify-between mt-1">
              <span>{formatDate(img.dateTaken)}</span>
              <span>{formatFileSize(img.fileSize)}</span>
            </div>
          </div>
        </button>
      </div>
    );
  },
  areEqual,
);

const ListRow = React.memo(({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const {
    images,
    selectedImages,
    isBatchMode,
    onImageClick,
    onToggleSelection,
    formatDate,
    formatFileSize,
  } = data;
  const img = images[index];
  const isSelected = selectedImages.has(img.id);

  return (
    <div style={style}>
      <button
        className={`flex items-center gap-4 p-2 border-b border-[var(--glass-border)] w-full text-left group transition-colors h-full ${isSelected ? 'bg-[var(--glass-bg-active)] border-[var(--accent)]' : 'hover:bg-[var(--glass-bg-highlight)]'}`}
        onClick={(e) => onImageClick(img, index, e)}
        onKeyDown={(e) => {
          if (isBatchMode && e.key === 'Enter') {
            onToggleSelection(img.id, index, e);
          }
        }}
        tabIndex={isBatchMode ? 0 : -1}
      >
        {/* Selection indicator */}
        {isBatchMode && (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--accent)] text-[var(--text-primary)] text-xs font-bold mr-2">
            {isSelected ? '✓' : index + 1}
          </div>
        )}
        <div className="w-12 h-12 bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-sm)] flex items-center justify-center shrink-0">
          <SensitiveContent isSensitive={img.isSensitive} className="w-full h-full">
            <LazyImage
              key={img.id}
              src={`/api/media/images/${img.id}/thumbnail`}
              alt={img.title}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.onerror = null;
                el.src = `/api/media/images/${img.id}/file`;
              }}
              className="w-full h-full object-contain"
            />
          </SensitiveContent>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm text-[var(--text-secondary)] font-medium truncate group-hover:text-[var(--accent)] transition-colors"
            title={img.title}
          >
            {img.title}
          </div>
          <div className="text-xs text-[var(--text-muted)] truncate">
            {img.title !== img.filename ? img.filename : ''}
          </div>
        </div>

        <div className="w-32 text-xs text-[var(--text-muted)] text-right shrink-0">
          {formatDate(img.dateTaken || img.dateAdded)}
        </div>
        <div className="w-20 text-xs text-[var(--text-muted)] text-right shrink-0 font-mono">
          {formatFileSize(img.fileSize)}
        </div>
      </button>
    </div>
  );
}, areEqual);

export const PhotoBrowser: React.FC<PhotoBrowserProps> = React.memo(({ onImageClick }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { isAdmin } = useAuth();
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false); // Mobile album dropdown
  const [previewPerson, setPreviewPerson] = useState<Pick<Person, 'id' | 'name'> | null>(null);

  // Batch selection state
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Undo stack for batch operations
  const [undoStack, setUndoStack] = useState<
    Array<{ action: string; imageIds: number[]; prevState: MediaImage[] }>
  >([]);
  const {
    albums,
    images,
    selectedAlbum,
    selectedTag,
    selectedPerson,
    sortField,
    sortOrder,
    searchQuery,
    loading,
    hasPeopleOnly,
    availableTags,
    availablePeople,
    libraryTotalCount,
    hasMore,
    pendingViewerIndex,
    setSelectedAlbum,
    setSelectedTag,
    setSelectedPerson,
    setSortField,
    setSortOrder,
    setSearchQuery,
    setHasPeopleOnly,
    loadPeopleOptions,
    loadMore,
    updateImages,
    consumePendingViewerIndex,
  } = usePhotoBrowserData();

  const selectedTagLabel =
    selectedTag != null
      ? (availableTags.find((tag) => tag.id === selectedTag)?.name ?? `${selectedTag}`)
      : null;
  const selectedPersonLabel =
    selectedPerson != null
      ? (availablePeople.find((person) => person.id === selectedPerson)?.name ??
        `${selectedPerson}`)
      : null;
  const currentAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbum) ?? null,
    [albums, selectedAlbum],
  );
  const adaptedAlbums = useMemo(
    () => albums.map((album) => ({ ...album, itemCount: album.imageCount ?? 0 })),
    [albums],
  );

  useEffect(() => {
    if (pendingViewerIndex === null) return;
    setViewerStartIndex(pendingViewerIndex);
    consumePendingViewerIndex();
  }, [consumePendingViewerIndex, pendingViewerIndex]);

  const toggleImageSelection = useCallback(
    (imageId: number, index: number, event: React.MouseEvent | React.KeyboardEvent) => {
      let newSelectedImages = new Set(selectedImages);

      if (event.shiftKey && lastSelectedIndex !== null) {
        // Shift+click: Select range (add to existing selection)
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          newSelectedImages.add(images[i].id);
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+click: Toggle selection (add/remove from existing)
        if (newSelectedImages.has(imageId)) {
          newSelectedImages.delete(imageId);
        } else {
          newSelectedImages.add(imageId);
        }
        setLastSelectedIndex(index);
      } else {
        // Regular click: If in batch mode, deselect all and select only this one
        if (isBatchMode) {
          newSelectedImages = new Set([imageId]);
          setLastSelectedIndex(index);
        } else {
          // If external handler provided, use it (legacy), otherwise open viewer
          if (onImageClick) {
            onImageClick(images[index]);
          } else {
            setViewerStartIndex(index);
            // URL update handled by MediaViewerModal or here?
            // MediaViewerModal handles param set.
          }
        }
      }

      setSelectedImages(newSelectedImages);
    },
    [selectedImages, lastSelectedIndex, images, isBatchMode, onImageClick],
  );

  const handleImageClick = useCallback(
    (image: MediaImage, index: number, event: React.MouseEvent) => {
      // If in batch mode, handle selection
      if (isBatchMode) {
        toggleImageSelection(image.id, index, event);
      } else {
        // If external handler provided, use it (legacy), otherwise open viewer
        if (onImageClick) {
          onImageClick(image);
        } else {
          setViewerStartIndex(index);
          // URL update handled by MediaViewerModal or here?
          // MediaViewerModal handles param set.
        }
      }
    },
    [isBatchMode, toggleImageSelection, onImageClick],
  );

  const enterBatchMode = () => {
    setIsBatchMode(true);
  };

  const exitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedImages(new Set());
    setLastSelectedIndex(null);
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setLastSelectedIndex(null);
  };

  const [showCopied, setShowCopied] = useState(false);
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  // Handle grid container click (for click-outside-to-deselect)
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only clear selection if in batch mode and clicked directly on the grid container (not an image)
    if (isBatchMode && e.target === e.currentTarget) {
      clearSelection();
    }
  };

  // Undo the last batch operation
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];

    // Restore previous state
    const updatedImages = [...images];
    for (const prevImg of lastAction.prevState) {
      const index = updatedImages.findIndex((img) => img.id === prevImg.id);
      if (index !== -1) {
        updatedImages[index] = prevImg;
      }
    }
    updateImages(() => updatedImages);

    // Remove from undo stack
    setUndoStack((prev) => prev.slice(0, -1));

    console.log(`Undid ${lastAction.action} on ${lastAction.imageIds.length} images`);
  };

  const handleBatchRotate = async (direction: 'left' | 'right') => {
    if (selectedImages.size === 0) return;

    // Save state for undo
    const affectedImageIds = Array.from(selectedImages);
    const prevState = images.filter((img) => selectedImages.has(img.id)).map((img) => ({ ...img }));

    try {
      const response = await fetch('/api/media/images/batch/rotate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: affectedImageIds,
          direction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch rotate images');
      }

      const { results } = await response.json();

      // Push to undo stack
      setUndoStack((prev) => [
        ...prev.slice(-9),
        { action: `rotate-${direction}`, imageIds: affectedImageIds, prevState },
      ]);

      // Update images with rotated versions
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            // Normalize backend response to match frontend model
            const raw = result.image;
            const normalizedUpdate = {
              ...raw,
              dateModified: raw.date_modified || raw.dateModified,
              width: raw.width,
              height: raw.height,
              orientation: raw.orientation,
            };
            updatedImages[index] = { ...updatedImages[index], ...normalizedUpdate };
          }
        }
      }
      updateImages(() => updatedImages);

      // Show success message
      console.log(
        `Successfully rotated ${(results as Array<{ success: boolean }>).filter((r) => r.success).length} images`,
      );
    } catch (error) {
      console.error('Error batch rotating images:', error);
      alert('Failed to rotate images');
    }
  };

  const handleBatchRate = async (rating: number) => {
    if (selectedImages.size === 0) return;

    try {
      const response = await fetch('/api/media/images/batch/rate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages),
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch rate images');
      }

      const { results } = await response.json();

      // Update images with new ratings
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], rating };
          }
        }
      }
      updateImages(() => updatedImages);

      // Show success message
      console.log(
        `Successfully tagged ${(results as Array<{ success: boolean }>).filter((r) => r.success).length} images`,
      );
    } catch (error) {
      console.error('Error batch rating images:', error);
      alert('Failed to rate images');
    }
  };

  const handleBatchTag = async (tagIds: number[], action: 'add' | 'remove') => {
    if (selectedImages.size === 0) return;

    try {
      const response = await fetch('/api/media/items/batch/tags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: Array.from(selectedImages),
          tagIds,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to batch ${action} tags`);
      }

      const { results } = await response.json();

      // For simplicity, we're not updating the UI with tag changes
      // In a real implementation, we might want to refetch tags for affected images

      // Show success message
      console.log(
        `Successfully ${action}ed tags to ${(results as Array<{ success: boolean }>).filter((r) => r.success).length} images`,
      );
    } catch (error) {
      console.error(`Error batch ${action}ing tags:`, error);
      alert(`Failed to ${action} tags`);
    }
  };

  const handleBatchPeople = async (entityIds: number[], action: 'add' | 'remove') => {
    if (selectedImages.size === 0) return;

    try {
      const response = await fetch('/api/media/items/batch/people', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: Array.from(selectedImages),
          personIds: entityIds,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to batch ${action} people`);
      }

      const { results } = await response.json();

      // For simplicity, we're not updating the UI with people changes
      // In a real implementation, we might want to refetch people for affected images

      // Show success message
      console.log(
        `Successfully tagged people for ${(results as Array<{ success: boolean }>).filter((r) => r.success).length} images`,
      );
    } catch (error) {
      console.error(`Error batch ${action}ing people:`, error);
      alert(`Failed to ${action} people`);
    }
  };

  const handleBatchMetadata = async (updates: { title?: string; description?: string }) => {
    if (selectedImages.size === 0) return;

    try {
      const response = await fetch('/api/media/images/batch/metadata', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages),
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch update metadata');
      }

      const { results } = await response.json();

      // Update images with new metadata
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], ...updates };
          }
        }
      }
      updateImages(() => updatedImages);

      // Show success message
      console.log(
        `Successfully updated metadata for ${(results as Array<{ success: boolean }>).filter((r) => r.success).length} images`,
      );
    } catch (error) {
      console.error('Error batch updating metadata:', error);
      alert('Failed to update metadata');
    }
  };

  // Memoize formatters to prevent recreation on every render (performance optimization)
  const formatFileSize = useCallback((bytes: number | string | undefined): string => {
    const numBytes = Number(bytes);
    if (bytes === undefined || bytes === null || bytes === '' || !Number.isFinite(numBytes))
      return 'Unknown';
    if (numBytes === 0) return '0 B';
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const formatDate = useCallback((dateString: string | undefined | null): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (_e) {
      return 'Unknown';
    }
  }, []);

  const handleCloseViewer = () => {
    setViewerStartIndex(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('photoId');
    window.history.replaceState({}, '', url);
  };

  return (
    <>
      <SEO
        title={currentAlbum ? `${currentAlbum.name} — Photos` : 'Photo Archive'}
        description="Forensic photo evidence from the Epstein files."
      />
      <div className="surface-glass flex flex-col h-full min-h-[500px] overflow-hidden">
        {/* Header with controls */}
        <div className="app-header-glass flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
          <MobileAlbumDropdown
            albums={adaptedAlbums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            isOpen={showAlbumDropdown}
            onToggle={() => setShowAlbumDropdown((value) => !value)}
            totalItemCount={libraryTotalCount}
            allLabel="All Photos"
            currentAlbumName={currentAlbum?.name}
          />

          {/* Search - Smaller on mobile */}
          <div className="w-full md:w-64 flex gap-2">
            <div className="relative flex-1">
              <Icon
                name="Search"
                size="sm"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full surface-glass text-[var(--text-primary)] pl-9 pr-3 py-2 md:py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-slate-500 transition-all h-8"
              />
            </div>
            {/* Mobile share button */}
            <button
              onClick={handleShare}
              className="md:hidden flex items-center justify-center w-10 surface-glass text-[var(--text-muted)] hover:text-[var(--text-primary)] h-8"
            >
              {showCopied ? (
                <Icon name="Check" size="sm" className="text-green-500" />
              ) : (
                <Icon name="Share2" size="sm" />
              )}
            </button>
          </div>

          {/* Desktop Sort and View Controls - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-1.5 surface-glass hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded text-xs transition-colors h-8"
            >
              {showCopied ? (
                <Icon name="Check" size="sm" className="text-green-500" />
              ) : (
                <Icon name="Share2" size="sm" />
              )}
              Share
            </button>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value) : null)}
                className="surface-glass rounded text-[var(--text-secondary)] text-xs px-2 py-1 focus:outline-none focus:border-[var(--accent)] h-8 max-w-[100px]"
              >
                <option value="">All Tags</option>
                {availableTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedPerson || ''}
                onChange={(e) =>
                  setSelectedPerson(e.target.value ? parseInt(e.target.value) : null)
                }
                onFocus={loadPeopleOptions}
                className="surface-glass rounded text-[var(--text-secondary)] text-xs px-2 py-1 focus:outline-none focus:border-[var(--accent)] h-8 max-w-[100px]"
              >
                <option value="">All People</option>
                {availablePeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setHasPeopleOnly(!hasPeopleOnly)}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs transition-colors h-8 ${hasPeopleOnly ? 'bg-cyan-900/50 border-[var(--accent)] text-[var(--accent)]' : 'surface-glass text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                title="Show only images with people"
              >
                <Icon name="Users" size="sm" />
              </button>
            </div>

            <div className="w-px h-6 bg-[var(--glass-bg-highlight)] mx-1"></div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="surface-glass rounded text-[var(--text-secondary)] text-xs px-2 py-1 focus:outline-none focus:border-[var(--accent)] h-8"
              >
                <option value="date_added">Date Added</option>
                <option value="date_taken">Date Taken</option>
                <option value="filename">Name</option>
                <option value="file_size">Size</option>
                <option value="title">Title</option>
              </select>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-8 h-8 flex items-center justify-center surface-glass hover:bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size="sm" />
            </button>

            <div className="flex surface-glass p-0.5 rounded h-8">
              <button
                className={`w-8 h-full flex items-center justify-center rounded ${viewMode === 'grid' ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <Icon name="Grid" size="sm" />
              </button>
              <button
                className={`w-8 h-full flex items-center justify-center rounded ${viewMode === 'list' ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <Icon name="List" size="sm" />
              </button>
            </div>

            {/* Batch Mode Toggle - Admin Only */}
            {isAdmin && (
              <button
                onClick={isBatchMode ? exitBatchMode : enterBatchMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isBatchMode ? 'bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)]' : 'surface-glass hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'} h-8`}
              >
                <Icon name="CheckSquare" size="sm" />
                {isBatchMode ? 'Exit Batch Mode' : 'Batch Edit'}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          <AlbumSidebar
            albums={adaptedAlbums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Photos"
          />

          {/* Main Content */}
          <div className="flex-1 bg-transparent flex flex-col overflow-hidden relative">
            {loading && images.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--app-bg)]/50 backdrop-blur-sm pointer-events-none">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]"></div>
              </div>
            ) : null}

            {/* Discreet loading indicator for updates */}
            {loading && images.length > 0 && (
              <div className="absolute top-4 right-4 z-20">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--accent)] drop-shadow-[var(--glass-shadow)]"></div>
              </div>
            )}

            {/* Warning Banner for Fake/Unconfirmed Albums */}
            {selectedAlbum && currentAlbum?.name.match(/Fake|Unconfirmed/i) && (
              <div className="bg-red-900/80 border-b border-red-700 px-4 py-3 flex items-start gap-3">
                <Icon name="AlertTriangle" className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-200 font-bold text-sm uppercase tracking-wider">
                    {currentAlbum.name.includes('Fake')
                      ? 'Confirmed Fake Media'
                      : 'Unconfirmed / Unverified Content'}
                  </h4>
                  <p className="text-red-300/90 text-sm mt-1">
                    {currentAlbum.name.includes('Fake')
                      ? 'These images have been confirmed as AI-generated or photoshopped. They are distributed to spread misinformation and discredit survivors. Viewing them may be harmful.'
                      : 'These images currently lack provenance or verification. Treat with extreme caution as they may be manipulated or out of context.'}
                  </p>
                </div>
              </div>
            )}

            {/* Active Filters */}
            {(selectedTag || selectedPerson) && (
              <div className="surface-glass-header mx-3 mt-3 flex items-center gap-2 px-4 py-2 border-b border-[var(--glass-border)] md:mx-4">
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                  Filtered by:
                </span>

                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded-full text-xs transition-colors group"
                  >
                    <span>Tag: {selectedTagLabel}</span>
                    <Icon
                      name="X"
                      size="xs"
                      className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    />
                  </button>
                )}

                {selectedPerson && (
                  <button
                    onClick={() => setSelectedPerson(null)}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded-full text-xs transition-colors group"
                  >
                    <span>Person: {selectedPersonLabel}</span>
                    <Icon
                      name="X"
                      size="xs"
                      className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                    />
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedPerson(null);
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] ml-auto"
                >
                  Clear all
                </button>
              </div>
            )}

            <div
              className="flex-1 min-h-[360px] overflow-hidden relative bg-transparent"
              onClick={handleGridClick}
            >
              {!loading && images.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
                  <Icon name="Image" size="lg" className="mb-2 opacity-50" />
                  <p>No images found</p>
                </div>
              ) : (
                <AutoSizer>
                  {({ width, height }) => {
                    if (width < 50) return null; // Avoid invalid calculations
                    if (viewMode === 'grid') {
                      const minColumnWidth = 200;
                      const gap = 16; // gap-4
                      const availableWidth = width - 48; // p-6 equivalent padding
                      const columnCount = Math.max(
                        1,
                        Math.floor((availableWidth + gap) / (minColumnWidth + gap)),
                      );
                      const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
                      const rowCount = Math.ceil(images.length / columnCount);
                      // Aspect ratio 3:2 roughly plus padding
                      const rowHeight = columnWidth / 1.5 + 8;

                      const itemData = {
                        images,
                        selectedImages,
                        isBatchMode,
                        onImageClick: handleImageClick,
                        onToggleSelection: toggleImageSelection,
                        columnCount,
                        formatDate,
                        formatFileSize,
                      };

                      return (
                        <Grid
                          columnCount={columnCount}
                          columnWidth={columnWidth + gap}
                          height={height}
                          rowCount={rowCount}
                          rowHeight={rowHeight + gap}
                          width={width}
                          itemData={itemData}
                          className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-6"
                          style={{ overflowX: 'hidden' }}
                          onItemsRendered={({ visibleRowStopIndex }) => {
                            const visibleIndex = visibleRowStopIndex * columnCount;
                            if (visibleIndex >= images.length - 20 && hasMore && !loading) {
                              void loadMore();
                            }
                          }}
                        >
                          {GridCell}
                        </Grid>
                      );
                    } else {
                      // List View
                      const itemData = {
                        images,
                        selectedImages,
                        isBatchMode,
                        onImageClick: handleImageClick,
                        onToggleSelection: toggleImageSelection,
                        formatDate,
                        formatFileSize,
                      };

                      return (
                        <List
                          height={height}
                          itemCount={images.length}
                          itemSize={72} // Height of list item
                          width={width}
                          itemData={itemData}
                          className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-6"
                          onItemsRendered={({ visibleStopIndex }) => {
                            if (visibleStopIndex >= images.length - 10 && hasMore && !loading) {
                              void loadMore();
                            }
                          }}
                        >
                          {ListRow}
                        </List>
                      );
                    }
                  }}
                </AutoSizer>
              )}

              {/* Batch Toolbar - Rendered via Portal for true viewport positioning */}
              {isBatchMode &&
                createPortal(
                  <div className="fixed bottom-8 left-0 right-0 flex justify-center z-[1000] pointer-events-none">
                    <div className="mx-4 max-w-[calc(100vw-2rem)] md:max-w-fit pointer-events-auto">
                      <BatchToolbar
                        selectedCount={selectedImages.size}
                        onRotate={handleBatchRotate}
                        onAssignTags={(tags) => {
                          // For now, we'll just add tags
                          handleBatchTag(tags, 'add');
                        }}
                        onAssignPeople={(people) => {
                          // For now, we'll just add people
                          handleBatchPeople(people, 'add');
                        }}
                        onAssignRating={handleBatchRate}
                        onEditMetadata={(field, value) => {
                          // Create updates object based on field
                          const updates: { title?: string; description?: string } = {};
                          if (field === 'title') {
                            updates.title = value;
                          } else if (field === 'description') {
                            updates.description = value;
                          }
                          handleBatchMetadata(updates);
                        }}
                        onCancel={exitBatchMode}
                        onDeselect={clearSelection}
                        onUndo={handleUndo}
                        canUndo={undoStack.length > 0}
                      />
                    </div>
                  </div>,
                  document.body,
                )}
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="h-6 bg-[var(--glass-bg-strong)] border-t border-[var(--glass-border)] flex items-center justify-between px-3 text-[10px] text-[var(--text-muted)] select-none shrink-0">
          <div>{images.length} items</div>
          <div>{selectedAlbum ? currentAlbum?.name : 'All Photos'}</div>
        </div>

        {/* Full Screen Viewer */}
        {viewerStartIndex !== null && (
          <MediaViewerModal
            images={images}
            initialIndex={viewerStartIndex}
            onClose={handleCloseViewer}
            onImageUpdate={(updatedImage) => {
              const newImages = [...images];
              const index = newImages.findIndex((img) => img.id === updatedImage.id);
              if (index !== -1) {
                newImages[index] = updatedImage;
                updateImages(() => newImages);
              }
            }}
            onEntityClick={(person) => {
              // Open EvidenceModal for the clicked person
              // Construct a partial person object from the minimal data we have
              setPreviewPerson({ id: person.id, name: person.name || '' });
            }}
          />
        )}
        {previewPerson && (
          <React.Suspense fallback={null}>
            <div className="fixed inset-0 z-[11000] pointer-events-auto">
              <EvidenceModal
                entityId={String(previewPerson.id)}
                isOpen={!!previewPerson}
                onClose={() => setPreviewPerson(null)}
              />
            </div>
          </React.Suspense>
        )}
      </div>
    </>
  );
});

export default PhotoBrowser;
