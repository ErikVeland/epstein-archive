import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Icon from '@client/components/common/Icon';
import { TranscriptSegment, Chapter } from './AudioPlayer';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { Button, Input, SearchField, Surface } from '@client/design-system/lib';
import { cn } from '@client/utils/cn';
import styles from './VideoPlayer.module.css';

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
  const overlayRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const overlayScrollTimeoutRef = useRef<number | null>(null);
  const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);
  const overlaySearchInputRef = useRef<HTMLInputElement | null>(null);

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
  const [showFullTranscriptOverlay, setShowFullTranscriptOverlay] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [revealedSources, setRevealedSources] = useState<Record<string, boolean>>({});

  useScrollLock(showFullTranscriptOverlay);

  const normalizedTranscriptQuery = useMemo(
    () => transcriptSearch.trim().toLowerCase(),
    [transcriptSearch],
  );

  const transcriptMatches = useMemo(() => {
    if (!normalizedTranscriptQuery || !Array.isArray(transcript)) return [] as number[];
    return transcript
      .map((seg, index) => ({
        index,
        text: `${seg.text || ''} ${seg.speaker || ''}`.toLowerCase(),
      }))
      .filter(({ text }) => text.includes(normalizedTranscriptQuery))
      .map(({ index }) => index);
  }, [transcript, normalizedTranscriptQuery]);

  const hasRevealed = !isSensitive || !!revealedSources[src];

  const toggleTranscript = () => {
    setShowTranscript((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('video-player-show-transcript', String(next));
        }
      } catch {
        // Ignore storage failures so the player still works in restricted browsers.
      }
      return next;
    });
  };

  const handleShare = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('t', Math.floor(currentTime).toString());
      if (documentId != null) {
        url.searchParams.set('id', String(documentId));
      }
      navigator.clipboard.writeText(url.toString()).then(() => {
        setShowCopied(true);
        if (copyTimeoutRef.current !== null) {
          window.clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = window.setTimeout(() => setShowCopied(false), 2000);
      });
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.volume = volume;
    videoRef.current.playbackRate = playbackRate;
    if (autoPlay && !isSensitive) {
      videoRef.current.play().catch((e) => console.warn('Autoplay failed:', e));
    }
  }, [autoPlay, isSensitive, playbackRate, volume]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const scrollToSegment = useCallback((index: number) => {
    if (!transcriptRef.current?.parentElement) return;
    const container = transcriptRef.current.parentElement;
    const element = transcriptRef.current.children[index] as HTMLElement;
    if (!element) return;
    const offset = element.offsetTop - container.offsetTop;
    container.scrollTo({
      top: offset - container.clientHeight / 2 + element.clientHeight / 2,
      behavior: 'smooth',
    });
  }, []);

  const scrollOverlayToSegment = useCallback((index: number) => {
    if (!overlayRef.current) return;
    const element = overlayRef.current.children[index] as HTMLElement;
    if (!element) return;
    overlayRef.current.scrollTo({
      top: element.offsetTop - overlayRef.current.clientHeight / 2 + element.clientHeight / 2,
      behavior: 'smooth',
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    if (transcript.length === 0) return;
    const index = transcript.findIndex((seg) => time >= seg.start && time < seg.end);
    if (index !== -1 && index !== activeSegmentIndex) {
      setActiveSegmentIndex(index);
      scrollToSegment(index);
    }
  }, [transcript, activeSegmentIndex, scrollToSegment]);

  const seek = useCallback(
    (time: number) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(videoRef.current.currentTime);
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
    [
      transcriptMatches,
      transcript,
      seek,
      scrollToSegment,
      scrollOverlayToSegment,
      setCurrentMatchIndex,
    ],
  );

  const goToNextTranscriptMatch = useCallback(
    () => jumpToTranscriptMatch(currentMatchIndex + 1),
    [currentMatchIndex, jumpToTranscriptMatch],
  );
  const goToPrevTranscriptMatch = useCallback(
    () => jumpToTranscriptMatch(currentMatchIndex - 1),
    [currentMatchIndex, jumpToTranscriptMatch],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
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
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleReveal = () => {
    setRevealedSources((prev) => ({ ...prev, [src]: true }));
    if (!videoRef.current) return;
    videoRef.current.play().catch(console.error);
    setIsPlaying(true);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    type VendorFullscreenElement = HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };
    type VendorFullscreenDocument = Document & {
      webkitExitFullscreen?: () => Promise<void>;
    };

    const el = containerRef.current as VendorFullscreenElement;
    const requestFullscreen =
      el.requestFullscreen?.bind(el) ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen;

    if (!document.fullscreenElement && requestFullscreen) {
      requestFullscreen.call(containerRef.current).catch((err: Error) => {
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
    if (controlsTimeoutRef.current !== null) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const openFullTranscript = () => {
    setShowFullTranscriptOverlay(true);
    if (overlayScrollTimeoutRef.current !== null) {
      window.clearTimeout(overlayScrollTimeoutRef.current);
    }
    overlayScrollTimeoutRef.current = window.setTimeout(() => {
      if (!overlayRef.current) return;
      const index = transcript.findIndex(
        (seg) => currentTime >= seg.start && currentTime < seg.end,
      );
      const element = overlayRef.current.children[index] as HTMLElement;
      if (!element) return;
      overlayRef.current.scrollTo({
        top: element.offsetTop - overlayRef.current.clientHeight / 2 + element.clientHeight / 2,
        behavior: 'smooth',
      });
    }, 50);
  };

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (controlsTimeoutRef.current !== null) window.clearTimeout(controlsTimeoutRef.current);
      if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
      if (overlayScrollTimeoutRef.current !== null) {
        window.clearTimeout(overlayScrollTimeoutRef.current);
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);

  const currentChapterTitle =
    chapters.length > 0
      ? chapters
          .slice()
          .reverse()
          .find((chapter) => currentTime >= chapter.startTime)?.title
      : null;

  return (
    <Surface className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerInfo}>
            <div className={styles.headerIconBox}>
              <Icon name="Play" size="sm" />
            </div>
            <div className={styles.headerText}>
              <h3 className={styles.title} title={title}>
                {title}
              </h3>
              <p className={styles.subtitle}>
                {chapters.length > 0 ? `${chapters.length} chapters` : 'Video Recording'}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button unstyled onClick={handleShare} className={styles.iconButton} title="Copy link">
              {showCopied ? (
                <Icon name="Check" size="sm" className={styles.successIcon} />
              ) : (
                <Icon name="Share2" size="sm" />
              )}
            </Button>
            <Button
              onClick={openFullTranscript}
              variant="secondary"
              size="sm"
              className={styles.readButton}
              title="Read full transcript overlay"
            >
              <svg
                className={styles.readIconSmall}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Read Full Transcript
            </Button>
            {(transcript.length > 0 || chapters.length > 0) && (
              <Button
                unstyled
                onClick={toggleTranscript}
                className={styles.iconButton}
                title={showTranscript ? 'Hide transcript' : 'Show transcript'}
              >
                <svg
                  className={styles.readIcon}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </Button>
            )}
            {onClose && (
              <CloseButton
                onClick={onClose}
                size="sm"
                label="Close video player"
                className={styles.closeButton}
              />
            )}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div
          ref={containerRef}
          className={styles.playerShell}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
        >
          {!hasRevealed && (
            <div className={styles.warningOverlay}>
              <div className={styles.warningIconCircle}>
                <Icon name="Shield" className={styles.warningIcon} />
              </div>
              <h3 className={styles.warningTitle}>Graphic Content Warning</h3>
              <p className={styles.warningBody}>{warningText}</p>
              <div className={styles.warningActions}>
                {onClose && (
                  <Button unstyled onClick={onClose} className={styles.warningCancel}>
                    Cancel
                  </Button>
                )}
                <Button unstyled onClick={handleReveal} className={styles.warningReveal}>
                  Reveal &amp; Play
                </Button>
              </div>
            </div>
          )}

          <div className={styles.playerFrame}>
            <video
              ref={videoRef}
              src={src}
              className={styles.video}
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

            <div
              className={cn(
                styles.controlsOverlay,
                showControls ? styles.controlsVisible : styles.controlsHidden,
              )}
            >
              <div className={styles.progressGroup}>
                <Input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className={styles.progressInput}
                />
                {chapters.map((chapter, index) => (
                  <div
                    key={index}
                    className={styles.chapterMarker}
                    style={{ left: `${duration ? (chapter.startTime / duration) * 100 : 0}%` }}
                    title={chapter.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      seek(chapter.startTime);
                    }}
                  />
                ))}
                <div className={styles.timeRow}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className={styles.bottomControls}>
                <div className={styles.transportCluster}>
                  <Button unstyled onClick={togglePlay} className={styles.transportButton}>
                    {isPlaying ? (
                      <Icon name="Pause" size="lg" fill="currentColor" />
                    ) : (
                      <Icon name="Play" size="lg" fill="currentColor" />
                    )}
                  </Button>

                  <div className={styles.volumeCluster}>
                    <Button
                      unstyled
                      onClick={() => {
                        setIsMuted(!isMuted);
                        if (videoRef.current) videoRef.current.muted = !isMuted;
                      }}
                      className={styles.volumeButton}
                    >
                      {isMuted ? (
                        <Icon name="VolumeX" size="md" />
                      ) : (
                        <Icon name="Volume2" size="md" />
                      )}
                    </Button>
                    <Input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => {
                        const nextVolume = parseFloat(e.target.value);
                        setVolume(nextVolume);
                        if (videoRef.current) videoRef.current.volume = nextVolume;
                      }}
                      className={styles.volumeSlider}
                    />
                  </div>

                  <div className={styles.chapterLabel}>{currentChapterTitle}</div>
                </div>

                <div className={styles.rightControls}>
                  <div className={styles.rateGroup}>
                    {[0.5, 1, 1.5, 2].map((rate) => (
                      <Button
                        unstyled
                        key={rate}
                        onClick={() => {
                          setPlaybackRate(rate);
                          if (videoRef.current) videoRef.current.playbackRate = rate;
                        }}
                        className={cn(
                          styles.rateButton,
                          playbackRate === rate ? styles.rateButtonActive : styles.rateButtonIdle,
                        )}
                      >
                        {rate}x
                      </Button>
                    ))}
                  </div>

                  <Button unstyled onClick={toggleFullscreen} className={styles.fullscreenButton}>
                    {isFullscreen ? (
                      <Icon name="Minimize2" size="md" />
                    ) : (
                      <Icon name="Maximize2" size="md" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(transcript.length > 0 || chapters.length > 0) && (
          <div
            className={cn(
              styles.sidebar,
              showTranscript ? styles.sidebarOpen : styles.sidebarClosed,
            )}
          >
            <div className={styles.tabRow}>
              <Button
                unstyled
                onClick={() => setShowChapters(false)}
                className={cn(
                  styles.sidebarTab,
                  !showChapters ? styles.sidebarTabActive : styles.sidebarTabIdle,
                )}
              >
                Transcript
              </Button>
              {chapters.length > 0 && (
                <Button
                  unstyled
                  onClick={() => setShowChapters(true)}
                  className={cn(
                    styles.sidebarTab,
                    showChapters ? styles.sidebarTabActive : styles.sidebarTabIdle,
                  )}
                >
                  Chapters
                </Button>
              )}
              <CloseButton
                onClick={() => setShowTranscript(false)}
                size="sm"
                label="Close transcript panel"
                className={styles.sidebarClose}
              />
            </div>

            <div className={styles.sidebarBody}>
              {!showChapters ? (
                <>
                  {transcript.length > 0 && (
                    <div className={styles.searchSticky}>
                      <SearchField
                        ref={sidebarSearchInputRef}
                        value={transcriptSearch}
                        onChange={(e) => {
                          setTranscriptSearch(e.target.value);
                          setCurrentMatchIndex(0);
                        }}
                        placeholder="Search in transcript…"
                        className={styles.searchInput}
                        aria-label="Search transcript"
                      />
                      {normalizedTranscriptQuery && (
                        <div className={styles.searchMeta}>
                          <span>
                            {transcriptMatches.length
                              ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                              : '0/0'}
                          </span>
                          <Button
                            unstyled
                            type="button"
                            onClick={goToPrevTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className={styles.navMiniButton}
                          >
                            ↑
                          </Button>
                          <Button
                            unstyled
                            type="button"
                            onClick={goToNextTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className={styles.navMiniButton}
                          >
                            ↓
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={transcriptRef} className={styles.transcriptList}>
                    {transcript.length > 0 ? (
                      transcript.map((seg, index) => {
                        const isMatch =
                          !!normalizedTranscriptQuery && transcriptMatches.includes(index);
                        const isCurrent = isMatch && transcriptMatches[currentMatchIndex] === index;
                        return (
                          <Button
                            unstyled
                            key={index}
                            onClick={() => seek(seg.start)}
                            className={cn(
                              styles.segmentButton,
                              activeSegmentIndex === index && styles.segmentActive,
                              isCurrent && styles.segmentCurrentMatch,
                              !isCurrent && isMatch && styles.segmentMatch,
                            )}
                          >
                            <div className={styles.segmentHeader}>
                              <span className={styles.segmentTime}>{formatTime(seg.start)}</span>
                              {seg.speaker && (
                                <span className={styles.segmentSpeaker}>{seg.speaker}</span>
                              )}
                            </div>
                            <p
                              className={cn(
                                styles.segmentText,
                                activeSegmentIndex === index && styles.segmentTextActive,
                              )}
                            >
                              {seg.text}
                            </p>
                          </Button>
                        );
                      })
                    ) : (
                      <div className={styles.emptyState}>No transcript available.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.chapterList}>
                  {chapters.map((chapter, index) => (
                    <Button
                      unstyled
                      key={index}
                      onClick={() => seek(chapter.startTime)}
                      className={styles.chapterButton}
                    >
                      <div className={styles.chapterButtonTime}>
                        {formatTime(chapter.startTime)}
                      </div>
                      <div className={styles.chapterButtonTitle}>{chapter.title}</div>
                      <Icon name="Play" size="xs" className={styles.chapterButtonIcon} />
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFullTranscriptOverlay && (
        <div className={styles.overlayBackdrop}>
          <Surface className={styles.overlayPanel}>
            <div className={styles.overlayHeader}>
              <div className={styles.overlayActions}>
                <Button unstyled onClick={togglePlay} className={styles.overlayActionPrimary}>
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  unstyled
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (videoRef.current) videoRef.current.muted = !isMuted;
                  }}
                  className={styles.overlayActionSecondary}
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </Button>
              </div>
              <CloseButton
                onClick={() => setShowFullTranscriptOverlay(false)}
                size="sm"
                label="Close full transcript"
                className={styles.closeButton}
              />
            </div>
            <div className={styles.overlayContent}>
              <div className={styles.overlaySearchBar}>
                <SearchField
                  ref={overlaySearchInputRef}
                  value={transcriptSearch}
                  onChange={(e) => {
                    setTranscriptSearch(e.target.value);
                    setCurrentMatchIndex(0);
                  }}
                  placeholder="Search in transcript…"
                  className={styles.searchInput}
                  aria-label="Search full transcript"
                />
                {normalizedTranscriptQuery && (
                  <div className={styles.searchMeta}>
                    <span>
                      {transcriptMatches.length
                        ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                        : '0/0'}
                    </span>
                    <Button
                      unstyled
                      type="button"
                      onClick={goToPrevTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className={styles.navMiniButton}
                    >
                      ↑
                    </Button>
                    <Button
                      unstyled
                      type="button"
                      onClick={goToNextTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className={styles.navMiniButton}
                    >
                      ↓
                    </Button>
                  </div>
                )}
              </div>
              <div ref={overlayRef} className={styles.overlayTranscriptList}>
                {transcript.map((seg, index) => {
                  const isMatch = !!normalizedTranscriptQuery && transcriptMatches.includes(index);
                  const isCurrent = isMatch && transcriptMatches[currentMatchIndex] === index;
                  return (
                    <Button
                      unstyled
                      key={index}
                      onClick={() => seek(seg.start)}
                      className={cn(
                        styles.overlaySegmentButton,
                        currentTime >= seg.start &&
                          currentTime < seg.end &&
                          styles.overlaySegmentActive,
                        isCurrent && styles.overlaySegmentCurrentMatch,
                        !isCurrent && isMatch && styles.overlaySegmentMatch,
                      )}
                    >
                      <div className={styles.segmentHeader}>
                        <span className={styles.segmentTime}>{formatTime(seg.start)}</span>
                        {seg.speaker && (
                          <span className={styles.segmentSpeaker}>{seg.speaker}</span>
                        )}
                      </div>
                      <p className={styles.overlaySegmentText}>{seg.text}</p>
                    </Button>
                  );
                })}
              </div>
            </div>
          </Surface>
        </div>
      )}
    </Surface>
  );
};
