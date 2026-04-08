import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Newspaper, Image, Music, Film, User } from 'lucide-react';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { SEO } from '../common/SEO';
import { cn } from '@client/utils/cn';
import styles from './MediaAndArticlesTab.module.css';

// Lazy load the tabs to prevent crashes
const ArticlesTab = React.lazy(() => import('./ArticlesTab'));
const MediaTab = React.lazy(() => import('./MediaTab'));
const AudioTab = React.lazy(() => import('./AudioTab'));
const VideoTab = React.lazy(() => import('./VideoTab'));
const FaceGallery = React.lazy(() =>
  import('../faces/FaceGallery').then((m) => ({ default: m.FaceGallery })),
);

export const MediaAndArticlesTab: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [shareMetadata, setShareMetadata] = useState<{
    title: string;
    description: string;
    image?: string;
    imageAlt?: string;
  } | null>(null);

  // Determine active sub-tab from URL path
  const getActiveSubTab = (): 'articles' | 'photos' | 'audio' | 'video' | 'faces' => {
    if (location.pathname === '/media/articles') return 'articles';
    if (location.pathname === '/media/photos') return 'photos';
    if (location.pathname === '/media/audio') return 'audio';
    if (location.pathname === '/media/video') return 'video';
    if (location.pathname === '/media/faces') return 'faces';
    return 'photos'; // default
  };

  const activeSubTab = getActiveSubTab();
  const shareUrl = useMemo(
    () => `https://epstein.academy${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  // Redirect /media to /media/photos by default
  useEffect(() => {
    if (location.pathname === '/media') {
      const params = new URLSearchParams(location.search);
      const hasAudioHints = params.has('albumId') || params.has('id');
      navigate(hasAudioHints ? '/media/audio' : '/media/photos', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(location.search);
    const albumId = params.get('albumId');
    const mediaId = params.get('id') || params.get('photoId');

    const setDefault = () => {
      if (!cancelled) {
        setShareMetadata({
          title: 'Epstein Media Archive',
          description:
            'Explore photos, audio, and video records linked to the Epstein files archive.',
          image: 'https://epstein.academy/epstein-files.jpg',
          imageAlt: 'Epstein Files media archive',
        });
      }
    };

    const resolve = async () => {
      try {
        if (location.pathname === '/media/photos' && mediaId) {
          const imageUrl = `https://epstein.academy/api/media/images/${mediaId}/file`;
          setShareMetadata({
            title: `Epstein Photo ${mediaId}`,
            description: 'Shared image from the Epstein Files media archive.',
            image: imageUrl,
            imageAlt: `Epstein media image ${mediaId}`,
          });
          return;
        }

        if (location.pathname === '/media/audio' && mediaId) {
          setShareMetadata({
            title: `Epstein Audio ${mediaId}`,
            description: 'Shared audio record from the Epstein Files media archive.',
            image: `https://epstein.academy/api/media/audio/${mediaId}/thumbnail`,
            imageAlt: `Audio thumbnail ${mediaId}`,
          });
          return;
        }

        if (location.pathname === '/media/video' && mediaId) {
          setShareMetadata({
            title: `Epstein Video ${mediaId}`,
            description: 'Shared video record from the Epstein Files media archive.',
            image: `https://epstein.academy/api/media/video/${mediaId}/thumbnail`,
            imageAlt: `Video thumbnail ${mediaId}`,
          });
          return;
        }

        if (albumId) {
          if (location.pathname === '/media/video') {
            const firstVideoRes = await fetch(`/api/media/video?albumId=${albumId}&page=1&limit=1`);
            if (firstVideoRes.ok) {
              const payload = await firstVideoRes.json();
              const firstVideoId = payload?.mediaItems?.[0]?.id;
              if (firstVideoId) {
                setShareMetadata({
                  title: `Epstein Video Album ${albumId}`,
                  description: 'Shared video album from the Epstein Files archive.',
                  image: `https://epstein.academy/api/media/video/${firstVideoId}/thumbnail`,
                  imageAlt: `Video album ${albumId} preview`,
                });
                return;
              }
            }
          }

          const firstImageRes = await fetch(`/api/media/images?albumId=${albumId}&page=1&limit=1`);
          if (firstImageRes.ok) {
            const payload = await firstImageRes.json();
            const firstImageId = Array.isArray(payload) ? payload[0]?.id : payload?.data?.[0]?.id;
            if (firstImageId) {
              setShareMetadata({
                title: `Epstein Media Album ${albumId}`,
                description: 'Shared media album from the Epstein Files archive.',
                image: `https://epstein.academy/api/media/images/${firstImageId}/file`,
                imageAlt: `Album ${albumId} preview`,
              });
              return;
            }
          }
        }

        setDefault();
      } catch {
        setDefault();
      }
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  const navigateToTab = (tab: string) => {
    navigate(`/media/${tab}`);
  };

  const tabClassName = (tab: 'articles' | 'photos' | 'audio' | 'video' | 'faces') =>
    cn(styles.tabButton, activeSubTab === tab && styles.tabButtonActive);

  return (
    <div className={styles.container}>
      <SEO
        title={shareMetadata?.title || 'Epstein Media Archive'}
        description={
          shareMetadata?.description ||
          'Explore photos, audio, and video records linked to the Epstein files archive.'
        }
        image={shareMetadata?.image || 'https://epstein.academy/epstein-files.jpg'}
        imageAlt={shareMetadata?.imageAlt || 'Epstein media archive'}
        type="article"
        url={shareUrl}
        canonical={shareUrl}
        schema={{
          '@context': 'https://schema.org',
          '@type': 'MediaGallery',
          name: shareMetadata?.title || 'Epstein Media Archive',
          description:
            shareMetadata?.description ||
            'Photos, audio, and video records from the Epstein Files archive.',
          url: shareUrl,
        }}
      />
      {/* Sub-tab Navigation */}
      <div className={styles.tabBar}>
        <button onClick={() => navigateToTab('photos')} className={tabClassName('photos')}>
          <Image className={styles.tabIcon} />
          <span className={styles.tabLabel}>Images</span>
        </button>
        <button onClick={() => navigateToTab('audio')} className={tabClassName('audio')}>
          <Music className={styles.tabIcon} />
          <span className={styles.tabLabel}>Audio</span>
        </button>
        <button onClick={() => navigateToTab('video')} className={tabClassName('video')}>
          <Film className={styles.tabIcon} />
          <span className={styles.tabLabel}>Video</span>
        </button>
        <button onClick={() => navigateToTab('articles')} className={tabClassName('articles')}>
          <Newspaper className={styles.tabIcon} />
          <span className={styles.tabLabel}>Articles</span>
        </button>
        {isAdmin && (
          <button onClick={() => navigateToTab('faces')} className={tabClassName('faces')}>
            <User className={styles.tabIcon} />
            <span className={styles.tabLabel}>Faces (Admin)</span>
          </button>
        )}
      </div>

      {/* Content Area with isolation */}
      <div className={styles.contentArea}>
        <ScopedErrorBoundary>
          <Suspense
            fallback={
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingContent}>
                  <div className={styles.spinner} />
                  <p className={styles.loadingLabel}>Decryption in progress...</p>
                </div>
              </div>
            }
          >
            {activeSubTab === 'articles' && (
              <ScopedErrorBoundary>
                <ArticlesTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'photos' && (
              <ScopedErrorBoundary>
                <MediaTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'audio' && (
              <ScopedErrorBoundary>
                <AudioTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'video' && (
              <ScopedErrorBoundary>
                <VideoTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'faces' && isAdmin && (
              <ScopedErrorBoundary>
                <FaceGallery />
              </ScopedErrorBoundary>
            )}
          </Suspense>
        </ScopedErrorBoundary>
      </div>
    </div>
  );
};

export default MediaAndArticlesTab;
