import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Shield,
  Share2,
  Check,
} from 'lucide-react';
import { TranscriptSegment, Chapter } from './AudioPlayer'; // Reuse types
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

interface VideoPlayerProps {
  src: string;
  title: string;
  transcript?: TranscriptSegment[];
  chapters?: Chapter[];
  onClose?: () => void;
  autoPlay?: boolean;
  isSensitive?: boolean;
  warningText?: string;
  documentId?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  transcript = [],
  chapters = [],
  onClose,
  autoPlay = false,
  isSensitive = false,
  warningText = 'This content contains graphic descriptions of violence, sexual assault, child exploitation and murder.',
  documentId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // const _navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('video-player-show-transcript')
          : null;
      if (saved !== null) return saved === 'true';
      // Default closed on mobile where sidebar can crowd controls
      if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
      return true;
    } catch {
      return false;
    }
  });
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [showChapters, setShowChapters] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showFullTranscriptOverlay, setShowFullTranscriptOverlay] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastInteractionRef = useRef<number>(0);
  const [showCopied, setShowCopied] = useState(false);
  const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);
  const overlaySearchInputRef = useRef<HTMLInputElement | null>(null);
  useScrollLock(showFullTranscriptOverlay);

  // In-player transcript search state
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const normalizedTranscriptQuery = React.useMemo(
    () => transcriptSearch.trim().toLowerCase(),
    [transcriptSearch],
  );

  const transcriptMatches = React.useMemo(() => {
    if (!normalizedTranscriptQuery || !Array.isArray(transcript)) return [] as number[];
    return transcript
      .map((seg, index) => ({
        index,
        text: `${seg.text || ''} ${seg.speaker || ''}`.toLowerCase(),
      }))
      .filter(({ text }) => text.includes(normalizedTranscriptQuery))
      .map(({ index }) => index);
  }, [transcript, normalizedTranscriptQuery]);

  const [prevNormalizedQuery, setPrevNormalizedQuery] = useState(normalizedTranscriptQuery);
  const [prevMatchesLength, setPrevMatchesLength] = useState(transcriptMatches.length);
  if (
    normalizedTranscriptQuery !== prevNormalizedQuery ||
    transcriptMatches.length !== prevMatchesLength
  ) {
    setPrevNormalizedQuery(normalizedTranscriptQuery);
    setPrevMatchesLength(transcriptMatches.length);
    setCurrentMatchIndex(0);
  }

  const [hasRevealed, setHasRevealed] = useState(!isSensitive);

  // Toggle transcript visibility and persist preference
  const toggleTranscript = () => {
    setShowTranscript((prev) => {
      const newValue = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('video-player-show-transcript', String(newValue));
        }
      } catch {
        // ignore storage errors
      }
      return newValue;
    });
  };

  const handleShare = () => {
    try {
      const url = new URL(window.location.href);
      // Encode current playback position so shared links restore time.
      url.searchParams.set('t', Math.floor(currentTime).toString());
      if (documentId != null) {
        url.searchParams.set('id', String(documentId));
      }
      navigator.clipboard.writeText(url.toString()).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      });
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  const [prevIsSensitive, setPrevIsSensitive] = useState(isSensitive);
  if (isSensitive !== prevIsSensitive) {
    setPrevIsSensitive(isSensitive);
    setHasRevealed(!isSensitive);
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.playbackRate = playbackRate;
      if (autoPlay && !isSensitive) {
        videoRef.current.play().catch((e) => console.warn('Autoplay failed:', e));
      }
    }
  }, [autoPlay, isSensitive, playbackRate, volume]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      if (transcript.length > 0) {
        const index = transcript.findIndex((seg) => time >= seg.start && time < seg.end);
        if (index !== -1 && index !== activeSegmentIndex) {
          setActiveSegmentIndex(index);
          scrollToSegment(index);
        }
      }
    }
  };

  const scrollToSegment = (index: number) => {
    if (transcriptRef.current && transcriptRef.current.parentElement) {
      const container = transcriptRef.current.parentElement;
      const element = transcriptRef.current.children[index] as HTMLElement;

      if (element) {
        const offset = element.offsetTop - container.offsetTop;

        container.scrollTo({
          top: offset - container.clientHeight / 2 + element.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  };

  const scrollOverlayToSegment = (index: number) => {
    if (!overlayRef.current) return;
    const element = overlayRef.current.children[index] as HTMLElement;
    if (element) {
      overlayRef.current.scrollTo({
        top: element.offsetTop - overlayRef.current.clientHeight / 2 + element.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  };

  const seek = useCallback(
    (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(videoRef.current.currentTime);
      }
    },
    [duration],
  );

  const jumpToTranscriptMatch = useCallback(
    (nextIndex: number) => {
      if (!transcriptMatches.length) return;
      const wrapped = (nextIndex + transcriptMatches.length) % transcriptMatches.length;
      const segIndex = transcriptMatches[wrapped];
      const seg = transcript[segIndex];
      if (!seg) return;
      setCurrentMatchIndex(wrapped);
      seek(seg.start);
      scrollToSegment(segIndex);
      scrollOverlayToSegment(segIndex);
    },
    [transcriptMatches, transcript, seek, scrollOverlayToSegment],
  );

  const goToNextTranscriptMatch = useCallback(
    () => jumpToTranscriptMatch(currentMatchIndex + 1),
    [currentMatchIndex, jumpToTranscriptMatch],
  );
  const goToPrevTranscriptMatch = useCallback(
    () => jumpToTranscriptMatch(currentMatchIndex - 1),
    [currentMatchIndex, jumpToTranscriptMatch],
  );

  // Keyboard shortcuts for transcript navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!showTranscript && !showFullTranscriptOverlay) return;

      if (e.key === '/') {
        e.preventDefault();
        if (showFullTranscriptOverlay && overlaySearchInputRef.current) {
          overlaySearchInputRef.current.focus();
        } else if (sidebarSearchInputRef.current) {
          sidebarSearchInputRef.current.focus();
        }
        return;
      }

      if (e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        goToNextTranscriptMatch();
      } else if (e.key === 'N' || (e.key === 'n' && e.shiftKey)) {
        e.preventDefault();
        goToPrevTranscriptMatch();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTranscript, showFullTranscriptOverlay, goToNextTranscriptMatch, goToPrevTranscriptMatch]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleReveal = () => {
    setHasRevealed(true);
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    // Standard Request Method
    type VendorFullscreenElement = HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    type VendorFullscreenDocument = Document & {
      webkitExitFullscreen?: () => Promise<void>;
    };
    const el = containerRef.current as VendorFullscreenElement;
    const req =
      el.requestFullscreen.bind(el) ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (!document.fullscreenElement && req) {
      req.call(containerRef.current).catch((err: Error) => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as VendorFullscreenDocument).webkitExitFullscreen) {
      (document as VendorFullscreenDocument).webkitExitFullscreen?.();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div className="flex flex-col h-full surface-glass shadow-[var(--glass-shadow)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--glass-bg-strong)] border-b border-[var(--glass-border)] shrink-0">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-cyan-900/30 flex items-center justify-center text-[var(--accent)]">
              <Play size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] truncate" title={title}>
                {title}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {chapters.length > 0 ? `${chapters.length} chapters` : 'Video Recording'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-[var(--glass-bg)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Copy link"
            >
              {showCopied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
            </button>
            <button
              onClick={() => {
                setShowFullTranscriptOverlay(true);
                lastInteractionRef.current = Date.now();
                setTimeout(() => {
                  if (!overlayRef.current) return;
                  const idx = transcript.findIndex(
                    (seg) => currentTime >= seg.start && currentTime < seg.end,
                  );
                  const el = overlayRef.current.children[idx] as HTMLElement;
                  if (el)
                    overlayRef.current.scrollTo({
                      top: el.offsetTop - overlayRef.current.clientHeight / 2 + el.clientHeight / 2,
                      behavior: 'smooth',
                    });
                }, 50);
              }}
              className="px-3 py-1.5 surface-glass hover:bg-[var(--glass-bg-highlight)] text-xs text-[var(--accent)] rounded-full transition-colors flex items-center gap-2"
              title="Read full transcript overlay"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Read Full Transcript
            </button>
            {(transcript.length > 0 || chapters.length > 0) && (
              <button
                onClick={toggleTranscript}
                className="p-2 hover:bg-[var(--glass-bg)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title={showTranscript ? 'Hide transcript' : 'Show transcript'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            )}
            {onClose && (
              <CloseButton
                onClick={onClose}
                size="sm"
                label="Close video player"
                className="bg-transparent hover:bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Main Content (Video) */}
        <div
          ref={containerRef}
          className="flex-1 bg-[var(--glass-bg-strong)] relative flex items-center justify-center overflow-hidden group"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {/* Sensitive Content Warning Overlay */}
          {!hasRevealed && (
            <div className="absolute inset-0 z-50 bg-[var(--glass-bg)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/30">
                <Shield className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                Graphic Content Warning
              </h3>
              <p className="text-[var(--text-muted)] max-w-md mb-8 leading-relaxed">
                {warningText}
              </p>
              <div className="flex gap-4">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] text-[var(--text-secondary)] transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleReveal}
                  className="px-6 py-2 rounded-[var(--radius-lg)] bg-red-600 hover:bg-red-500 text-[var(--text-primary)] font-medium shadow-[var(--glass-shadow)] shadow-red-900/20 transition-all hover:scale-105"
                >
                  Reveal & Play
                </button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onEnded={() => {
              setIsPlaying(false);
              setShowControls(true);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              setShowControls(true);
            }}
            onClick={togglePlay}
          />

          {/* Video Controls Overlay */}
          <div
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Progress Bar with Chapters */}
            <div className="mb-4 relative group/progress">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] appearance-none cursor-pointer accent-cyan-500 hover:h-2 transition-all"
              />
              {/* Chapter Markers */}
              {chapters.map((chapter, i) => (
                <div
                  key={i}
                  className="absolute top-0 w-0.5 h-1.5 bg-yellow-500 hover:bg-[var(--text-primary)] cursor-pointer z-10 transition-colors"
                  style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                  title={chapter.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    seek(chapter.startTime);
                  }}
                />
              ))}
              <div className="flex justify-between text-xs text-[var(--text-secondary)] font-mono mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" />
                  )}
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (videoRef.current) videoRef.current.muted = !isMuted;
                    }}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value);
                    }}
                    className="w-0 overflow-hidden group-hover/vol:w-20 transition-all h-1 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="text-sm text-[var(--text-primary)] truncate max-w-[200px]">
                  {/* Current Chapter Display */}
                  {chapters.length > 0 && (
                    <span className="opacity-80">
                      {
                        chapters
                          .slice()
                          .reverse()
                          .find((c) => currentTime >= c.startTime)?.title
                      }
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-[var(--glass-bg-highlight)] rounded px-1">
                  {[0.5, 1, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (videoRef.current) videoRef.current.playbackRate = rate;
                      }}
                      className={`px-2 py-0.5 text-xs rounded ${playbackRate === rate ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (Transcript/Chapters) */}
        {(transcript.length > 0 || chapters.length > 0) && (
          <div
            className={`fixed md:relative inset-0 md:inset-auto z-40 md:z-0 md:w-80 border-l border-[var(--glass-border)] bg-[var(--glass-bg-strong)] md:bg-[var(--glass-bg-strong)]/30 flex flex-col transition-transform duration-300 ${showTranscript ? 'translate-x-0' : 'translate-x-full md:hidden'} md:translate-x-0 shrink-0`}
          >
            <div className="flex border-b border-[var(--glass-border)] shrink-0">
              <button
                onClick={() => setShowChapters(false)}
                className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${!showChapters ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--glass-bg)]/50' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
              >
                Transcript
              </button>
              {chapters.length > 0 && (
                <button
                  onClick={() => setShowChapters(true)}
                  className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${showChapters ? 'text-[var(--accent)] border-b-2 border-[var(--accent)] bg-[var(--glass-bg)]/50' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                >
                  Chapters
                </button>
              )}
              <CloseButton
                onClick={() => setShowTranscript(false)}
                size="sm"
                label="Close transcript panel"
                className="md:hidden mr-2 bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent max-h-[40vh] md:max-h-none">
              {!showChapters ? (
                <>
                  {transcript.length > 0 && (
                    <div className="sticky top-0 z-10 bg-[var(--glass-bg-strong)]/95 px-3 py-2 border-b border-[var(--glass-border)] flex items-center gap-2">
                      <input
                        ref={sidebarSearchInputRef}
                        type="text"
                        value={transcriptSearch}
                        onChange={(e) => {
                          setTranscriptSearch(e.target.value);
                          lastInteractionRef.current = Date.now();
                        }}
                        placeholder="Search in transcript…"
                        className="flex-1 surface-glass rounded text-[var(--text-primary)] text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-slate-500"
                      />
                      {normalizedTranscriptQuery && (
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                          <span>
                            {transcriptMatches.length
                              ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                              : '0/0'}
                          </span>
                          <button
                            type="button"
                            onClick={goToPrevTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className="px-1 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={goToNextTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className="px-1 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={transcriptRef} className="flex flex-col">
                    {transcript.length > 0 ? (
                      transcript.map((seg, i) => {
                        const isMatch =
                          !!normalizedTranscriptQuery && transcriptMatches.includes(i);
                        const isCurrent = isMatch && transcriptMatches[currentMatchIndex] === i;
                        return (
                          <button
                            key={i}
                            onClick={() => seek(seg.start)}
                            className={`p-4 text-left border-b border-[var(--glass-border)] transition-colors hover:bg-[var(--glass-bg)]/50 ${
                              activeSegmentIndex === i ? 'bg-cyan-900/20' : ''
                            } ${isCurrent ? 'ring-1 ring-amber-400 border-amber-400' : ''} ${
                              !isCurrent && isMatch ? 'border-amber-500/60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-[var(--text-muted)]">
                                {formatTime(seg.start)}
                              </span>
                              {seg.speaker && (
                                <span className="text-xs font-bold text-[var(--text-secondary)]">
                                  {seg.speaker}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-sm leading-relaxed ${
                                activeSegmentIndex === i
                                  ? 'text-[var(--text-primary)]'
                                  : 'text-[var(--text-muted)]'
                              }`}
                            >
                              {seg.text}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                        No transcript available.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col">
                  {chapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => seek(chapter.startTime)}
                      className={`p-4 text-left border-b border-[var(--glass-border)] flex items-center gap-3 hover:bg-[var(--glass-bg)]/50 group`}
                    >
                      <div className="text-xs font-mono text-[var(--text-muted)] w-12">
                        {formatTime(chapter.startTime)}
                      </div>
                      <div className="flex-1 text-sm text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                        {chapter.title}
                      </div>
                      <Play
                        size={12}
                        className="opacity-0 group-hover:opacity-100 text-[var(--accent)]"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {showFullTranscriptOverlay && (
        <div className="fixed inset-0 z-[1300] bg-[var(--glass-bg-strong)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] surface-glass shadow-[var(--glass-shadow)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 bg-[var(--glass-bg-strong)] border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="px-3 py-1 rounded bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] text-xs"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) videoRef.current.muted = !isMuted;
                  }}
                  className="px-3 py-1 rounded bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] text-xs"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
              <CloseButton
                onClick={() => setShowFullTranscriptOverlay(false)}
                size="sm"
                label="Close full transcript"
                className="bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 bg-[var(--glass-bg-strong)]/80 border-b border-[var(--glass-border)] flex items-center gap-2">
                <input
                  ref={overlaySearchInputRef}
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => {
                    setTranscriptSearch(e.target.value);
                    lastInteractionRef.current = Date.now();
                  }}
                  placeholder="Search in transcript…"
                  className="flex-1 surface-glass rounded text-[var(--text-primary)] text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder-slate-500"
                />
                {normalizedTranscriptQuery && (
                  <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <span>
                      {transcriptMatches.length
                        ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                        : '0/0'}
                    </span>
                    <button
                      type="button"
                      onClick={goToPrevTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className="px-1 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={goToNextTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className="px-1 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
              <div
                ref={overlayRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                onScroll={() => {
                  lastInteractionRef.current = Date.now();
                }}
                onWheel={() => {
                  lastInteractionRef.current = Date.now();
                }}
                onTouchMove={() => {
                  lastInteractionRef.current = Date.now();
                }}
              >
                {transcript.map((seg, i) => {
                  const isMatch = !!normalizedTranscriptQuery && transcriptMatches.includes(i);
                  const isCurrent = isMatch && transcriptMatches[currentMatchIndex] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => seek(seg.start)}
                      className={`w-full text-left p-3 rounded border border-[var(--glass-border)] hover:bg-[var(--glass-bg)]/50 transition-colors ${
                        currentTime >= seg.start && currentTime < seg.end ? 'bg-cyan-900/20' : ''
                      } ${isCurrent ? 'ring-1 ring-amber-400 border-amber-400' : ''} ${
                        !isCurrent && isMatch ? 'border-amber-500/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                          {formatTime(seg.start)}
                        </span>
                        {seg.speaker && (
                          <span className="text-xs font-bold text-[var(--text-secondary)]">
                            {seg.speaker}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{seg.text}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
