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
  // Initialize sidebar state based on screen width to prevent it covering image on mobile
  const [showSidebar, setShowSidebar] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  );
  const [isZoomed, setIsZoomed] = useState(false);
  const navigate = useNavigate();

  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showCopied, setShowCopied] = useState(false);

  useScrollLock(true);

  const currentImage = images[currentIndex];

  // Helper to convert EXIF orientation to degrees
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

  useEffect(() => {
    if (currentImage) {
      setImageLoading(true);
      setEditTitle(currentImage.title || '');
      setEditDesc(currentImage.description || '');
      setIsEditing(false);
      // Skip rotation initialization if we just finished rotating
      if (justRotatedRef.current) {
        justRotatedRef.current = false;
        return;
      }
      // Initialize rotation from saved orientation
      const initialRotation = getRotationFromOrientation(currentImage.orientation);
      setRotation(initialRotation);
      rotationRef.current = initialRotation;
    }
  }, [currentImage]);

  // Local rotation state (for immediate feedback)
  // Using a ref to persist rotation value across component re-renders
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  // Flag to prevent re-initialization after successful rotation
  const justRotatedRef = useRef(false);
  const [imageLoading, setImageLoading] = useState(true);
  // Cache-buster version to force image refresh after rotation
  const [imageVersion, setImageVersion] = useState(0);

  // Touch gesture support
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
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Tags and people state
  const [imageTags, setImageTags] = useState<TagData[]>([]);
  const [imagePeople, setImagePeople] = useState<PersonData[]>([]);

  // Fetch tags and people when image changes
  // Handle screen resize to auto-manage sidebar visibility
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    };

    // Set initial state (redundant but safe)
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }

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
      // Optimistic update
      const newRotation = (rotationRef.current + (direction === 'right' ? 90 : -90)) % 360;
      setRotation(newRotation);
      rotationRef.current = newRotation;

      const res = await fetch(`/api/media/images/${currentImage.id}/rotate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });

      if (!res.ok) {
        // Revert on failure
        const revertedRotation = (rotationRef.current - (direction === 'right' ? 90 : -90)) % 360;
        setRotation(revertedRotation);
        rotationRef.current = revertedRotation;
        console.error('Failed to rotate image');
      } else {
        const updatedImage = await res.json();
        // Mark that we just rotated to prevent useEffect re-initialization
        justRotatedRef.current = true;

        // Create updated image with new data from server
        const newImage = { ...currentImage, ...updatedImage };

        // Notify parent of update to refresh grid/thumbnails
        if (onImageUpdate) {
          onImageUpdate(newImage);
        }

        // Set loading state to hide the transition
        setImageLoading(true);

        // Increment version to force image URL refresh (cache-bust)
        setImageVersion((v) => v + 1);

        // Reset CSS rotation since the new image source is physically rotated
        setRotation(0);
        rotationRef.current = 0;
      }
    } catch (e) {
      console.error('Error rotating image:', e);
      const revertedRotation = (rotationRef.current - (direction === 'right' ? 90 : -90)) % 360;
      setRotation(revertedRotation);
      rotationRef.current = revertedRotation;
    }
  };

  const handleSave = async () => {
    if (!currentImage) return;
    try {
      const res = await fetch(`/api/media/images/${currentImage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
        }),
      });

      if (res.ok) {
        // Optimistic update
        currentImage.title = editTitle;
        currentImage.description = editDesc;
        setIsEditing(false);

        // Notify parent
        if (onImageUpdate) {
          onImageUpdate({ ...currentImage });
        }
      } else {
        console.error('Failed to save');
        alert('Failed to save changes');
      }
    } catch (e) {
      console.error('Error saving:', e);
      alert('Error saving changes');
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts if the user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur(); // Allow Escape to blur input
          return;
        }
        // Allow arrow keys for text navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;

        // Don't trigger other shortcuts
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
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [handleKeyDown]);

  // Sync URL with current image
  useEffect(() => {
    if (currentImage) {
      const url = new URL(window.location.href);
      url.searchParams.set('photoId', currentImage.id.toString());
      window.history.replaceState({}, '', url);
    }
  }, [currentImage]);

  if (!currentImage) return null;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
    <div
      id="MediaViewerModal"
      className="fixed inset-0 z-[2000] bg-[var(--glass-bg-strong)] backdrop-blur-md flex overflow-hidden"
    >
      {/* Main Image Area */}
      <div
        className={`relative flex-1 flex flex-col h-full transition-all duration-300 ${showSidebar ? 'md:mr-80' : 'mr-0'}`}
      >
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start z-20 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4">
            <CloseButton
              onClick={onClose}
              size="sm"
              label="Close media viewer"
              className="bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)]"
            />
            <div className="text-[var(--text-primary)] drop-shadow-[var(--glass-shadow)]">
              <h2 className="font-semibold text-lg leading-tight truncate max-w-md">
                {currentImage.title}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {currentIndex + 1} / {images.length}
              </p>
            </div>
          </div>

          <div className="pointer-events-auto flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative border border-transparent hover:border-[var(--glass-border)]"
              title="Copy Link"
            >
              {showCopied ? (
                <Check size={20} className="text-green-400" />
              ) : (
                <Icon name="Share2" size="sm" className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 rounded-full bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--glass-border)]"
            >
              {isZoomed ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            {isAdmin && (
              <button
                onClick={() => handleRotate('right')}
                className="p-2 rounded-full bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--glass-border)]"
                title="Rotate 90° CW"
              >
                <RotateCw size={20} />
              </button>
            )}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-full hover:bg-[var(--app-bg)]/60 transition-colors border border-transparent hover:border-[var(--glass-border)] ${showSidebar ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--app-bg)]/40 text-[var(--text-secondary)]'}`}
            >
              <Info size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-20 group border border-transparent hover:border-[var(--glass-border)]"
          >
            <ChevronLeft size={32} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}
        {currentIndex < images.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-20 group border border-transparent hover:border-[var(--glass-border)]"
          >
            <ChevronRight size={32} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Image Container */}
        <div
          className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
          onClick={() => setShowSidebar(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-12 h-12 border-4 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={imageSrc}
            alt={currentImage.title}
            onLoad={() => setImageLoading(false)}
            className={`transition-all duration-300 ${isZoomed ? 'w-full h-full object-cover cursor-move' : 'max-w-full max-h-full object-contain'} ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
            style={{ transform: `rotate(${rotation}deg)` }}
            draggable={false}
          />
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 bottom-0 w-full md:w-80 bg-[var(--glass-bg-strong)] border-l border-[var(--glass-border)] transition-transform duration-300 ease-in-out z-30 overflow-y-auto ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 space-y-8">
          {/* Header */}
          <div>
            {isEditing ? (
              <div className="mb-4 space-y-2">
                <label className="text-xs text-[var(--text-muted)] uppercase font-bold">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[var(--radius-md)] px-3 py-2 focus:ring-2 focus:ring-[var(--accent)] outline-none"
                />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 break-words">
                    {currentImage.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent)]"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <CloseButton
                      onClick={() => setShowSidebar(false)}
                      size="sm"
                      label="Close media details"
                      className="md:hidden bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    />
                  </div>
                </div>
                <p
                  className="text-sm text-[var(--text-secondary)] truncate"
                  title={currentImage.filename}
                >
                  {currentImage.filename}
                </p>
              </>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--app-bg)] py-2 rounded-[var(--radius-md)] flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <Save size={16} /> Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-md)] border border-[var(--glass-border)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              File Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--glass-bg)] p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                  <FileImage size={14} />
                  <span className="text-xs">Size</span>
                </div>
                <div className="text-[var(--text-primary)] text-sm font-medium">
                  {formatFileSize(currentImage.fileSize)}
                </div>
              </div>
              <div className="bg-[var(--glass-bg)] p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-1">
                  <Tag size={14} />
                  <span className="text-xs">Type</span>
                </div>
                <div className="text-[var(--text-primary)] text-sm font-medium uppercase">
                  {currentImage.format}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {(currentImage.description || isEditing) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Description
              </h4>
              {isEditing ? (
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={6}
                  className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-sm leading-relaxed p-3 rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                />
              ) : (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--glass-bg)] p-3 rounded-[var(--radius-md)] border border-[var(--glass-border)]">
                  {currentImage.description}
                </p>
              )}
            </div>
          )}

          {/* EXIF Data */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
              <Camera size={14} /> Camera Details
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[var(--glass-border)] pb-2">
                <span className="text-[var(--text-secondary)]">Date Taken</span>
                <span className="text-[var(--text-primary)]">
                  {formatDate(currentImage.dateTaken)}
                </span>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-border)] pb-2">
                <span className="text-[var(--text-secondary)]">Camera</span>
                <span className="text-[var(--text-primary)]">
                  {currentImage.cameraMake} {currentImage.cameraModel || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[var(--glass-border)] pb-2">
                <span className="text-[var(--text-secondary)]">Resolution</span>
                <span className="text-[var(--text-primary)]">
                  {currentImage.width} x {currentImage.height}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="text-center bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1.5 rounded-[var(--radius-md)]">
                  <div className="text-[10px] text-[var(--text-muted)]">ISO</div>
                  <div className="text-xs text-[var(--text-primary)]">
                    {currentImage.iso || '-'}
                  </div>
                </div>
                <div className="text-center bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1.5 rounded-[var(--radius-md)]">
                  <div className="text-[10px] text-[var(--text-muted)]">Aperture</div>
                  <div className="text-xs text-[var(--text-primary)]">
                    {currentImage.aperture || '-'}
                  </div>
                </div>
                <div className="text-center bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1.5 rounded-[var(--radius-md)] w-full overflow-hidden">
                  <div className="text-[10px] text-[var(--text-muted)]">Shutter</div>
                  <div
                    className="text-xs text-[var(--text-primary)] truncate"
                    title={currentImage.shutterSpeed?.toString()}
                  >
                    {(() => {
                      const val = currentImage.shutterSpeed;
                      if (!val) return '-';
                      // Check if it's a number-like string or number
                      const num = Number(val);
                      if (isNaN(num)) return val;

                      // Format logic
                      if (num >= 1) return Math.round(num * 10) / 10 + 's';
                      if (num > 0) {
                        const inv = Math.round(1 / num);
                        return `1/${inv}`;
                      }
                      return val;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Map */}
          {currentImage.latitude && currentImage.longitude && (
            <LocationMap
              latitude={currentImage.latitude}
              longitude={currentImage.longitude}
              title={currentImage.title || 'Photo Location'}
            />
          )}

          {/* Tags Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
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

          {/* People in Photo Section */}
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
