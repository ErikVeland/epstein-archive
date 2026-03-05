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
  // const _navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const initialSeekDone = useRef(false);

  useEffect(() => {
    // Reset initial seek state when src changes
    initialSeekDone.current = false;
    setCurrentTime(initialTime);
  }, [src, initialTime]);
  const [showTranscript, setShowTranscript] = useState(() => {
    // Load transcript preference from localStorage
    try {
      const saved =
        typeof window !== 'undefined'
          ? window.localStorage.getItem('audio-player-show-transcript')
          : null;
      if (saved !== null) return saved === 'true';
      // Default: closed on small screens (mobile), open on desktop
      if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
      return true;
    } catch {
      return false;
    }
  });
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [showChapters, setShowChapters] = useState(false);
  const [showFullTranscriptOverlay, setShowFullTranscriptOverlay] = useState(false);
  const lastInteractionRef = useRef<number>(Date.now());
  const [barHeights, setBarHeights] = useState<number[]>(Array.from({ length: 24 }).map(() => 20));

  // In-player transcript search state
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

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [normalizedTranscriptQuery, transcriptMatches.length]);
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

  // Toggle transcript visibility and persist preference
  const toggleTranscript = () => {
    setShowTranscript((prev) => {
      const newValue = !prev;
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('audio-player-show-transcript', String(newValue));
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
      // Preserve existing params but always include current timecode so
      // links can reopen at the same moment.
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

  // Initialize / update audio element with current volume & rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = playbackRate;
      // Only autoplay if not sensitive (wait for reveal otherwise)
      if (autoPlay && !isSensitive) {
        audioRef.current.play().catch((e) => console.warn('Autoplay failed:', e));
      }
      if (!audioContextRef.current) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctor) {
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
            const targetHeights: number[] = [];
            for (let i = 0; i < bars; i++) {
              const start = i * step;
              const end = Math.min(bufferLength, (i + 1) * step);
              let sum = 0;
              for (let j = start; j < end; j++) sum += dataArray[j];
              const avg = sum / (end - start);
              const norm = Math.min(100, Math.max(5, (avg / 255) * 100));
              targetHeights.push(norm);
            }
            setBarHeights((prev) => {
              const decay = 0.8;
              return prev.map((p, i) => {
                const t = targetHeights[i] ?? p;
                return t > p ? t : Math.max(0, p - decay);
              });
            });
            requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      }
    }
  }, [autoPlay, isSensitive, volume, playbackRate]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Slideshow effect
  useEffect(() => {
    if (!albumImages || albumImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % albumImages.length);
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [albumImages]);

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);

      // Find active segment
      if (transcript.length > 0) {
        const index = transcript.findIndex((seg) => time >= seg.start && time < seg.end);
        if (index !== -1 && index !== activeSegmentIndex) {
          setActiveSegmentIndex(index);
          // When a transcript search is active, pause automatic scrolling so
          // investigators can stay anchored on their search context. Auto-scroll
          // resumes only once the search is cleared.
          if (!normalizedTranscriptQuery && Date.now() - lastInteractionRef.current > 5000) {
            scrollToSegment(index);
          }
          const start = Math.max(0, index - 50);
          const end = Math.min(transcript.length, index + 150);
          setRenderWindow({ start, end });
        }
      }
    }
  };

  const scrollToSegment = useCallback((index: number) => {
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
  }, []);

  const scrollOverlayToSegment = useCallback((index: number) => {
    if (!overlayRef.current) return;
    const element = overlayRef.current.children[index] as HTMLElement;
    if (element) {
      overlayRef.current.scrollTo({
        top: element.offsetTop - overlayRef.current.clientHeight / 2 + element.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, []);

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
    // seek is stable and declared below; intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transcriptMatches, transcript, scrollToSegment, scrollOverlayToSegment],
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
        return; // respect typing
      }
      if (!showTranscript && !showFullTranscriptOverlay) return;

      // Focus transcript search with '/'
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
      if (matchIndex > index) {
        parts.push(text.slice(index, matchIndex));
      }
      const matchText = text.slice(matchIndex, matchIndex + q.length);
      parts.push(
        <mark key={parts.length} className="bg-amber-500/40 text-inherit px-0.5 rounded-sm">
          {matchText}
        </mark>,
      );
      index = matchIndex + q.length;
    }
    return parts;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const seek = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(audioRef.current.currentTime);
        lastInteractionRef.current = Date.now();
      }
    },
    [duration],
  );

  const computedChapters: Chapter[] = useMemo(() => {
    if (Array.isArray(chapters) && chapters.length > 0) return chapters;
    if (!transcript || transcript.length === 0) return [];
    const starts: number[] = [transcript[0].start];
    for (let i = 1; i < transcript.length; i++) {
      const prev = transcript[i - 1];
      const curr = transcript[i];
      if (curr.start - prev.end > 30 || curr.speaker !== prev.speaker) {
        starts.push(curr.start);
      }
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
      const title = top.length
        ? top.map((t) => t[0].toUpperCase() + t.slice(1)).join(' • ')
        : 'Chapter';
      return { startTime: start, title };
    });
  }, [chapters, transcript]);
  // Pre-compute visualizer bar heights with deterministic values
  const visualizerBars = useMemo(() => {
    // Use deterministic pattern based on index for predictable rendering
    return Array.from({ length: 20 }, (_, i) => ({
      height: 20 + ((i * 37) % 80), // Deterministic pattern using modulo
      delay: i * 0.05,
    }));
  }, []);

  const [hasRevealed, setHasRevealed] = useState(!isSensitive);

  // Reset hasRevealed if isSensitive changes (though key prop in parent should handle full reset)
  useEffect(() => {
    setHasRevealed(!isSensitive);
  }, [isSensitive]);

  const handleReveal = () => {
    setHasRevealed(true);
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-cyan-900/30 flex items-center justify-center text-cyan-400">
              <Volume2 size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-slate-200 truncate" title={title}>
                {title}
              </h3>
              <p className="text-xs text-slate-500">
                {Array.isArray(chapters) && chapters.length > 0
                  ? `${chapters.length} chapters`
                  : 'Audio Recording'}
              </p>
              {title.includes('Sascha') && (
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Interview: Sascha Riley • Investigation: Lisa Noelle Volding
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
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
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-400 rounded-full transition-colors flex items-center gap-2 border border-slate-700"
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
                className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
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
                label="Close audio player"
                className="bg-transparent hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Sensitive Content Warning Overlay */}
        {!hasRevealed && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-1 ring-red-500/30">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Graphic Content Warning</h3>
            <p className="text-slate-400 max-w-md mb-8 leading-relaxed">{warningText}</p>
            <div className="flex gap-4">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleReveal}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg shadow-red-900/20 transition-all hover:scale-105"
              >
                Reveal & Play
              </button>
            </div>
          </div>
        )}

        {/* Main Content (Visuals + Controls) */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
          {/* Visualizer / Slideshow Area */}
          <div className="flex-1 min-h-[100px] bg-slate-900/50 rounded-lg border border-slate-800/50 mb-6 flex items-center justify-center relative overflow-hidden group">
            {albumImages && albumImages.length > 0 ? (
              // Slideshow Mode
              <div className="absolute inset-0 w-full h-full">
                {albumImages.map((img, i) => (
                  <img
                    key={i}
                    src={`/api/static?path=${encodeURIComponent(img)}`}
                    alt="Album Art"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === currentImageIndex ? 'opacity-50' : 'opacity-0'}`}
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

                {/* Visualizer overlay on top of images */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 flex items-end justify-center gap-1 px-10 pb-4 opacity-70 z-10">
                  {visualizerBars.map((bar, i) => (
                    <div
                      key={i}
                      className={`w-2 bg-gradient-to-t from-cyan-400 to-transparent rounded-t transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                      style={{
                        height: `${(barHeights[i] ?? bar.height) * 0.6}%`,
                        animationDelay: `${bar.delay}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // Default Visualizer Mode
              <div className="flex items-end justify-center gap-1 h-1/3 w-full px-10 opacity-30">
                {visualizerBars.map((bar, i) => (
                  <div
                    key={i}
                    className={`w-2 bg-gradient-to-t from-cyan-500 to-blue-500 rounded-t transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                    style={{
                      height: `${barHeights[i] ?? bar.height}%`,
                      animationDelay: `${bar.delay}s`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Active Chapter Display */}
            {computedChapters.length > 0 && (
              <div className="absolute top-4 left-4 right-4 text-center z-20">
                <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">
                  Current Chapter
                </span>
                <h4 className="text-lg text-white font-light drop-shadow-md mt-1">
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

          {/* Progress Bar with Chapters */}
          <div className="mb-4 relative group">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:bg-slate-700 transition-colors"
            />
            {/* Chapter Markers */}
            {computedChapters.map((chapter, i) => (
              <div
                key={i}
                className="absolute top-0 w-0.5 h-2 bg-slate-500 hover:bg-white cursor-pointer z-10 transition-colors"
                style={{ left: `${(chapter.startTime / duration) * 100}%` }}
                title={chapter.title}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(chapter.startTime);
                }}
              />
            ))}
            <div className="flex justify-between text-xs text-slate-500 font-mono mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => seek(currentTime - 10)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <SkipBack size={24} />
            </button>

            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center shadow-lg shadow-cyan-900/20 transition-all hover:scale-105"
            >
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>

            <button
              onClick={() => seek(currentTime + 10)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <SkipForward size={24} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsMuted(!isMuted);
                  if (audioRef.current) audioRef.current.muted = !isMuted;
                }}
                className="text-slate-400 hover:text-white"
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
                  setVolume(parseFloat(e.target.value));
                  if (audioRef.current) audioRef.current.volume = parseFloat(e.target.value);
                }}
                className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
              {[0.5, 1, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (audioRef.current) audioRef.current.playbackRate = rate;
                  }}
                  className={`px-2 py-1 text-xs rounded ${playbackRate === rate ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar (Transcript/Chapters) */}
        {(transcript.length > 0 || chapters.length > 0) && (
          <div
            className={`fixed md:relative inset-0 md:inset-auto z-40 md:z-0 md:w-80 border-l border-slate-800 bg-slate-900 md:bg-slate-900/30 flex flex-col transition-transform duration-300 ${showTranscript ? 'translate-x-0' : 'translate-x-full md:hidden'} md:translate-x-0`}
          >
            <div className="flex border-b border-slate-800 shrink-0">
              <button
                onClick={() => setShowChapters(false)}
                className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${!showChapters ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Transcript
              </button>
              {computedChapters.length > 0 && (
                <button
                  onClick={() => setShowChapters(true)}
                  className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider ${showChapters ? 'text-cyan-400 border-b-2 border-cyan-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Chapters
                </button>
              )}
              <CloseButton
                onClick={() => setShowTranscript(false)}
                size="sm"
                label="Close transcript panel"
                className="md:hidden mr-2 bg-transparent border-slate-700 text-slate-400 hover:text-white"
              />
            </div>

            <div
              className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
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
              {!showChapters ? (
                <>
                  {transcript.length > 0 && (
                    <div className="sticky top-0 z-10 bg-slate-900/95 px-3 py-2 border-b border-slate-800 flex items-center gap-2">
                      <input
                        ref={sidebarSearchInputRef}
                        type="text"
                        value={transcriptSearch}
                        onChange={(e) => {
                          setTranscriptSearch(e.target.value);
                          lastInteractionRef.current = Date.now();
                        }}
                        placeholder="Search in transcript…"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
                      />
                      {normalizedTranscriptQuery && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <span>
                            {transcriptMatches.length
                              ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                              : '0/0'}
                          </span>
                          <button
                            type="button"
                            onClick={goToPrevTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={goToNextTranscriptMatch}
                            disabled={!transcriptMatches.length}
                            className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={transcriptRef} className="flex flex-col">
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
                            className={`p-4 text-left border-b border-slate-800/50 transition-colors hover:bg-slate-800/50 ${
                              activeSegmentIndex === idx ? 'bg-cyan-900/20' : ''
                            } ${isCurrent ? 'ring-1 ring-amber-400 border-amber-400' : ''} ${
                              !isCurrent && isMatch ? 'border-amber-500/60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-slate-500">
                                {formatTime(seg.start)}
                              </span>
                              {seg.speaker && (
                                <span className="text-xs font-bold text-slate-300">
                                  {seg.speaker}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-sm leading-relaxed ${
                                activeSegmentIndex === idx ? 'text-white' : 'text-slate-400'
                              }`}
                            >
                              {renderHighlightedText(seg.text || '', normalizedTranscriptQuery)}
                            </p>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        No transcript available.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col">
                  {computedChapters.map((chapter, i) => (
                    <button
                      key={i}
                      onClick={() => seek(chapter.startTime)}
                      className={`p-4 text-left border-b border-slate-800/50 flex items-center gap-3 hover:bg-slate-800/50 group`}
                    >
                      <div className="text-xs font-mono text-slate-500 w-12">
                        {formatTime(chapter.startTime)}
                      </div>
                      <div className="flex-1 text-sm text-slate-300 group-hover:text-cyan-400 transition-colors">
                        {chapter.title}
                      </div>
                      <Play size={12} className="opacity-0 group-hover:opacity-100 text-cyan-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFullTranscriptOverlay && (
        <div className="fixed inset-0 z-[1300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (audioRef.current) audioRef.current.muted = !isMuted;
                  }}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
              </div>
              <CloseButton
                onClick={() => setShowFullTranscriptOverlay(false)}
                size="sm"
                label="Close full transcript"
                className="bg-transparent border-slate-700 text-slate-400 hover:text-white"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center gap-2">
                <input
                  ref={overlaySearchInputRef}
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => {
                    setTranscriptSearch(e.target.value);
                    lastInteractionRef.current = Date.now();
                  }}
                  placeholder="Search in transcript…"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500"
                />
                {normalizedTranscriptQuery && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <span>
                      {transcriptMatches.length
                        ? `${currentMatchIndex + 1}/${transcriptMatches.length}`
                        : '0/0'}
                    </span>
                    <button
                      type="button"
                      onClick={goToPrevTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={goToNextTranscriptMatch}
                      disabled={!transcriptMatches.length}
                      className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 disabled:opacity-40"
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
                      className={`w-full text-left p-3 rounded border border-slate-800/50 hover:bg-slate-800/50 transition-colors ${
                        currentTime >= seg.start && currentTime < seg.end ? 'bg-cyan-900/20' : ''
                      } ${isCurrent ? 'ring-1 ring-amber-400 border-amber-400' : ''} ${
                        !isCurrent && isMatch ? 'border-amber-500/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">
                          {formatTime(seg.start)}
                        </span>
                        {seg.speaker && (
                          <span className="text-xs font-bold text-slate-300">{seg.speaker}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300">
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
