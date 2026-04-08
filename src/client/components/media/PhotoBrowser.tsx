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
import { cn } from '@client/utils/cn';
import styles from './PhotoBrowser.module.css';

// Lazy load EvidenceModal to reduce initial bundle size
const EvidenceModal = React.lazy(() =>
  import('../common/EvidenceModal').then((module) => ({ default: module.EvidenceModal })),
);

interface PhotoBrowserProps {
  onImageClick?: (image: MediaImage) => void;
}

type ViewMode = 'tiles' | 'rows';

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
          className={cn(
            styles.gridCard,
            isSelected ? styles.gridCardSelected : styles.gridCardIdle,
          )}
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
            <div className={styles.selectionBadge}>{isSelected ? '✓' : index + 1}</div>
          )}
          <SensitiveContent isSensitive={img.isSensitive} className={styles.mediaSurface}>
            <LazyImage
              key={img.id}
              src={`/api/media/images/${img.id}/thumbnail`}
              alt={img.title}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.onerror = null;
                el.src = `/api/media/images/${img.id}/file`;
              }}
              className={styles.gridImage}
            />
          </SensitiveContent>
          {/* Title overlay */}
          <div className={styles.titleOverlay}>
            <div className={styles.overlayTitle} title={img.title}>
              {img.title}
            </div>
            <div className={styles.overlayMeta}>
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
        className={cn(styles.listRow, isSelected ? styles.listRowSelected : styles.listRowIdle)}
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
          <div className={cn(styles.selectionBadge, styles.listSelectionBadge)}>
            {isSelected ? '✓' : index + 1}
          </div>
        )}
        <div className={styles.listThumb}>
          <SensitiveContent isSensitive={img.isSensitive} className={styles.mediaSurface}>
            <LazyImage
              key={img.id}
              src={`/api/media/images/${img.id}/thumbnail`}
              alt={img.title}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.onerror = null;
                el.src = `/api/media/images/${img.id}/file`;
              }}
              className={styles.listThumbImage}
            />
          </SensitiveContent>
        </div>
        <div className={styles.listMeta}>
          <div className={styles.listTitle} title={img.title}>
            {img.title}
          </div>
          <div className={styles.listFilename}>
            {img.title !== img.filename ? img.filename : ''}
          </div>
        </div>

        <div className={styles.listDate}>{formatDate(img.dateTaken || img.dateAdded)}</div>
        <div className={styles.listSize}>{formatFileSize(img.fileSize)}</div>
      </button>
    </div>
  );
}, areEqual);

