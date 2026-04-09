import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './RedactedLogo.module.css';

interface RedactedLogoProps {
  text: string;
  className?: string;
}

/**
 * A logo component that periodically animates letters into redacted blocks
 * one by one with glitch effects.
 */
export const RedactedLogo: React.FC<RedactedLogoProps> = ({ text, className = '' }) => {
  const [redactedCount, setRedactedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [glitchingIndex, setGlitchingIndex] = useState<number | null>(null);
  const [globalGlitch, setGlobalGlitch] = useState(false);
  const [showAltText, setShowAltText] = useState(false);
  const animationCount = useRef(0);

  // Pre-calculate letter count (excluding spaces)
  const letterCount = useMemo(() => text.replace(/\s/g, '').length, [text]);

  useEffect(() => {
    // Initial delay before first animation (4-8 seconds after mount)
    const initialDelay = 4000 + Math.random() * 4000;

    let intervalId: NodeJS.Timeout;

    const runAnimation = () => {
      const letterDelay = 55; // ms per letter
      animationCount.current += 1;

      // Every 10th animation OR every 4th animation, show the alt text when unredacting
      const isAltAnimation = animationCount.current % 10 === 0 || animationCount.current % 4 === 0;

      // Phase 1: Redact letters one by one with glitch
      setIsAnimating(true);
      setShowAltText(false);

      for (let i = 1; i <= letterCount; i++) {
        setTimeout(() => {
          setGlitchingIndex(i - 1);
          // Random global glitch on some letters
          if (Math.random() > 0.6) setGlobalGlitch(true);
          setTimeout(() => {
            setGlitchingIndex(null);
            setGlobalGlitch(false);
          }, 60);
          setRedactedCount(i);
        }, i * letterDelay);
      }

      // Phase 2: Hold fully redacted for 2.5 seconds
      const fullRedactTime = letterCount * letterDelay;
      const holdTime = 2500;

      // Phase 3: Reveal letters one by one
      setTimeout(() => {
        // Set alt text at start of reveal phase if this is the 10th animation
        if (isAltAnimation) {
          setShowAltText(true);
        }

        for (let i = letterCount - 1; i >= 0; i--) {
          setTimeout(
            () => {
              setGlitchingIndex(i);
              if (Math.random() > 0.6) setGlobalGlitch(true);
              setTimeout(() => {
                setGlitchingIndex(null);
                setGlobalGlitch(false);
              }, 60);
              setRedactedCount(i);
            },
            (letterCount - i) * letterDelay,
          );
        }
      }, fullRedactTime + holdTime);

      // Phase 4: End animation (add extra hold if alt text was shown)
      const altHoldTime = isAltAnimation ? 1500 : 0;
      setTimeout(
        () => {
          setIsAnimating(false);
          setRedactedCount(0);
          setGlitchingIndex(null);
          setGlobalGlitch(false);
          setShowAltText(false);
        },
        fullRedactTime + holdTime + letterCount * letterDelay + 100 + altHoldTime,
      );
    };

    // First animation after initial delay
    const animationTimeout = setTimeout(() => {
      runAnimation();
      // Set up recurring animations every 15-25 seconds
      intervalId = setInterval(runAnimation, 15000 + Math.random() * 10000);
    }, initialDelay);

    return () => {
      clearTimeout(animationTimeout);
      clearInterval(intervalId);
    };
  }, [letterCount]);

  // Render text - always render individual spans during animation for consistency
  const renderText = () => {
    let letterIndex = 0;

    // Easter egg: swap "EPSTEIN" for "TRUMP" on alt animation (all caps)
    const displayText = showAltText ? text.replace(/EPSTEIN/gi, 'TRUMP') : text;

    return displayText.split('').map((char, i) => {
      if (char === ' ') {
        return (
          <span key={i} style={{ display: 'inline-block', width: '4px' }}>
            {' '}
          </span>
        );
      }

      const currentLetterIndex = letterIndex;
      letterIndex++;

      const isRedacted = currentLetterIndex < redactedCount;
      const isGlitching = currentLetterIndex === glitchingIndex;

      // Strong glitch effects
      const glitchStyle = isGlitching
        ? {
            transform: `translateX(${Math.random() > 0.5 ? 2 : -2}px) translateY(${Math.random() > 0.5 ? 1 : -1}px)`,
            filter: 'brightness(2) contrast(1.5)',
            textShadow: '2px 0 #ff0040, -2px 0 #00ffff',
          }
        : {};

      return (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '10.8px', // Fixed pixel width per character
            textAlign: 'center',
            position: 'relative',
            transition: isGlitching ? 'none' : 'all 0.05s',
            ...glitchStyle,
          }}
        >
          {isRedacted ? (
            // Redacted block - solid black bar
            <span
              style={{
                color: '#000',
                background: '#000',
                padding: '0 1px',
              }}
            >
              █
            </span>
          ) : (
            <span style={{ color: '#f1f5f9' }}>{char}</span>
          )}
        </span>
      );
    });
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {/* Global glitch overlay */}
      {globalGlitch && (
        <div
          className={styles.globalGlitch}
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
          }}
        />
      )}

      <h1
        className={styles.title}
        style={{
          transform: globalGlitch ? `translateX(${Math.random() > 0.5 ? 3 : -3}px)` : 'none',
          filter: globalGlitch ? 'hue-rotate(20deg)' : 'none',
        }}
      >
        {isAnimating ? renderText() : <span style={{ color: '#f1f5f9' }}>{text}</span>}
      </h1>
    </div>
  );
};

export default RedactedLogo;
