import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shield,
  Share2,
  Check,
} from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { cn } from '@client/utils/cn';
import styles from './AudioPlayer.module.css';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

export interface Chapter {
  startTime: number;
  title: string;
}

interface AudioPlayerProps {
  src: string;
  title: string;
  transcript?: TranscriptSegment[];
  chapters?: Chapter[];
  onClose?: () => void;
  autoPlay?: boolean;
  isSensitive?: boolean;
  warningText?: string;
  documentId?: number;
  initialTime?: number;
  albumImages?: string[];
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  transcript = [],
  chapters = [],
  onClose,
  autoPlay = false,
  isSensitive = false,
  warningText = 'This content contains graphic descriptions of violence, sexual assault, child exploitation and murder.',
  documentId,
  initialTime = 0,
  albumImages = [],
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const initialSeekDone = useRef(false);

  useEffect(() => {
    initialSeekDone.current = false;
  }, [src, initialTime]);

  const [showTranscript, setShowTranscript] = useState(() => {
    try {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('audio-player-show-transcript')
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
  const [showFullTranscriptOverlay, setShowFullTranscriptOverlay] = useState(false);
  const interactionLockRef = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(Array.from({ length: 24 }).map(() => 20));
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [renderWindow, setRenderWindow] = useState<{ start: number; end: number }>({
    start: 0,
    end: 200,
  });
  const [showCopied, setShowCopied] = useState(false);
  const sidebarSearchInputRef = useRef<HTMLInputElement | null>(null);
  const overlaySearchInputRef = useRef<HTMLInputElement | null>(null);
  useScrollLock(showFullTranscriptOverlay);

  const toggleTranscript = () => {
    setShowTranscript((prev) => {
      const next = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('audio-player-show-transcript', String(next));
        }
      } catch {
        // Ignore storage failures so the player still works in restricted browsers.
      }
      return next;
    });
  };

  const markInteraction = useCallback(() => {
    interactionLockRef.current = true;
    if (interactionTimeoutRef.current !== null) {
      window.clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = window.setTimeout(() => {
      interactionLockRef.current = false;
      interactionTimeoutRef.current = null;
    }, 5000);
  }, []);

  const handleShare = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('t', Math.floor(currentTime).toString());
      if (documentId != null) url.searchParams.set('id', String(documentId));
      navigator.clipboard.writeText(url.toString()).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      });
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    audioRef.current.playbackRate = playbackRate;
    if (autoPlay && !isSensitive) {
      audioRef.current.play().catch((e) => console.warn('Autoplay failed:', e));
    }
    if (audioContextRef.current) return;

