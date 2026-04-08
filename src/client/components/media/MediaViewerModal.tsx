import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Camera,
  Tag,
  FileImage,
  Maximize2,
  Minimize2,
  Edit2,
  Check,
  Save,
  RotateCw,
} from 'lucide-react';
import { MediaImage } from '../../types/media.types';
import Icon from '../common/Icon';
import { useAuth } from '../../contexts/AuthContext';
import LocationMap from '../visualizations/LocationMap';
import TagSelector, { TagData } from '../common/TagSelector';
import PeopleSelector, { PersonData } from '../entities/PeopleSelector';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import { cn } from '@client/utils/cn';
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
        console.error('Failed to rotate image');
        return;
      }
      const updatedImage = await res.json();
      setJustRotated(true);
      onImageUpdate?.({ ...currentImage, ...updatedImage });
      setImageLoading(true);
      setImageVersion((v) => v + 1);
      setRotation(0);
    } catch (e) {
      console.error('Error rotating image:', e);
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
      if (!res.ok) {
        console.error('Failed to save');
        alert('Failed to save changes');
        return;
      }
      setIsEditing(false);
      onImageUpdate?.({ ...currentImage, title: editTitle, description: editDesc });
    } catch (e) {
      console.error('Error saving:', e);
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
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;
        return;
      }

      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'i') setShowSidebar((prev) => !prev);
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
    window.history.replaceState({}, '', url);
  }, [currentImage]);

  if (!currentImage) return null;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
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
    <div id="MediaViewerModal" className={styles.overlay}>
      <div
        className={cn(
          styles.mainPanel,
          showSidebar ? styles.mainPanelShifted : styles.mainPanelFull,
        )}
      >
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <CloseButton
              onClick={onClose}
              size="sm"
              label="Close media viewer"
              className={styles.controlButton}
            />
            <div className={styles.toolbarMeta}>
              <h2 className={styles.toolbarTitle}>{currentImage.title}</h2>
              <p className={styles.toolbarCounter}>
                {currentIndex + 1} / {images.length}
              </p>
            </div>
          </div>

          <div className={styles.toolbarActions}>
            <button onClick={handleShare} className={styles.iconButton} title="Copy Link">
              {showCopied ? (
                <Check size={20} className={styles.successIcon} />
              ) : (
                <Icon name="Share2" size="sm" className={styles.shareIcon} />
              )}
            </button>
            <button onClick={() => setIsZoomed(!isZoomed)} className={styles.iconButton}>
              {isZoomed ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            {isAdmin && (
              <button
                onClick={() => handleRotate('right')}
                className={styles.iconButton}
                title="Rotate 90° CW"
              >
                <RotateCw size={20} />
              </button>
            )}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={cn(
                styles.iconButton,
                showSidebar ? styles.iconButtonActive : styles.iconButtonIdle,
              )}
            >
              <Info size={20} />
            </button>
          </div>
        </div>

        {currentIndex > 0 && (
          <button onClick={handlePrev} className={cn(styles.navButton, styles.navButtonLeft)}>
            <ChevronLeft size={32} className={styles.navIconLeft} />
          </button>
        )}
        {currentIndex < images.length - 1 && (
          <button onClick={handleNext} className={cn(styles.navButton, styles.navButtonRight)}>
            <ChevronRight size={32} className={styles.navIconRight} />
          </button>
        )}

        <div
          className={styles.imageStage}
          onClick={() => setShowSidebar(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imageLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
            </div>
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
        </div>
      </div>

      <div
        className={cn(styles.sidebar, showSidebar ? styles.sidebarVisible : styles.sidebarHidden)}
      >
        <div className={styles.sidebarContent}>
          <div>
            {isEditing ? (
              <div className={styles.editSection}>
                <label className={styles.sectionLabel}>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={styles.textInput}
                />
              </div>
            ) : (
              <>
                <div className={styles.sidebarHeader}>
                  <h3 className={styles.sidebarTitle}>{currentImage.title}</h3>
                  <div className={styles.sidebarHeaderActions}>
                    {isAdmin && (
                      <button onClick={() => setIsEditing(true)} className={styles.editButton}>
                        <Edit2 size={16} />
                      </button>
                    )}
                    <CloseButton
                      onClick={() => setShowSidebar(false)}
                      size="sm"
                      label="Close media details"
                      className={styles.sidebarCloseButton}
                    />
                  </div>
                </div>
                <p className={styles.filename} title={currentImage.filename}>
                  {currentImage.filename}
                </p>
              </>
            )}
          </div>

          {isEditing && (
            <div className={styles.editActions}>
              <button onClick={handleSave} className={styles.saveButton}>
                <Save size={16} /> Save Changes
              </button>
              <button onClick={() => setIsEditing(false)} className={styles.cancelButton}>
                <X size={16} />
              </button>
            </div>
          )}

          <div className={styles.section}>
            <h4 className={styles.sectionHeading}>File Information</h4>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoLabelRow}>
                  <FileImage size={14} />
                  <span className={styles.infoLabel}>Size</span>
                </div>
                <div className={styles.infoValue}>{formatFileSize(currentImage.fileSize)}</div>
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoLabelRow}>
                  <Tag size={14} />
                  <span className={styles.infoLabel}>Type</span>
                </div>
                <div className={cn(styles.infoValue, styles.infoValueUppercase)}>
                  {currentImage.format}
                </div>
              </div>
            </div>
          </div>

          {(currentImage.description || isEditing) && (
            <div className={styles.sectionCompact}>
              <h4 className={styles.sectionHeading}>Description</h4>
              {isEditing ? (
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={6}
                  className={styles.textarea}
                />
              ) : (
                <p className={styles.description}>{currentImage.description}</p>
              )}
            </div>
          )}

          <div className={styles.section}>
            <h4 className={styles.sectionHeadingWithIcon}>
              <Camera size={14} /> Camera Details
            </h4>
            <div className={styles.exifList}>
              <div className={styles.exifRow}>
                <span className={styles.exifLabel}>Date Taken</span>
                <span className={styles.exifValue}>{formatDate(currentImage.dateTaken)}</span>
              </div>
              <div className={styles.exifRow}>
                <span className={styles.exifLabel}>Camera</span>
                <span className={styles.exifValue}>
                  {currentImage.cameraMake} {currentImage.cameraModel || 'Unknown'}
                </span>
              </div>
              <div className={styles.exifRow}>
                <span className={styles.exifLabel}>Resolution</span>
                <span className={styles.exifValue}>
                  {currentImage.width} x {currentImage.height}
                </span>
              </div>
              <div className={styles.miniStatGrid}>
                <div className={styles.miniStatCard}>
                  <div className={styles.miniStatLabel}>ISO</div>
                  <div className={styles.miniStatValue}>{currentImage.iso || '-'}</div>
                </div>
                <div className={styles.miniStatCard}>
                  <div className={styles.miniStatLabel}>Aperture</div>
                  <div className={styles.miniStatValue}>{currentImage.aperture || '-'}</div>
                </div>
                <div className={styles.miniStatCardWide}>
                  <div className={styles.miniStatLabel}>Shutter</div>
                  <div
                    className={styles.miniStatValueTruncate}
                    title={currentImage.shutterSpeed?.toString()}
                  >
                    {(() => {
                      const val = currentImage.shutterSpeed;
                      if (!val) return '-';
                      const num = Number(val);
                      if (Number.isNaN(num)) return val;
                      if (num >= 1) return `${Math.round(num * 10) / 10}s`;
                      if (num > 0) return `1/${Math.round(1 / num)}`;
                      return val;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {currentImage.latitude && currentImage.longitude && (
            <LocationMap
              latitude={currentImage.latitude}
              longitude={currentImage.longitude}
              title={currentImage.title || 'Photo Location'}
            />
          )}

          <div className={styles.sectionCompact}>
            <h4 className={styles.sectionHeadingWithIcon}>
              <Tag size={14} /> Tags
            </h4>
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
          </div>

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
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MediaViewerModal;
