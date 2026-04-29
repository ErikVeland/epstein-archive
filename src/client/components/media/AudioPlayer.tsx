import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Icon from '@client/components/common/Icon';
import { CloseButton } from '../common/CloseButton';

import { Box, Button, Flex, Input, LqText, Stack, Surface, cn } from '@client/design-system/lib';
import styles from './AudioPlayer.module.css';

const css = <T,>(style: T) => style;

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
  onClose,
  autoPlay = false,
  isSensitive = false,
  warningText = 'This content contains graphic descriptions of violence, sexual assault, child exploitation and murder.',
  initialTime = 0,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted] = useState(false);
  const initialSeekDone = useRef(false);

  useEffect(() => {
    initialSeekDone.current = false;
  }, [src, initialTime]);

  const [showTranscript, setShowTranscript] = useState(true);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);
  const [barHeights, setBarHeights] = useState<number[]>(Array.from({ length: 32 }).map(() => 20));
  const [transcriptSearch, setTranscriptSearch] = useState('');

  const normalizedTranscriptQuery = useMemo(
    () => transcriptSearch.trim().toLowerCase(),
    [transcriptSearch],
  );

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleShare = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('t', Math.floor(currentTime).toString());
      navigator.clipboard.writeText(url.toString());
    } catch (e) {
      console.error('Failed to copy link', e);
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;

    // Initialize analyzer only on first play or when src changes
    const initAnalyzer = () => {
      if (audioContextRef.current) return;
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof window.AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      const source = ctx.createMediaElementSource(audioRef.current!);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;

      const animate = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars = 32;
        const targets: number[] = [];
        for (let i = 0; i < bars; i++) {
          const val = dataArray[i] ?? 0;
          targets.push(Math.max(5, (val / 255) * 100));
        }
        setBarHeights(targets);
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    };

    if (isPlaying) initAnalyzer();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (transcript.length === 0) return;
    const index = transcript.findIndex((seg) => time >= seg.start && time < seg.end);
    if (index !== -1 && index !== activeSegmentIndex) {
      setActiveSegmentIndex(index);
      if (!normalizedTranscriptQuery) {
        scrollToSegment(index);
      }
    }
  };

  const scrollToSegment = useCallback((index: number) => {
    if (!transcriptRef.current) return;
    const element = transcriptRef.current.children[index] as HTMLElement;
    if (!element) return;
    transcriptRef.current.scrollTo({
      top: element.offsetTop - transcriptRef.current.clientHeight / 2,
      behavior: 'smooth',
    });
  }, []);

  const seek = useCallback(
    (time: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(audioRef.current.currentTime);
    },
    [duration],
  );

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const [revealed, setRevealed] = useState(!isSensitive);

  return (
    <Surface variant="glass" className={styles.root}>
      {!revealed && (
        <Flex align="center" justify="center" className={styles.warningOverlay}>
          <Surface variant="glass-highlight" className={styles.warningCard}>
            <Stack gap="lg" align="center" textAlign="center">
              <Box className={styles.warningIconBox}>
                <Icon name="Shield" size="xl" color="danger" />
              </Box>
              <Stack gap="sm">
                <LqText variant="h3" weight="bold">
                  Graphic Content Warning
                </LqText>
                <LqText variant="small" color="muted">
                  {warningText}
                </LqText>
              </Stack>
              <Flex gap="md">
                {onClose && (
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                )}
                <Button variant="primary" onClick={() => setRevealed(true)}>
                  Reveal & Play
                </Button>
              </Flex>
            </Stack>
          </Surface>
        </Flex>
      )}

      <Stack fullHeight gap="none">
        {/* Header */}
        <Surface variant="glass" className={styles.header}>
          <Flex justify="between" align="center" px="md" py="sm" fullWidth>
            <Flex align="center" gap="md">
              <Box className={styles.iconBox}>
                <Icon name="Volume2" size="sm" />
              </Box>
              <Stack gap="none">
                <LqText variant="small" weight="bold">
                  {title}
                </LqText>
                <LqText variant="xs" color="muted" style={css({ textTransform: 'uppercase' })}>
                  Forensic Signal Log
                </LqText>
              </Stack>
            </Flex>
            <Flex align="center" gap="sm">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Icon name="Share2" size="sm" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowTranscript(!showTranscript)}>
                <Icon name="List" size="sm" />
              </Button>
              {onClose && <CloseButton onClick={onClose} />}
            </Flex>
          </Flex>
        </Surface>

        {/* Content */}
        <Flex grow fullWidth className={styles.mainArea}>
          {/* Main Column */}
          <Stack grow p="xl" gap="xl" className={styles.playerColumn}>
            {/* Visualizer Area */}
            <Surface variant="glass-highlight" className={styles.visualizerArea}>
              <Flex align="end" justify="center" gap="xs" fullHeight className={styles.bars}>
                {barHeights.map((h, i) => (
                  <Box key={i} className={styles.bar} style={css({ height: `${h}%` })} />
                ))}
              </Flex>
              <Box className={styles.visualizerLabel}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                >
                  Live Signal Analysis
                </LqText>
              </Box>
            </Surface>

            {/* Controls */}
            <Stack gap="lg" className={styles.controlsArea}>
              <Stack gap="xs">
                <Input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className={styles.progressBar}
                />
                <Flex justify="between">
                  <LqText variant="xs" color="muted" weight="bold">
                    {formatTime(currentTime)}
                  </LqText>
                  <LqText variant="xs" color="muted" weight="bold">
                    {formatTime(duration)}
                  </LqText>
                </Flex>
              </Stack>

              <Flex justify="center" align="center" gap="xl">
                <Button variant="ghost" size="lg" onClick={() => seek(currentTime - 10)}>
                  <Icon name="SkipBack" size="lg" />
                </Button>
                <Button variant="primary" size="lg" className={styles.playBtn} onClick={togglePlay}>
                  {isPlaying ? (
                    <Icon name="Pause" size="xl" fill="currentColor" />
                  ) : (
                    <Icon name="Play" size="xl" fill="currentColor" />
                  )}
                </Button>
                <Button variant="ghost" size="lg" onClick={() => seek(currentTime + 10)}>
                  <Icon name="SkipForward" size="lg" />
                </Button>
              </Flex>

              <Flex justify="between" align="center">
                <Flex align="center" gap="md" className={styles.volumeArea}>
                  {isMuted ? <Icon name="VolumeX" size="sm" /> : <Icon name="Volume2" size="sm" />}
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (audioRef.current) audioRef.current.volume = v;
                    }}
                    className={styles.volumeSlider}
                  />
                </Flex>
                <Flex gap="xs">
                  {[1, 1.5, 2].map((r) => (
                    <Button
                      key={r}
                      variant={playbackRate === r ? 'glass-highlight' : 'ghost'}
                      onClick={() => {
                        setPlaybackRate(r);
                        if (audioRef.current) audioRef.current.playbackRate = r;
                      }}
                    >
                      {r}x
                    </Button>
                  ))}
                </Flex>
              </Flex>
            </Stack>
          </Stack>

          {/* Transcript Sidebar */}
          {showTranscript && (
            <Surface variant="glass" className={styles.sidebar}>
              <Stack fullHeight gap="none">
                <Box p="md" style={css({ borderBottom: '1px solid var(--lq-border-dim)' })}>
                  <Box className={styles.searchBox}>
                    <Icon name="Search" size="sm" className={styles.searchIcon} />
                    <Input
                      type="text"
                      placeholder="Search signals..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      className={styles.searchInput}
                    />
                  </Box>
                </Box>
                <Box grow className={styles.transcriptScroll} ref={transcriptRef}>
                  {transcript.length > 0 ? (
                    <Stack gap="none">
                      {transcript.map((seg, i) => (
                        <Box
                          key={i}
                          className={cn(
                            styles.segment,
                            activeSegmentIndex === i && styles.segmentActive,
                          )}
                          onClick={() => seek(seg.start)}
                        >
                          <Flex align="center" justify="between" mb="xs">
                            <LqText variant="xs" weight="bold" color="accent">
                              {formatTime(seg.start)}
                            </LqText>
                            {seg.speaker && (
                              <LqText
                                variant="xs"
                                color="muted"
                                style={css({ textTransform: 'uppercase' })}
                              >
                                {seg.speaker}
                              </LqText>
                            )}
                          </Flex>
                          <LqText
                            variant="xs"
                            color={activeSegmentIndex === i ? 'foreground' : 'muted'}
                          >
                            {seg.text}
                          </LqText>
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Flex align="center" justify="center" fullHeight p="xl">
                      <LqText variant="xs" color="muted">
                        No transcript available
                      </LqText>
                    </Flex>
                  )}
                </Box>
              </Stack>
            </Surface>
          )}
        </Flex>
      </Stack>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        autoPlay={autoPlay && revealed}
      />
    </Surface>
  );
};

export default AudioPlayer;
