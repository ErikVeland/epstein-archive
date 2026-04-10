import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FixedSizeGrid as Grid,
  FixedSizeList as List,
  GridChildComponentProps,
  ListChildComponentProps,
  areEqual,
} from 'react-window';
import {
  Share2,
  Check,
  Users,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List as ListIcon,
  CheckSquare,
  X,
  AlertTriangle,
  Clock,
  HardDrive,
} from 'lucide-react';
import {
  Surface,
  Flex,
  Box,
  Stack,
  LqText,
  Button,
  SearchField,
  Select,
  cn,
} from '../../design-system/lib';
import AutoSizer from '../common/AutoSizer';
import { MediaImage } from '../../types/media.types';
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
import { EmptyCorpus } from '../common/EmptyCorpus';
import styles from './PhotoBrowser.module.css';

const EvidenceModal = React.lazy(() =>
  import('../common/EvidenceModal').then((module) => ({ default: module.EvidenceModal })),
);

interface PhotoBrowserProps {
  onImageClick?: (image: MediaImage) => void;
}

type ViewMode = 'tiles' | 'rows';

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
      columnCount = 1,
      formatDate,
      formatFileSize,
    } = data;
    const index = rowIndex * columnCount + columnIndex;

    if (index >= images.length) return null;

    const img = images[index];
    const isSelected = selectedImages.has(img.id);

    return (
      <div style={{ ...style, padding: '6px' }}>
        <Surface
          variant={isSelected ? 'glass-highlight' : 'glass-strong'}
          onClick={(e) => onImageClick(img, index, e)}
          className={cn(
            styles.gridCard,
            isSelected && styles.gridCardSelected,
            isBatchMode && styles.batchModeCard,
          )}
          tabIndex={isBatchMode ? 0 : -1}
        >
          {isBatchMode && (
            <Surface variant="solid" className={styles.selectionBadge}>
              <LqText variant="xs" weight="bold" color="primary">
                {isSelected ? <Check size={10} /> : index + 1}
              </LqText>
            </Surface>
          )}

          <SensitiveContent isSensitive={img.isSensitive} className={styles.mediaSurface}>
            <LazyImage
              key={img.id}
              src={`/api/media/images/${img.id}/thumbnail`}
              alt={img.title}
              className={styles.gridImage}
            />
          </SensitiveContent>

          <Box className={styles.titleOverlay}>
            <Stack gap="0" className={styles.overlayContent}>
              <LqText
                variant="xs"
                weight="bold"
                style={{ WebkitLineClamp: 1, display: '-webkit-box', overflow: 'hidden' }}
                title={img.title}
              >
                {img.title}
              </LqText>
              <Flex justify="between" align="center">
                <LqText variant="xs" color="muted">
                  {formatDate(img.dateTaken)}
                </LqText>
                <LqText variant="xs" color="muted">
                  {formatFileSize(img.fileSize)}
                </LqText>
              </Flex>
            </Stack>
          </Box>
        </Surface>
      </div>
    );
  },
  areEqual,
);

