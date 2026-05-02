import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import {
  Box,
  Button,
  Flex,
  Grid as LqGrid,
  Input,
  LqText,
  Stack,
  Surface,
  TextArea,
  cn,
} from '@client/design-system/lib';
import { MediaImage } from '@client/types/media.types';
import { useAuth } from '@client/contexts/AuthContext';
import LocationMap from '../visualizations/LocationMap';
import TagSelector, { TagData } from '../common/TagSelector';
import PeopleSelector, { PersonData } from '../entities/PeopleSelector';
import { useScrollLock } from '@client/hooks/useScrollLock';
import styles from './MediaViewerModal.module.css';

interface MediaViewerModalProps {
  images: MediaImage[];
  initialIndex: number;
  onClose: () => void;
  onImageUpdate?: (updatedImage: MediaImage) => void;
  onEntityClick?: (person: { id: string | number; name?: string; [key: string]: unknown }) => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  images,
  initialIndex,
  onClose,
  onImageUpdate,
  onEntityClick,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showSidebar, setShowSidebar] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  useScrollLock(true);

  const currentImage = images[currentIndex];

  const getRotationFromOrientation = (orientation?: number) => {
    switch (orientation) {
      case 3:
        return 180;
      case 6:
        return 90;
      case 8:
        return 270;
      default:
        return 0;
    }
  };

  const [rotation, setRotation] = useState(() =>
    getRotationFromOrientation(currentImage?.orientation),
  );
  const [justRotated, setJustRotated] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageVersion, setImageVersion] = useState(0);
  const [prevImageId, setPrevImageId] = useState(currentImage?.id);
  const [editTitle, setEditTitle] = useState(currentImage?.title || '');
  const [editDesc, setEditDesc] = useState(currentImage?.description || '');

  if (currentImage && currentImage.id !== prevImageId) {
    setPrevImageId(currentImage.id);
    setImageLoading(true);
    setEditTitle(currentImage.title || '');
    setEditDesc(currentImage.description || '');
    setIsEditing(false);
    if (!justRotated) {
      setRotation(getRotationFromOrientation(currentImage.orientation));
    } else {
      setJustRotated(false);
    }
  }

  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    if (distance > minSwipeDistance) handleNext();
    if (distance < -minSwipeDistance) handlePrev();
  };

  const [imageTags, setImageTags] = useState<TagData[]>([]);
  const [imagePeople, setImagePeople] = useState<PersonData[]>([]);

  useEffect(() => {
    const handleResize = () => setShowSidebar(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentImage) return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/media/images/${currentImage.id}/tags`)
        .then((res) => res.json())
        .catch(() => []),
      fetch(`/api/media/images/${currentImage.id}/people`)
        .then((res) => res.json())
        .catch(() => []),
    ]).then(([tags, people]) => {
      if (cancelled) return;
      setImageTags(Array.isArray(tags) ? tags : []);
      setImagePeople(Array.isArray(people) ? people : []);
    });
    return () => {
      cancelled = true;
    };
  }, [currentImage]);

  const handleRotate = async (direction: 'left' | 'right') => {
    if (!currentImage) return;
    try {
      setRotation((prev) => (prev + (direction === 'right' ? 90 : -90)) % 360);
      const res = await fetch(`/api/media/images/${currentImage.id}/rotate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        setRotation((prev) => (prev - (direction === 'right' ? 90 : -90)) % 360);
        return;
      }
      const updatedImage = await res.json();
      setJustRotated(true);
      onImageUpdate?.({ ...currentImage, ...updatedImage });
      setImageLoading(true);
      setImageVersion((v) => v + 1);
      setRotation(0);
    } catch (e) {
      console.error(e);
      setRotation((prev) => (prev - (direction === 'right' ? 90 : -90)) % 360);
    }
  };

  const handleSave = async () => {
    if (!currentImage) return;
    try {
      const res = await fetch(`/api/media/images/${currentImage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      if (!res.ok) throw new Error('Save failed');
      setIsEditing(false);
      onImageUpdate?.({ ...currentImage, title: editTitle, description: editDesc });
    } catch (e) {
      console.error(e);
      alert('Error saving changes');
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) setCurrentIndex((prev) => prev + 1);
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'i') setShowSidebar((v) => !v);
    },
    [handleNext, handlePrev, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!currentImage) return;
    const url = new URL(window.location.href);
    url.searchParams.set('photoId', currentImage.id.toString());
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl === currentUrl) return;
    navigate(nextUrl, { replace: true });
  }, [currentImage, navigate]);

  if (!currentImage) return null;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('photoId', currentImage.id.toString());
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const imageSrc = `/api/media/images/${currentImage.id}/raw?v=${imageVersion}`;

  return createPortal(
    <Box className={styles.overlay}>
      <Box
        className={cn(
          styles.mainPanel,
          showSidebar ? styles.mainPanelShifted : styles.mainPanelFull,
        )}
      >
        <Flex justify="between" align="center" className={styles.toolbar}>
          <Flex align="center" gap="md">
            <Button variant="glass" size="sm" onClick={onClose} title="Close Resolution Viewer">
              <Icon name="X" size="md" />
            </Button>
            <Stack gap="0">
              <LqText variant="small" weight="bold" color="foreground">
                {currentImage.title}
              </LqText>
              <LqText
                variant="xs"
                color="muted"
                style={{ textTransform: 'uppercase' }}
                weight="bold"
              >
                OBJECT {currentIndex + 1} OF {images.length}
              </LqText>
            </Stack>
          </Flex>

          <Flex align="center" gap="sm">
            <Button variant="glass" size="sm" onClick={handleShare}>
              {showCopied ? (
                <Icon name="Check" size="md" className={styles.successIcon} />
              ) : (
                <Icon name="Share2" size="md" />
              )}
            </Button>
            <Button variant="glass" size="sm" onClick={() => setIsZoomed(!isZoomed)}>
              {isZoomed ? <Icon name="Minimize2" size="md" /> : <Icon name="Maximize2" size="md" />}
            </Button>
            {isAdmin && (
              <Button
                variant="glass"
                size="sm"
                onClick={() => handleRotate('right')}
                title="Rotate 90° CW"
              >
                <Icon name="RotateCw" size="md" />
              </Button>
            )}
            <Button
              variant={showSidebar ? 'accent-solid' : 'glass'}
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <Icon name="Info" size="md" />
            </Button>
          </Flex>
        </Flex>

        {currentIndex > 0 && (
          <Button
            variant="glass"
            className={cn(styles.navButton, styles.navButtonLeft)}
            onClick={handlePrev}
          >
            <Icon name="ChevronLeft" size="xl" />
          </Button>
        )}
        {currentIndex < images.length - 1 && (
          <Button
            variant="glass"
            className={cn(styles.navButton, styles.navButtonRight)}
            onClick={handleNext}
          >
            <Icon name="ChevronRight" size="xl" />
          </Button>
        )}

        <Box
          className={styles.imageStage}
          onClick={() => setShowSidebar(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imageLoading && (
            <Flex align="center" justify="center" className={styles.loadingOverlay}>
              <Box className={styles.loadingSpinner} />
            </Flex>
          )}
          <img
            src={imageSrc}
            alt={currentImage.title}
            onLoad={() => setImageLoading(false)}
            className={cn(
              styles.image,
              isZoomed ? styles.imageZoomed : styles.imageContained,
              imageLoading ? styles.imageHidden : styles.imageVisible,
            )}
            style={{ transform: `rotate(${rotation}deg)` }}
            draggable={false}
          />
        </Box>
      </Box>

      <Surface
        variant="glass-container"
        className={cn(styles.sidebar, showSidebar ? styles.sidebarVisible : styles.sidebarHidden)}
      >
        <Stack gap="xl" className={styles.sidebarContent}>
          <Stack gap="md">
            <Flex justify="between" align="start">
              <Stack gap="xs" style={{ flex: 1 }}>
                {isEditing ? (
                  <Stack gap="xs">
                    <LqText variant="xs" weight="bold" color="muted">
                      EDIT TITLE
                    </LqText>
                    <Input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={styles.textInput}
                    />
                  </Stack>
                ) : (
                  <Stack gap="0">
                    <LqText variant="body" weight="bold">
                      {currentImage.title}
                    </LqText>
                    <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                      {currentImage.filename}
                    </LqText>
                  </Stack>
                )}
              </Stack>
              <Flex gap="xs">
                {isAdmin && !isEditing && (
                  <Button variant="glass" size="sm" onClick={() => setIsEditing(true)}>
                    <Icon name="Edit2" size="sm" />
                  </Button>
                )}
                <Button variant="glass" size="sm" onClick={() => setShowSidebar(false)}>
                  <Icon name="X" size="sm" />
                </Button>
              </Flex>
            </Flex>

            {isEditing && (
              <Flex gap="sm">
                <Button variant="secondary" size="sm" onClick={handleSave}>
                  <Icon name="Save" size="sm" />
                  <span>Save Intelligence</span>
                </Button>
                <Button variant="glass" size="sm" onClick={() => setIsEditing(false)}>
                  <Icon name="X" size="sm" />
                </Button>
              </Flex>
            )}
          </Stack>

          <Stack gap="md">
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="FileImage" size="sm" />
              </Box>
              <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                File Matrix
              </LqText>
            </Flex>
            <LqGrid cols={2} gap="sm">
              <Surface variant="glass-highlight" p="sm">
                <Stack gap="xs">
                  <LqText
                    variant="xxs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Format
                  </LqText>
                  <LqText variant="xs">{currentImage.format || 'Unknown'}</LqText>
                </Stack>
              </Surface>
              <Surface variant="glass-highlight" p="sm">
                <Stack gap="xs">
                  <LqText
                    variant="xxs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Size
                  </LqText>
                  <LqText variant="xs">{formatFileSize(currentImage.fileSize)}</LqText>
                </Stack>
              </Surface>
              <Surface variant="glass-highlight" p="sm">
                <Stack gap="xs">
                  <LqText
                    variant="xxs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Dimensions
                  </LqText>
                  <LqText variant="xs">
                    {currentImage.width && currentImage.height
                      ? `${currentImage.width}×${currentImage.height}`
                      : 'Unknown'}
                  </LqText>
                </Stack>
              </Surface>
              <Surface variant="glass-highlight" p="sm">
                <Stack gap="xs">
                  <LqText
                    variant="xxs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Added
                  </LqText>
                  <LqText variant="xs">
                    {currentImage.dateAdded || currentImage.created_at || 'Unknown'}
                  </LqText>
                </Stack>
              </Surface>
            </LqGrid>
          </Stack>

          {currentImage.documentId && (
            <Stack gap="md">
              <Flex align="center" gap="sm">
                <Box className={styles.sectionIcon}>
                  <Icon name="Info" size="sm" />
                </Box>
                <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                  Archival Provenance
                </LqText>
              </Flex>
              <Surface variant="glass-highlight" p="md">
                <Stack gap="sm">
                  <LqText variant="xs" color="muted">
                    This asset was extracted from:
                  </LqText>
                  <Button
                    variant="glass-highlight"
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={() =>
                      navigate(`/documents/${encodeURIComponent(String(currentImage.documentId))}`)
                    }
                    className={styles.provenanceLink}
                  >
                    <Icon name="FileImage" size="sm" />
                    <span
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {currentImage.metadata?.['source_document']
                        ? String(currentImage.metadata['source_document'])
                        : `Document ID: ${currentImage.documentId}`}
                    </span>
                  </Button>
                  {currentImage.metadata?.['source_page'] ? (
                    <LqText variant="xxs" color="muted">
                      Located on Page {String(currentImage.metadata['source_page'])}
                    </LqText>
                  ) : null}
                </Stack>
              </Surface>
            </Stack>
          )}

          <Stack gap="md">
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="Info" size="sm" />
              </Box>
              <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                Forensic Description
              </LqText>
            </Flex>
            {isEditing ? (
              <TextArea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className={styles.textarea}
              />
            ) : (
              <LqText variant="xs" color="muted">
                {currentImage.description || 'No analytical summary provided.'}
              </LqText>
            )}
          </Stack>

          <Stack gap="md">
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="Camera" size="sm" />
              </Box>
              <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                EXIF Intelligence
              </LqText>
            </Flex>
            <Surface variant="glass-highlight" p="md">
              <Stack gap="sm">
                <Flex justify="between" align="center">
                  <LqText variant="xs" color="muted">
                    DATE CAPTURED
                  </LqText>
                  <LqText variant="xs" weight="bold">
                    {formatDate(currentImage.dateTaken)}
                  </LqText>
                </Flex>
                <Flex justify="between" align="center">
                  <LqText variant="xs" color="muted">
                    OPTICS
                  </LqText>
                  <LqText variant="xs" weight="bold">
                    {currentImage.cameraMake} {currentImage.cameraModel || 'Generic'}
                  </LqText>
                </Flex>
                <Flex justify="between" align="center">
                  <LqText variant="xs" color="muted">
                    RESOLUTION
                  </LqText>
                  <LqText variant="xs" weight="bold">
                    {currentImage.width} × {currentImage.height}
                  </LqText>
                </Flex>
              </Stack>
            </Surface>
          </Stack>

          {currentImage.latitude && currentImage.longitude && (
            <Stack gap="md">
              <Flex align="center" gap="sm">
                <Box className={styles.sectionIcon}>
                  <Icon name="MapPin" size="sm" />
                </Box>
                <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                  Spatial Provenance
                </LqText>
              </Flex>
              <Box className={styles.mapContainer}>
                <LocationMap
                  latitude={currentImage.latitude}
                  longitude={currentImage.longitude}
                  title="Capture Coordinates"
                />
              </Box>
            </Stack>
          )}

          <Stack gap="md">
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="Tag" size="sm" />
              </Box>
              <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                Forensic Tags
              </LqText>
            </Flex>
            <TagSelector
              selectedTags={imageTags}
              onTagsChange={setImageTags}
              mediaId={currentImage.id}
              isAdmin={isAdmin}
              onTagClick={(tag) => {
                onClose();
                navigate(`/media?tagId=${tag.id}`);
              }}
            />
          </Stack>

          <PeopleSelector
            selectedPeople={imagePeople}
            onPeopleChange={setImagePeople}
            mediaId={currentImage.id}
            isAdmin={isAdmin}
            onPersonClick={(person) => {
              if (onEntityClick) {
                onEntityClick({
                  id: person.id,
                  name: person.name,
                  role: person.role,
                  redFlagRating: person.redFlagRating,
                });
              } else {
                onClose();
                navigate(`/media?personId=${person.id}`);
              }
            }}
          />
        </Stack>
      </Surface>
    </Box>,
    document.body,
  );
};

export default MediaViewerModal;