    const audioWindow = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    audioContextRef.current = ctx;
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    sourceRef.current = source;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const bars = 24;
      const step = Math.max(1, Math.floor(bufferLength / bars));
      const targets: number[] = [];
      for (let i = 0; i < bars; i++) {
        const start = i * step;
        const end = Math.min(bufferLength, (i + 1) * step);
        let sum = 0;
        for (let j = start; j < end; j++) sum += dataArray[j];
        const avg = sum / (end - start);
        targets.push(Math.min(100, Math.max(5, (avg / 255) * 100)));
      }
      setBarHeights((prev) =>
        prev.map((p, i) => {
          const t = targets[i] ?? p;
          return t > p ? t : Math.max(0, p - 0.8);
        }),
      );
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [autoPlay, isSensitive, playbackRate, volume]);

  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current !== null) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!albumImages || albumImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % albumImages.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [albumImages]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    if (transcript.length === 0) return;
    const index = transcript.findIndex((seg) => time >= seg.start && time < seg.end);
    if (index !== -1 && index !== activeSegmentIndex) {
      setActiveSegmentIndex(index);
      if (!normalizedTranscriptQuery && !interactionLockRef.current) {
        scrollToSegment(index);
      }
      setRenderWindow({
        start: Math.max(0, index - 50),
        end: Math.min(transcript.length, index + 150),
      });
    }
  };

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

  const seek = useCallback(
    (time: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(audioRef.current.currentTime);
      markInteraction();
    },
    [duration, markInteraction],
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
    [transcriptMatches, transcript, seek, scrollToSegment, scrollOverlayToSegment],
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

  const renderHighlightedText = (text: string, query: string) => {
    if (!query) return text;
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    const parts: React.ReactNode[] = [];
    let index = 0;
    while (index < text.length) {
      const matchIndex = lower.indexOf(q, index);
      if (matchIndex === -1) {
        parts.push(text.slice(index));
        break;
      }
      if (matchIndex > index) parts.push(text.slice(index, matchIndex));
      const matchText = text.slice(matchIndex, matchIndex + q.length);
      parts.push(
        <mark key={parts.length} className={styles.highlightMark}>
          {matchText}
        </mark>,
      );
      index = matchIndex + q.length;
    }
    return parts;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const computedChapters: Chapter[] = useMemo(() => {
    if (Array.isArray(chapters) && chapters.length > 0) return chapters;
    if (!transcript || transcript.length === 0) return [];
    const starts: number[] = [transcript[0].start];
    for (let i = 1; i < transcript.length; i++) {
      const prev = transcript[i - 1];
      const curr = transcript[i];
      if (curr.start - prev.end > 30 || curr.speaker !== prev.speaker) starts.push(curr.start);
    }
    return starts.map((start) => {
      const seg = transcript.find((s) => s.start === start) || transcript[0];
      const words = (seg.text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length > 3 &&
            ![
              'this',
              'that',
              'with',
              'from',
              'have',
              'will',
              'into',
              'over',
              'they',
              'them',
              'been',
              'when',
              'what',
              'where',
              'which',
              'because',
              'about',
              'there',
              'their',
              'also',
              'said',
              'just',
              'like',
              'very',
              'more',
              'than',
            ].includes(w),
        );
      const freq: Record<string, number> = {};
      for (const w of words) freq[w] = (freq[w] || 0) + 1;
      const top = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([w]) => w);
      return {
        startTime: start,
        title: top.length ? top.map((t) => t[0].toUpperCase() + t.slice(1)).join(' • ') : 'Chapter',
      };
    });
  }, [chapters, transcript]);

  const visualizerBars = useMemo(
    () => Array.from({ length: 20 }, (_, i) => ({ height: 20 + ((i * 37) % 80), delay: i * 0.05 })),
    [],
  );

  const [revealedSources, setRevealedSources] = useState<Record<string, boolean>>({});
  const hasRevealed = !isSensitive || !!revealedSources[src];

  const handleReveal = () => {
    setRevealedSources((prev) => ({ ...prev, [src]: true }));
    if (!audioRef.current) return;
    audioRef.current.play().catch(console.error);
    setIsPlaying(true);
  };

  return (
    <div className={cn('surface-glass', styles.root)}>
      <div className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerInfo}>
            <div className={styles.headerIconBox}>
              <Volume2 size={16} />
            </div>
            <div className={styles.headerText}>
              <h3 className={styles.title} title={title}>
                {title}
              </h3>
              <p className={styles.subtitle}>
                {Array.isArray(chapters) && chapters.length > 0
                  ? `${chapters.length} chapters`
                  : 'Audio Recording'}
              </p>
              {title.includes('Sascha') && (
                <p className={styles.metaNote}>
                  Interview: Sascha Riley • Investigation: Lisa Noelle Volding
                </p>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            <button onClick={handleShare} className={styles.iconButton} title="Copy link">
              {showCopied ? (
                <Check size={16} className={styles.successIcon} />
              ) : (
                <Share2 size={16} />
              )}
            </button>
            <button
              onClick={() => {
                setShowFullTranscriptOverlay(true);
                markInteraction();
                setTimeout(() => {
                  if (!overlayRef.current) return;
                  const idx = transcript.findIndex(
                    (seg) => currentTime >= seg.start && currentTime < seg.end,
                  );
                  const el = overlayRef.current.children[idx] as HTMLElement;
                  if (!el) return;
                  overlayRef.current.scrollTo({
                    top: el.offsetTop - overlayRef.current.clientHeight / 2 + el.clientHeight / 2,
                    behavior: 'smooth',
                  });
                }, 50);
              }}
              className={cn('surface-glass', styles.readButton)}
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
            </button>
            {(transcript.length > 0 || chapters.length > 0) && (
              <button
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
              </button>
            )}
            {onClose && (
              <CloseButton
                onClick={onClose}
                size="sm"
                label="Close audio player"
                className={styles.closeButton}
              />
            )}
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {!hasRevealed && (
          <div className={styles.warningOverlay}>
            <div className={styles.warningIconCircle}>
              <Shield className={styles.warningIcon} />
            </div>
            <h3 className={styles.warningTitle}>Graphic Content Warning</h3>
            <p className={styles.warningBody}>{warningText}</p>
            <div className={styles.warningActions}>
              {onClose && (
                <button onClick={onClose} className={styles.cancelButton}>
                  Cancel
                </button>
              )}
              <button onClick={handleReveal} className={styles.revealButton}>
                Reveal & Play
              </button>
            </div>
          </div>
        )}

        <div className={styles.mainColumn}>
          <div className={cn('surface-glass', styles.visualizer)}>
            {albumImages && albumImages.length > 0 ? (
              <div className={styles.slideshow}>
                {albumImages.map((img, i) => (
                  <img
                    key={i}
                    src={`/api/static?path=${encodeURIComponent(img)}`}
                    alt="Album Art"
                    className={cn(
                      styles.slideImage,
                      i === currentImageIndex ? styles.slideImageActive : styles.slideImageInactive,
                    )}
                    data-fb="0"
                    onError={(e) => {
                      const t = e.currentTarget;
                      const tried = t.getAttribute('data-fb') === '1';
                      if (!tried) {
                        t.setAttribute('data-fb', '1');
                        const u = new URL(t.src, window.location.origin);
                        const p = u.searchParams.get('path') || '';
                        const next = p.endsWith('.jpg')
                          ? p.replace('.jpg', '.webp')
                          : p.replace('.webp', '.jpg');
                        t.src = `/api/static?path=${encodeURIComponent(next)}`;
                      } else {
                        t.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                      }
                    }}
                  />
                ))}
                <div className={styles.visualizerOverlay}>
                  {visualizerBars.map((bar, i) => (
                    <div
                      key={i}
                      className={cn(
                        styles.visualizerBar,
                        isPlaying && styles.visualizerBarAnimating,
                      )}
                      style={{
                        height: `${(barHeights[i] ?? bar.height) * 0.6}%`,
                        animationDelay: `${bar.delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.visualizerBars}>
                {visualizerBars.map((bar, i) => (
                  <div
                    key={i}
                    className={cn(
                      styles.visualizerBarDefault,
                      isPlaying && styles.visualizerBarAnimating,
                    )}
                    style={{
                      height: `${barHeights[i] ?? bar.height}%`,
                      animationDelay: `${bar.delay}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {computedChapters.length > 0 && (
              <div className={styles.chapterBanner}>
                <span className={styles.chapterEyebrow}>Current Chapter</span>
                <h4 className={styles.chapterTitle}>
                  {computedChapters
                    .slice()
                    .reverse()
                    .find((c) => currentTime >= c.startTime)?.title ||
                    computedChapters[0]?.title ||
                    'Unknown'}
                </h4>
              </div>
            )}
          </div>

          <div className={styles.progressSection}>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className={styles.progressInput}
            />
            {computedChapters.map((chapter, i) => (
              <div
                key={i}
                className={styles.chapterMarker}
                style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                title={chapter.title}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(chapter.startTime);
                }}
              />
            ))}
            <div className={styles.progressTimes}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={styles.transport}>
            <button onClick={() => seek(currentTime - 10)} className={styles.transportButton}>
              <SkipBack size={24} />
            </button>
            <button onClick={togglePlay} className={styles.playButtonMain}>
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className={styles.playGlyph} />
              )}
            </button>
            <button onClick={() => seek(currentTime + 10)} className={styles.transportButton}>
              <SkipForward size={24} />
            </button>
          </div>

          <div className={styles.bottomControls}>
            <div className={styles.volumeControl}>
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (audioRef.current) audioRef.current.muted = !isMuted;
                }}
                className={styles.transportButton}
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => {
                  const next = parseFloat(e.target.value);
                  setVolume(next);
                  if (audioRef.current) audioRef.current.volume = next;
                }}
                className={styles.volumeSlider}
              />
            </div>

            <div className={cn('surface-glass', styles.rateControl)}>
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (audioRef.current) audioRef.current.playbackRate = rate;
                  }}
                  className={cn(
                    styles.rateButton,
                    playbackRate === rate ? styles.rateButtonActive : styles.rateButtonIdle,
                  )}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {(transcript.length > 0 || chapters.length > 0) && (
          <div
            className={cn(
              styles.sidebar,
              showTranscript ? styles.sidebarVisible : styles.sidebarHidden,
            )}
          >
            <div className={styles.sidebarTabs}>
              <button
                onClick={() => setShowChapters(false)}
                className={cn(
                  styles.sidebarTab,
                  !showChapters ? styles.sidebarTabActive : styles.sidebarTabIdle,
                )}
              >
                Transcript
              </button>
              {computedChapters.length > 0 && (
                <button
                  onClick={() => setShowChapters(true)}
                  className={cn(
                    styles.sidebarTab,
                    showChapters ? styles.sidebarTabActive : styles.sidebarTabIdle,
                  )}
                >
                  Chapters
                </button>
              )}
              <CloseButton
                onClick={() => setShowTranscript(false)}
                size="sm"
                label="Close transcript panel"
                className={styles.sidebarClose}
              />
            </div>

            <div
              className={styles.sidebarBody}
              onScroll={() => {
                markInteraction();
              }}
              onWheel={() => {
                markInteraction();
              }}
              onTouchMove={() => {
                markInteraction();
              }}
            >
              {!showChapters ? (
                <>
                  {transcript.length > 0 && (
                    <div className={styles.searchSticky}>
                      <input
                        ref={sidebarSearchInputRef}
                        type="text"
                        value={transcriptSearch}
                        onChange={(e) => {
                          setTranscriptSearch(e.target.value);
                          setCurrentMatchIndex(0);
                          markInteraction();
                        }}
                        placeholder="Search in transcript…"
                        className={cn('surface-glass', styles.searchInput)}
                      />
                      {normalizedTranscriptQuery && (
                        <div className={styles.searchMeta}>
                          <span>
                            {transcriptMatches.length
                              ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                              : '0/0'}
                          </span>
                          <button
                            type="button"
                            onClick={goToPrevTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className={styles.navMiniButton}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={goToNextTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className={styles.navMiniButton}
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={transcriptRef} className={styles.segmentList}>
                    {transcript.length > 0 ? (
                      transcript.slice(renderWindow.start, renderWindow.end).map((seg, i) => {
                        const idx = renderWindow.start + i;
                        const isMatch =
                          !!normalizedTranscriptQuery && transcriptMatches.includes(idx);
                        const isCurrent = isMatch && transcriptMatches[currentMatchIndex] === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => seek(seg.start)}
                            className={cn(
                              styles.segmentButton,
                              activeSegmentIndex === idx && styles.segmentActive,
                              isCurrent && styles.segmentCurrentMatch,
                              !isCurrent && isMatch && styles.segmentMatch,
                            )}
                          >
                            <div className={styles.segmentMeta}>
                              <span className={styles.segmentTime}>{formatTime(seg.start)}</span>
                              {seg.speaker && (
                                <span className={styles.segmentSpeaker}>{seg.speaker}</span>
                              )}
                            </div>
                            <p
                              className={cn(
                                styles.segmentText,
                                activeSegmentIndex === idx
                                  ? styles.segmentTextActive
                                  : styles.segmentTextIdle,
                              )}
                            >
                              {renderHighlightedText(seg.text || '', normalizedTranscriptQuery)}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className={styles.emptyState}>No transcript available.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.segmentList}>
                  {computedChapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => seek(chapter.startTime)}
                      className={styles.chapterButton}
                    >
                      <div className={styles.chapterButtonTime}>
                        {formatTime(chapter.startTime)}
                      </div>
                      <div className={styles.chapterButtonTitle}>{chapter.title}</div>
                      <Play size={12} className={styles.chapterButtonIcon} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFullTranscriptOverlay && (
        <div className={styles.overlayBackdrop}>
          <div className={cn('surface-glass', styles.overlayPanel)}>
            <div className={styles.overlayHeader}>
              <div className={styles.overlayActions}>
                <button onClick={togglePlay} className={styles.overlayActionPrimary}>
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (audioRef.current) audioRef.current.muted = !isMuted;
                  }}
                  className={styles.overlayActionSecondary}
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
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
                <input
                  ref={overlaySearchInputRef}
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => {
                    setTranscriptSearch(e.target.value);
                    setCurrentMatchIndex(0);
                    markInteraction();
                  }}
                  placeholder="Search in transcript…"
                  className={cn('surface-glass', styles.searchInput)}
                />
                {normalizedTranscriptQuery && (
                  <div className={styles.searchMeta}>
                    <span>
                      {transcriptMatches.length
                        ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                        : '0/0'}
                    </span>
                    <button
                      type="button"
                      onClick={goToPrevTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className={styles.navMiniButton}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={goToNextTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className={styles.navMiniButton}
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
              <div
                ref={overlayRef}
                className={styles.overlayTranscriptList}
                onScroll={() => {
                  markInteraction();
                }}
                onWheel={() => {
                  markInteraction();
                }}
                onTouchMove={() => {
                  markInteraction();
                }}
              >
                {transcript.map((seg, i) => {
                  const isMatch = !!normalizedTranscriptQuery && transcriptMatches.includes(i);
                  const isCurrent = isMatch && transcriptMatches[currentMatchIndex] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => seek(seg.start)}
                      className={cn(
                        styles.overlaySegmentButton,
                        currentTime >= seg.start && currentTime < seg.end && styles.segmentActive,
                        isCurrent && styles.segmentCurrentMatch,
                        !isCurrent && isMatch && styles.segmentMatch,
                      )}
                    >
                      <div className={styles.segmentMeta}>
                        <span className={styles.segmentTime}>{formatTime(seg.start)}</span>
                        {seg.speaker && (
                          <span className={styles.segmentSpeaker}>{seg.speaker}</span>
                        )}
                      </div>
                      <p className={styles.overlaySegmentText}>
                        {renderHighlightedText(seg.text || '', normalizedTranscriptQuery)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration || 0);
          if (initialTime > 0 && !initialSeekDone.current && audioRef.current) {
            audioRef.current.currentTime = initialTime;
            setCurrentTime(initialTime);
            initialSeekDone.current = true;
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default AudioPlayer;