export const PhotoBrowser: React.FC<PhotoBrowserProps> = React.memo(({ onImageClick }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');
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
      <div className={cn('surface-glass', styles.browser)}>
        {/* Header with controls */}
        <div className={cn('app-header-glass', styles.header)}>
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
          <div className={styles.searchShell}>
            <div className={styles.searchField}>
              <Icon name="Search" size="sm" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search images..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn('surface-glass', styles.searchInput)}
              />
            </div>
            {/* Mobile share button */}
            <button onClick={handleShare} className={cn('surface-glass', styles.mobileShareButton)}>
              {showCopied ? (
                <Icon name="Check" size="sm" className={styles.shareSuccessIcon} />
              ) : (
                <Icon name="Share2" size="sm" />
              )}
            </button>
          </div>

          {/* Desktop Sort and View Controls - Hidden on mobile */}
          <div className={styles.desktopControls}>
            <button onClick={handleShare} className={cn('surface-glass', styles.shareButton)}>
              {showCopied ? (
                <Icon name="Check" size="sm" className={styles.shareSuccessIcon} />
              ) : (
                <Icon name="Share2" size="sm" />
              )}
              Share
            </button>

            {/* Filters */}
            <div className={styles.filterControls}>
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value) : null)}
                className={cn('surface-glass', styles.filterSelect)}
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
                className={cn('surface-glass', styles.filterSelect)}
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
                className={cn(
                  styles.peopleFilterButton,
                  hasPeopleOnly ? styles.peopleFilterButtonActive : 'surface-glass',
                )}
                title="Show only images with people"
              >
                <Icon name="Users" size="sm" />
              </button>
            </div>

            <div className={styles.controlsDivider} />

            <div className={styles.sortControls}>
              <span className={styles.sortLabel}>Sort by:</span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className={cn('surface-glass', styles.sortSelect)}
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
              className={cn('surface-glass', styles.iconButton)}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size="sm" />
            </button>

            <div className={cn('surface-glass', styles.viewToggle)}>
              <button
                className={cn(
                  styles.viewToggleButton,
                  viewMode === 'tiles'
                    ? styles.viewToggleButtonActive
                    : styles.viewToggleButtonIdle,
                )}
                onClick={() => setViewMode('tiles')}
                title="Grid View"
              >
                <Icon name="Grid" size="sm" />
              </button>
              <button
                className={cn(
                  styles.viewToggleButton,
                  viewMode === 'rows' ? styles.viewToggleButtonActive : styles.viewToggleButtonIdle,
                )}
                onClick={() => setViewMode('rows')}
                title="List View"
              >
                <Icon name="List" size="sm" />
              </button>
            </div>

            {/* Batch Mode Toggle - Admin Only */}
            {isAdmin && (
              <button
                onClick={isBatchMode ? exitBatchMode : enterBatchMode}
                className={cn(
                  styles.batchToggleButton,
                  isBatchMode ? styles.batchToggleButtonActive : 'surface-glass',
                )}
              >
                <Icon name="CheckSquare" size="sm" />
                {isBatchMode ? 'Exit Batch Mode' : 'Batch Edit'}
              </button>
            )}
          </div>
        </div>

        <div className={styles.contentLayout}>
          <AlbumSidebar
            albums={adaptedAlbums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Photos"
          />

          {/* Main Content */}
          <div className={styles.mainContent}>
            {loading && images.length === 0 ? (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingSpinner} />
              </div>
            ) : null}

            {/* Discreet loading indicator for updates */}
            {loading && images.length > 0 && (
              <div className={styles.inlineLoaderWrap}>
                <div className={styles.inlineLoader} />
              </div>
            )}

            {/* Warning Banner for Fake/Unconfirmed Albums */}
            {selectedAlbum && currentAlbum?.name.match(/Fake|Unconfirmed/i) && (
              <div className={styles.warningBanner}>
                <Icon name="AlertTriangle" className={styles.warningIcon} />
                <div>
                  <h4 className={styles.warningTitle}>
                    {currentAlbum.name.includes('Fake')
                      ? 'Confirmed Fake Media'
                      : 'Unconfirmed / Unverified Content'}
                  </h4>
                  <p className={styles.warningBody}>
                    {currentAlbum.name.includes('Fake')
                      ? 'These images have been confirmed as AI-generated or photoshopped. They are distributed to spread misinformation and discredit survivors. Viewing them may be harmful.'
                      : 'These images currently lack provenance or verification. Treat with extreme caution as they may be manipulated or out of context.'}
                  </p>
                </div>
              </div>
            )}

            {/* Active Filters */}
            {(selectedTag || selectedPerson) && (
              <div className={cn('surface-glass-header', styles.activeFilters)}>
                <span className={styles.activeFiltersLabel}>Filtered by:</span>

                {selectedTag && (
                  <button onClick={() => setSelectedTag(null)} className={styles.filterPill}>
                    <span>Tag: {selectedTagLabel}</span>
                    <Icon name="X" size="xs" className={styles.filterPillIcon} />
                  </button>
                )}

                {selectedPerson && (
                  <button onClick={() => setSelectedPerson(null)} className={styles.filterPill}>
                    <span>Person: {selectedPersonLabel}</span>
                    <Icon name="X" size="xs" className={styles.filterPillIcon} />
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedPerson(null);
                  }}
                  className={styles.clearFiltersButton}
                >
                  Clear all
                </button>
              </div>
            )}

            <div className={styles.browserViewport} onClick={handleGridClick}>
              {!loading && images.length === 0 ? (
                <div className={styles.emptyState}>
                  <Icon name="Image" size="lg" className={styles.emptyStateIcon} />
                  <p>No images found</p>
                </div>
              ) : (
                <AutoSizer>
                  {({ width, height }) => {
                    if (width < 50) return null; // Avoid invalid calculations
                    if (viewMode === 'tiles') {
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
                          className={cn(styles.virtualScroller, styles.gridScroller)}
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
                          className={styles.virtualScroller}
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
                  <div className={styles.batchToolbarPortal}>
                    <div className={styles.batchToolbarWrap}>
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
        <div className={styles.footer}>
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
            <div className={styles.previewModal}>
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
