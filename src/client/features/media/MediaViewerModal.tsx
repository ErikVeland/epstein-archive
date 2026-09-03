import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import {
  Box,
  Badge,
  Button,
  Flex,
  Input,
  LqText,
  Stack,
  Surface,
  TextArea,
  cn,
  HIGSettingsGroup,
  HIGSettingsRow,
} from '@client/design-system/lib';
import { MediaImage } from '@client/types/media.types';
import { useAuth } from '@client/contexts/AuthContext';
import LocationMap from '@client/components/visualizations/LocationMap';
import TagSelector, { TagData } from '@client/components/common/TagSelector';
import PeopleSelector, { PersonData } from '@client/components/entities/PeopleSelector';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { apiClient } from '@client/services/apiClient';
import { useToasts } from '@client/components/common/useToasts';
import styles from './MediaViewerModal.module.css';

interface MediaViewerModalProps {
  images: MediaImage[];
  initialIndex: number;
  onClose: () => void;
  onImageUpdate?: (updatedImage: MediaImage) => void;
  onEntityClick?: (person: { id: string | number; name?: string; [key: string]: unknown }) => void;
}

function humanizeMetadataValue(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
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
  const backLinkState = useBackLinkState();
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const { addToast } = useToasts();

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
      apiClient.getImageTags(currentImage.id).catch(() => []),
      apiClient.getImagePeople<PersonData>(currentImage.id).catch(() => []),
    ]).then(([tags, people]) => {
      if (cancelled) return;
      setImageTags(
        Array.isArray(tags)
          ? tags.map((tag) => ({
              id: tag.id,
              name: tag.name,
              color: (tag as Partial<TagData>).color || 'var(--accent-agentic)',
            }))
          : [],
      );
      setImagePeople(Array.isArray(people) ? people : []);
    });
    return () => {
      cancelled = true;
    };
  }, [currentImage]);

  const handleRotate = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentImage) return;
      try {
        setRotation((prev) => (prev + (direction === 'right' ? 90 : -90)) % 360);
        setIsSaving(true);
        const updatedImage = await apiClient.rotateMediaImage(currentImage.id, direction);
        setJustRotated(true);
        onImageUpdate?.({ ...currentImage, ...updatedImage });
        setImageLoading(true);
        setImageVersion((v) => v + 1);
        setRotation(0);
        addToast({ text: 'Image rotated', type: 'success' });
      } catch (e) {
        console.error(e);
        setRotation((prev) => (prev - (direction === 'right' ? 90 : -90)) % 360);
        addToast({
          text: e instanceof Error ? e.message : 'Failed to rotate image',
          type: 'error',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [addToast, currentImage, onImageUpdate],
  );

  const handleSave = async () => {
    if (!currentImage) return;
    try {
      setIsSaving(true);
      const updatedImage = await apiClient.updateMediaImage(currentImage.id, {
        title: editTitle,
        description: editDesc,
      });
      setIsEditing(false);
      onImageUpdate?.({ ...currentImage, ...updatedImage });
      addToast({ text: 'Image details saved', type: 'success' });
    } catch (e) {
      console.error(e);
      addToast({
        text: e instanceof Error ? e.message : 'Error saving changes',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
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
      if (isAdmin && e.key.toLowerCase() === 'e') {
        setShowSidebar(true);
        setIsEditing(true);
      }
      if (isAdmin && e.key.toLowerCase() === 'r' && !isSaving) {
        void handleRotate('right');
      }
    },
    [handleNext, handlePrev, handleRotate, isAdmin, isSaving, onClose],
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

  const metadata = currentImage.metadata || {};
  const aiVisualValue = metadata['ai_visual'];
  const aiVisual =
    aiVisualValue && typeof aiVisualValue === 'object' && !Array.isArray(aiVisualValue)
      ? (aiVisualValue as Record<string, unknown>)
      : null;
  const provenanceValue = metadata['provenance'];
  const provenance =
    provenanceValue && typeof provenanceValue === 'object' && !Array.isArray(provenanceValue)
      ? (provenanceValue as Record<string, unknown>)
      : null;
  const catalogContextValue = metadata['catalog_context'];
  const catalogContext =
    catalogContextValue &&
    typeof catalogContextValue === 'object' &&
    !Array.isArray(catalogContextValue)
      ? (catalogContextValue as Record<string, unknown>)
      : null;
  const sourcePageValue = Number(metadata['source_page']);
  const sourcePage =
    Number.isInteger(sourcePageValue) && sourcePageValue > 0 ? sourcePageValue : null;
  const sourceObject = metadata['source_pdf_object_number'];
  const sourceDocumentHash =
    typeof metadata['source_document_sha256'] === 'string'
      ? metadata['source_document_sha256']
      : null;
  const sourceVerified =
    currentImage.verificationStatus === 'source_verified' &&
    provenance?.['status'] === 'exact_source_object';
  const visualClassification =
    typeof metadata['visual_classification'] === 'string'
      ? humanizeMetadataValue(metadata['visual_classification'])
      : null;
  const aiDescription =
    typeof aiVisual?.['description'] === 'string' ? aiVisual['description'] : null;
  const aiSummary = typeof aiVisual?.['summary'] === 'string' ? aiVisual['summary'] : null;
  const aiReviewState =
    typeof aiVisual?.['reviewState'] === 'string' ? aiVisual['reviewState'] : 'unreviewed';
  const aiModel =
    typeof aiVisual?.['model'] === 'string' ? aiVisual['model'] : 'visual analysis pipeline';
  const metadataSourceCollection =
    typeof metadata['source_collection'] === 'string'
      ? metadata['source_collection']
      : typeof metadata['sourceCollection'] === 'string'
        ? metadata['sourceCollection']
        : null;
  const sourceCollection = metadataSourceCollection || currentImage.albumName || null;
  const priorCollection =
    typeof catalogContext?.['previousAlbumName'] === 'string'
      ? catalogContext['previousAlbumName']
      : null;
  const fallbackContext = `${visualClassification || 'Archival image'} catalogued${sourceCollection ? ` in ${sourceCollection}` : ' in the media archive'}.`;
  const primaryDescription =
    aiSummary || aiDescription || currentImage.description || fallbackContext;
  const hasCaptureMetadata = Boolean(
    currentImage.dateTaken ||
    currentImage.cameraMake ||
    currentImage.cameraModel ||
    currentImage.lens ||
    currentImage.focalLength ||
    currentImage.aperture ||
    currentImage.shutterSpeed ||
    currentImage.iso,
  );

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
          <Flex align="center" gap="md" className={styles.toolbarLeft}>
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

          <Flex align="center" gap="sm" className={styles.toolbarActions}>
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
                disabled={isSaving}
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
        <Stack gap="lg" className={styles.sidebarContent}>
          <Stack gap="md" className={styles.identityBlock}>
            <Flex justify="between" align="start">
              <Stack gap="xs" className={styles.identityText}>
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
                  <Stack gap="xs">
                    <LqText variant="body" weight="bold">
                      {currentImage.title || currentImage.filename}
                    </LqText>
                    <LqText variant="xxs" color="muted" className={styles.filenameText}>
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
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </Button>
                <Button variant="glass" size="sm" onClick={() => setIsEditing(false)}>
                  <Icon name="X" size="sm" />
                </Button>
              </Flex>
            )}
          </Stack>

          <Stack gap="sm" className={styles.primarySection}>
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="AlignLeft" size="sm" />
              </Box>
              <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                Context
              </LqText>
            </Flex>
            <Surface variant="glass-highlight" p="md" className={styles.contextCard}>
              <Stack gap="sm">
                <Flex gap="xs" align="center" wrap="wrap" className={styles.contextBadges}>
                  {sourceCollection ? (
                    <Badge tone="accent" label={sourceCollection} title="Current collection" />
                  ) : null}
                  {visualClassification ? (
                    <Badge
                      tone="neutral"
                      label={visualClassification}
                      title="Machine-assigned visual type"
                    />
                  ) : null}
                  {aiDescription ? (
                    <Badge
                      tone={aiReviewState === 'accepted' ? 'success' : 'warning'}
                      label={`AI · ${humanizeMetadataValue(aiReviewState)}`}
                      title={
                        aiReviewState === 'accepted'
                          ? `Reviewed visual analysis from ${aiModel}`
                          : `Unreviewed visual analysis from ${aiModel}`
                      }
                    />
                  ) : null}
                </Flex>
                {isEditing ? (
                  <TextArea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={5}
                    className={styles.textarea}
                  />
                ) : (
                  <LqText variant="small" color="muted" className={styles.contextText}>
                    {primaryDescription}
                  </LqText>
                )}
                {priorCollection && priorCollection !== sourceCollection ? (
                  <LqText variant="xxs" color="muted">
                    Previous collection: {priorCollection}
                  </LqText>
                ) : null}
              </Stack>
            </Surface>
          </Stack>

          {currentImage.documentId && (
            <Stack gap="sm" className={styles.primarySection}>
              <Flex align="center" gap="sm">
                <Box className={styles.sectionIcon}>
                  <Icon name="FileSearch" size="sm" />
                </Box>
                <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                  Source record
                </LqText>
              </Flex>
              <Surface variant="glass-highlight" p="md">
                <Stack gap="sm">
                  <Flex gap="xs" align="center" wrap="wrap">
                    <Badge
                      tone={sourceVerified ? 'success' : 'warning'}
                      label={sourceVerified ? 'Source matched' : 'Location incomplete'}
                      title={
                        sourceVerified
                          ? 'The extraction and source position match. This does not verify depicted people or events.'
                          : 'The source document is known, but the exact PDF object position is incomplete.'
                      }
                    />
                  </Flex>
                  <Button
                    variant="glass-highlight"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/documents/${encodeURIComponent(String(currentImage.documentId))}${sourcePage ? `?page=${sourcePage}` : ''}`,
                        { state: backLinkState },
                      )
                    }
                    className={styles.provenanceLink}
                  >
                    <Icon name="FileImage" size="sm" />
                    <span className={styles.provenanceLinkText}>
                      {currentImage.metadata?.['source_document']
                        ? String(currentImage.metadata['source_document'])
                        : `Document ID: ${currentImage.documentId}`}
                    </span>
                  </Button>
                  <HIGSettingsGroup>
                    {sourceCollection ? (
                      <HIGSettingsRow label="Collection" value={sourceCollection} />
                    ) : null}
                    <HIGSettingsRow
                      label="Page"
                      value={sourcePage ? String(sourcePage) : 'Unknown'}
                    />
                    <HIGSettingsRow
                      label="PDF object"
                      value={sourceObject == null ? 'Unknown' : String(sourceObject)}
                    />
                  </HIGSettingsGroup>
                </Stack>
              </Surface>
            </Stack>
          )}

          <Stack gap="sm" className={styles.indexSection}>
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="Tag" size="sm" />
              </Box>
              <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
                Index terms
              </LqText>
            </Flex>
            <TagSelector
              selectedTags={imageTags}
              onTagsChange={setImageTags}
              mediaId={currentImage.id}
              isAdmin={isAdmin}
              onTagClick={(tag) => {
                onClose();
                navigate(`/media?tagId=${tag.id}`, { state: backLinkState });
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
                navigate(`/media?personId=${person.id}`, { state: backLinkState });
              }
            }}
          />

          <Stack gap="sm" className={styles.technicalSection}>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setShowTechnicalDetails((visible) => !visible)}
              aria-expanded={showTechnicalDetails}
              className={styles.technicalToggle}
            >
              <Icon name="SlidersHorizontal" size="sm" />
              <span>Technical details</span>
              <Icon name={showTechnicalDetails ? 'ChevronUp' : 'ChevronDown'} size="sm" />
            </Button>

            {showTechnicalDetails ? (
              <Stack gap="md" className={styles.technicalContent}>
                <HIGSettingsGroup>
                  <HIGSettingsRow label="Format" value={currentImage.format || 'Unknown'} />
                  <HIGSettingsRow label="Size" value={formatFileSize(currentImage.fileSize)} />
                  <HIGSettingsRow
                    label="Dimensions"
                    value={
                      currentImage.width && currentImage.height
                        ? `${currentImage.width} × ${currentImage.height}`
                        : 'Unknown'
                    }
                  />
                  <HIGSettingsRow
                    label="Catalogued"
                    value={formatDate(currentImage.dateAdded || currentImage.created_at)}
                  />
                  {sourceDocumentHash ? (
                    <HIGSettingsRow
                      label="Source hash"
                      value={`${sourceDocumentHash.slice(0, 16)}…`}
                      isMono
                    />
                  ) : null}
                </HIGSettingsGroup>

                {hasCaptureMetadata ? (
                  <HIGSettingsGroup>
                    {currentImage.dateTaken ? (
                      <HIGSettingsRow label="Captured" value={formatDate(currentImage.dateTaken)} />
                    ) : null}
                    {currentImage.cameraMake || currentImage.cameraModel ? (
                      <HIGSettingsRow
                        label="Camera"
                        value={[currentImage.cameraMake, currentImage.cameraModel]
                          .filter(Boolean)
                          .join(' ')}
                      />
                    ) : null}
                    {currentImage.lens ? (
                      <HIGSettingsRow label="Lens" value={currentImage.lens} />
                    ) : null}
                    {currentImage.focalLength ? (
                      <HIGSettingsRow label="Focal length" value={currentImage.focalLength} />
                    ) : null}
                    {currentImage.aperture ? (
                      <HIGSettingsRow label="Aperture" value={currentImage.aperture} />
                    ) : null}
                    {currentImage.shutterSpeed ? (
                      <HIGSettingsRow label="Shutter" value={currentImage.shutterSpeed} />
                    ) : null}
                    {currentImage.iso ? (
                      <HIGSettingsRow label="ISO" value={String(currentImage.iso)} />
                    ) : null}
                  </HIGSettingsGroup>
                ) : null}

                {currentImage.latitude && currentImage.longitude ? (
                  <Box className={styles.mapContainer}>
                    <LocationMap
                      latitude={currentImage.latitude}
                      longitude={currentImage.longitude}
                      title="Capture coordinates"
                    />
                  </Box>
                ) : null}
              </Stack>
            ) : null}
          </Stack>
        </Stack>
      </Surface>
    </Box>,
    document.body,
  );
};

export default MediaViewerModal;
