import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Newspaper, Image, Music, Film, User } from 'lucide-react';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import { useAuth } from '../../contexts/AuthContext';
import { SEO } from '../common/SEO';

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
          const firstImageRes = await fetch(`/api/media/images?albumId=${albumId}&page=1&limit=1`);
          if (firstImageRes.ok) {
            const payload = await firstImageRes.json();
            const firstImageId = payload?.data?.[0]?.id;
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

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
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
      <div className="flex-none flex gap-2 border-b border-slate-800 bg-slate-900 px-4 pt-2 z-20 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent -mx-4 sm:mx-0">
        <button
          onClick={() => navigateToTab('photos')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'photos'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Image className="h-4 w-4" />
          <span className="font-medium text-sm">Images</span>
        </button>
        <button
          onClick={() => navigateToTab('audio')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'audio'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Music className="h-4 w-4" />
          <span className="font-medium text-sm">Audio</span>
        </button>
        <button
          onClick={() => navigateToTab('video')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'video'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Film className="h-4 w-4" />
          <span className="font-medium text-sm">Video</span>
        </button>
        <button
          onClick={() => navigateToTab('articles')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'articles'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Newspaper className="h-4 w-4" />
          <span className="font-medium text-sm">Articles</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => navigateToTab('faces')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
              activeSubTab === 'faces'
                ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            }`}
          >
            <User className="h-4 w-4" />
            <span className="font-medium text-sm">Faces (Admin)</span>
          </button>
        )}
      </div>

      {/* Content Area with isolation */}
      <div className="flex-grow relative min-h-0 bg-slate-950">
        <ScopedErrorBoundary>
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">
                    Decryption in progress...
                  </p>
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