const ListRow = React.memo(({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const { images, selectedImages, isBatchMode, onImageClick, formatDate, formatFileSize } = data;
  const img = images[index];
  const isSelected = selectedImages.has(img.id);

  return (
    <div style={{ ...style, padding: '2px 6px' }}>
      <Surface
        variant={isSelected ? 'glass-highlight' : 'glass-highlight'}
        onClick={(e) => onImageClick(img, index, e)}
        className={cn(styles.listRow, isSelected && styles.listRowSelected)}
      >
        <Flex align="center" gap="md">
          {isBatchMode && (
            <Surface variant="solid" className={styles.listSelectionBadge}>
              <LqText variant="xs" weight="bold" color="primary">
                {isSelected ? <Check size={10} /> : index + 1}
              </LqText>
            </Surface>
          )}

          <Box className={styles.listThumb}>
            <SensitiveContent isSensitive={img.isSensitive} className={styles.mediaSurface}>
              <LazyImage
                key={img.id}
                src={`/api/media/images/${img.id}/thumbnail`}
                alt={img.title}
                className={styles.listThumbImage}
              />
            </SensitiveContent>
          </Box>

          <Stack gap="0" style={{ flex: 1 }}>
            <LqText
              variant="xs"
              weight="bold"
              style={{ WebkitLineClamp: 1, display: '-webkit-box', overflow: 'hidden' }}
            >
              {img.title}
            </LqText>
            <LqText variant="xxxs" color="muted">
              {img.filename}
            </LqText>
          </Stack>

          <Flex align="center" gap="lg" className={styles.listMeta}>
            <Flex align="center" gap="xs">
              <Clock size={12} className={styles.mutedIcon} />
              <LqText variant="xxxs" color="muted">
                {formatDate(img.dateTaken || img.dateAdded)}
              </LqText>
            </Flex>
            <Flex align="center" gap="xs">
              <HardDrive size={12} className={styles.mutedIcon} />
              <LqText variant="xxxs" color="muted">
                {formatFileSize(img.fileSize)}
              </LqText>
            </Flex>
          </Flex>
        </Flex>
      </Surface>
    </div>
  );
}, areEqual);

export const PhotoBrowser: React.FC<PhotoBrowserProps> = React.memo(({ onImageClick }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');
  const { isAdmin } = useAuth();
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [previewPerson, setPreviewPerson] = useState<Pick<Person, 'id' | 'name'> | null>(null);

  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

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
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          newSelectedImages.add(images[i].id);
        }
      } else if (event.ctrlKey || event.metaKey) {
        if (newSelectedImages.has(imageId)) {
          newSelectedImages.delete(imageId);
        } else {
          newSelectedImages.add(imageId);
        }
        setLastSelectedIndex(index);
      } else {
        if (isBatchMode) {
          newSelectedImages = new Set([imageId]);
          setLastSelectedIndex(index);
        } else {
          if (onImageClick) {
            onImageClick(images[index]);
          } else {
            setViewerStartIndex(index);
          }
        }
      }

      setSelectedImages(newSelectedImages);
    },
    [selectedImages, lastSelectedIndex, images, isBatchMode, onImageClick],
  );

  const handleImageClick = useCallback(
    (image: MediaImage, index: number, event: React.MouseEvent) => {
      if (isBatchMode) {
        toggleImageSelection(image.id, index, event);
      } else {
        if (onImageClick) {
          onImageClick(image);
        } else {
          setViewerStartIndex(index);
        }
      }
    },
    [isBatchMode, toggleImageSelection, onImageClick],
  );

  const enterBatchMode = () => setIsBatchMode(true);
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

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isBatchMode && e.target === e.currentTarget) {
      clearSelection();
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    const updatedImages = [...images];
    for (const prevImg of lastAction.prevState) {
      const index = updatedImages.findIndex((img) => img.id === prevImg.id);
      if (index !== -1) updatedImages[index] = prevImg;
    }
    updateImages(() => updatedImages);
    setUndoStack((prev) => prev.slice(0, -1));
  };

  const handleBatchRotate = async (direction: 'left' | 'right') => {
    if (selectedImages.size === 0) return;
    const affectedImageIds = Array.from(selectedImages);
    const prevState = images.filter((img) => selectedImages.has(img.id)).map((img) => ({ ...img }));
    try {
      const response = await fetch('/api/media/images/batch/rotate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: affectedImageIds, direction }),
      });
      if (!response.ok) throw new Error('Failed to batch rotate');
      const { results } = await response.json();
      setUndoStack((prev) => [
        ...prev.slice(-9),
        { action: `rotate-${direction}`, imageIds: affectedImageIds, prevState },
      ]);
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            const raw = result.image;
            updatedImages[index] = { ...updatedImages[index], ...raw };
          }
        }
      }
      updateImages(() => updatedImages);
    } catch (error) {
      console.error(error);
      alert('Failed to rotate images');
    }
  };

  const handleBatchRate = async (rating: number) => {
    if (selectedImages.size === 0) return;
    try {
      const response = await fetch('/api/media/images/batch/rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selectedImages), rating }),
      });
      if (!response.ok) throw new Error('Failed to batch rate');
      const { results } = await response.json();
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) updatedImages[index] = { ...updatedImages[index], rating };
        }
      }
      updateImages(() => updatedImages);
    } catch (error) {
      console.error(error);
      alert('Failed to rate images');
    }
  };

  const handleBatchTag = async (tagIds: number[], action: 'add' | 'remove') => {
    if (selectedImages.size === 0) return;
    try {
      const response = await fetch('/api/media/items/batch/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedImages), tagIds, action }),
      });
      if (!response.ok) throw new Error(`Failed to batch ${action} tags`);
    } catch (error) {
      console.error(error);
      alert(`Failed to ${action} tags`);
    }
  };

  const handleBatchPeople = async (entityIds: number[], action: 'add' | 'remove') => {
    if (selectedImages.size === 0) return;
    try {
      const response = await fetch('/api/media/items/batch/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedImages), personIds: entityIds, action }),
      });
      if (!response.ok) throw new Error(`Failed to batch ${action} people`);
    } catch (error) {
      console.error(error);
      alert(`Failed to ${action} people`);
    }
  };

  const handleBatchMetadata = async (updates: { title?: string; description?: string }) => {
    if (selectedImages.size === 0) return;
    try {
      const response = await fetch('/api/media/images/batch/metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selectedImages), updates }),
      });
      if (!response.ok) throw new Error('Failed to batch update metadata');
      const { results } = await response.json();
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) updatedImages[index] = { ...updatedImages[index], ...updates };
        }
      }
      updateImages(() => updatedImages);
    } catch (error) {
      console.error(error);
      alert('Failed to update metadata');
    }
  };

  const formatFileSize = useCallback((bytes: number | string | undefined): string => {
    const numBytes = Number(bytes);
    if (!bytes || !Number.isFinite(numBytes)) return 'Unknown';
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
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
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
      <Surface variant="glass-container" className={styles.browser}>
        {/* Header with controls */}
        <Flex justify="between" align="center" className={styles.header}>
          <MobileAlbumDropdown
            albums={adaptedAlbums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            isOpen={showAlbumDropdown}
            onToggle={() => setShowAlbumDropdown((v) => !v)}
            totalItemCount={libraryTotalCount}
            allLabel="All Photos"
            currentAlbumName={currentAlbum?.name}
          />

          <Flex gap="md" align="center" grow>
            <SearchField
              placeholder="Search archive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchField}
              rootClassName={styles.searchRoot}
            />

            <Flex gap="sm" align="center" className={styles.desktopControls}>
              <Button variant="glass" size="sm" onClick={handleShare}>
                {showCopied ? (
                  <Check size={14} className={styles.shareSuccess} />
                ) : (
                  <Share2 size={14} />
                )}
                <span>Share</span>
              </Button>

              <Flex gap="xs" align="center" className={styles.filterControls}>
                <Select
                  value={selectedTag || ''}
                  onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value) : null)}
                  options={[
                    { value: '', label: 'All Tags' },
                    ...availableTags.map((tag) => ({ value: tag.id, label: tag.name })),
                  ]}
                  className={styles.filterSelect}
                  rootClassName={styles.filterRoot}
                />

                <Select
                  value={selectedPerson || ''}
                  onChange={(e) =>
                    setSelectedPerson(e.target.value ? parseInt(e.target.value) : null)
                  }
                  onFocus={loadPeopleOptions}
                  options={[
                    { value: '', label: 'All People' },
                    ...availablePeople.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  className={styles.filterSelect}
                  rootClassName={styles.filterRoot}
                />

                <Button
                  variant={hasPeopleOnly ? 'accent-solid' : 'glass'}
                  size="sm"
                  onClick={() => setHasPeopleOnly(!hasPeopleOnly)}
                  title="Filter for people"
                >
                  <Users size={14} />
                </Button>
              </Flex>

              <Box className={styles.controlsDivider} />

              <Flex align="center" gap="xs" className={styles.sortControls}>
                <Select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  options={[
                    { value: 'date_added', label: 'Added' },
                    { value: 'date_taken', label: 'Taken' },
                    { value: 'filename', label: 'Name' },
                    { value: 'file_size', label: 'Size' },
                  ]}
                  className={styles.sortSelect}
                  rootClassName={styles.sortRoot}
                />
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                </Button>
              </Flex>

              <Flex className={styles.viewToggle} align="center">
                <Button
                  variant={viewMode === 'tiles' ? 'accent-solid' : 'glass'}
                  size="sm"
                  onClick={() => setViewMode('tiles')}
                >
                  <LayoutGrid size={14} />
                </Button>
                <Button
                  variant={viewMode === 'rows' ? 'accent-solid' : 'glass'}
                  size="sm"
                  onClick={() => setViewMode('rows')}
                >
                  <ListIcon size={14} />
                </Button>
              </Flex>

              {isAdmin && (
                <Button
                  variant={isBatchMode ? 'accent-solid' : 'glass-highlight'}
                  size="sm"
                  onClick={isBatchMode ? exitBatchMode : enterBatchMode}
                >
                  <CheckSquare size={14} />
                  <span>{isBatchMode ? 'Finish' : 'Batch'}</span>
                </Button>
              )}
            </Flex>
          </Flex>
        </Flex>

        <Flex className={styles.contentLayout}>
          <AlbumSidebar
            albums={adaptedAlbums}
            selectedAlbum={selectedAlbum}
            onSelectAlbum={setSelectedAlbum}
            totalItemCount={libraryTotalCount}
            allLabel="All Photos"
          />

          <Stack grow className={styles.mainContent}>
            {loading && images.length === 0 && (
              <Flex align="center" justify="center" className={styles.loadingOverlay}>
                <Box className={styles.loadingSpinner} />
              </Flex>
            )}

            {/* Forensic Warning Banners */}
            {selectedAlbum && currentAlbum?.name.match(/Fake|Unconfirmed/i) && (
              <Surface variant="glass-strong" className={styles.warningBanner}>
                <Flex align="start" gap="md">
                  <AlertTriangle size={24} color="var(--lq-danger)" />
                  <Stack gap="xs">
                    <LqText variant="small" weight="bold" color="danger">
                      {currentAlbum.name.includes('Fake')
                        ? 'Confirmed Forensic Manipulation'
                        : 'Unverified Intelligence'}
                    </LqText>
                    <LqText variant="xxs">
                      {currentAlbum.name.includes('Fake')
                        ? 'This material has been confirmed as AI-generated or manipulated intelligence designed to discredit investigation proceeds.'
                        : 'This content lacks definitive provenance. Analytical skepticism is required during forensic review.'}
                    </LqText>
                  </Stack>
                </Flex>
              </Surface>
            )}

            {/* Active Filters Display */}
            {(selectedTag || selectedPerson) && (
              <Flex gap="sm" align="center" className={styles.activeFilters}>
                <LqText
                  variant="xxxs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Active Filters:
                </LqText>
                {selectedTag && (
                  <Button variant="glass-highlight" size="sm" onClick={() => setSelectedTag(null)}>
                    <span>{selectedTagLabel}</span>
                    <X size={10} />
                  </Button>
                )}
                {selectedPerson && (
                  <Button
                    variant="glass-highlight"
                    size="sm"
                    onClick={() => setSelectedPerson(null)}
                  >
                    <span>{selectedPersonLabel}</span>
                    <X size={10} />
                  </Button>
                )}
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setSelectedTag(null);
                    setSelectedPerson(null);
                  }}
                >
                  Clear All
                </Button>
              </Flex>
            )}

            <Box className={styles.browserViewport} onClick={handleGridClick}>
              {!loading && images.length === 0 ? (
                <EmptyCorpus
                  icon="Image"
                  title="No Images Found"
                  body={
                    searchQuery || selectedTag || selectedPerson || hasPeopleOnly
                      ? 'No images match the current filters. Try clearing the search or tag filters to see all indexed photographs.'
                      : 'Photographs and visual evidence are indexed during media ingestion. No images have been loaded into the corpus yet — run the media ingestion pipeline to populate this section.'
                  }
                />
              ) : (
                <AutoSizer>
                  {({ width, height }) => {
                    if (width < 50) return null;
                    if (viewMode === 'tiles') {
                      const minColumnWidth = 220;
                      const gap = 16;
                      const availableWidth = width - 32;
                      const columnCount = Math.max(
                        1,
                        Math.floor((availableWidth + gap) / (minColumnWidth + gap)),
                      );
                      const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
                      const rowCount = Math.ceil(images.length / columnCount);
                      const rowHeight = columnWidth / 1.5 + 40;

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
                          className={styles.virtualScroller}
                          onItemsRendered={({ visibleRowStopIndex }) => {
                            if (
                              visibleRowStopIndex * columnCount >= images.length - 20 &&
                              hasMore &&
                              !loading
                            ) {
                              void loadMore();
                            }
                          }}
                        >
                          {GridCell}
                        </Grid>
                      );
                    } else {
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
                          itemSize={84}
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

              {isBatchMode &&
                createPortal(
                  <Box className={styles.batchToolbarPortal}>
                    <Surface variant="glass-container" className={styles.batchToolbarWrap}>
                      <BatchToolbar
                        selectedCount={selectedImages.size}
                        onRotate={handleBatchRotate}
                        onAssignTags={(tags) => handleBatchTag(tags, 'add')}
                        onAssignPeople={(ppl) => handleBatchPeople(ppl, 'add')}
                        onAssignRating={handleBatchRate}
                        onEditMetadata={(field, val) => handleBatchMetadata({ [field]: val })}
                        onCancel={exitBatchMode}
                        onDeselect={clearSelection}
                        onUndo={handleUndo}
                        canUndo={undoStack.length > 0}
                      />
                    </Surface>
                  </Box>,
                  document.body,
                )}
            </Box>
          </Stack>
        </Flex>

        {/* Footer Status Bar */}
        <Flex justify="between" align="center" px="md" py="xs" className={styles.footer}>
          <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }} weight="bold">
            {images.length} Objects Indexed
          </LqText>
          <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }} weight="bold">
            Catalog: {selectedAlbum ? currentAlbum?.name : 'Master Archive'}
          </LqText>
        </Flex>

        {/* Full Screen Viewer */}
        {viewerStartIndex !== null && (
          <MediaViewerModal
            images={images}
            initialIndex={viewerStartIndex}
            onClose={handleCloseViewer}
            onImageUpdate={(updated) => {
              const newImages = [...images];
              const idx = newImages.findIndex((img) => img.id === updated.id);
              if (idx !== -1) {
                newImages[idx] = updated;
                updateImages(() => newImages);
              }
            }}
            onEntityClick={(p) => setPreviewPerson({ id: p.id, name: p.name || '' })}
          />
        )}

        {previewPerson && (
          <React.Suspense fallback={null}>
            <Box className={styles.previewModal}>
              <EvidenceModal
                entityId={String(previewPerson.id)}
                isOpen={!!previewPerson}
                onClose={() => setPreviewPerson(null)}
              />
            </Box>
          </React.Suspense>
        )}
      </Surface>
    </>
  );
});

export default PhotoBrowser;
