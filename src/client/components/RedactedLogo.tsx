import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './common/Icon';
import styles from './RedactedLogo.module.css';

interface RedactedLogoProps {
  text: string;
  className?: string;
}

const ALTERNATE_TITLES = ['THE TRUMP FILES', 'OPERATION EPSTEIN FURY', 'TRUMP-EPSTEIN FILES'];

/**
 * A logo component that periodically animates letters into redacted blocks
 * one by one with high-speed scramble glitch effects.
 */
export const RedactedLogo: React.FC<RedactedLogoProps> = ({ text, className = '' }) => {
  const [redactedCount, setRedactedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [glitchingIndex, setGlitchingIndex] = useState<number | null>(null);
  const [globalGlitch, setGlobalGlitch] = useState(false);
  const [currentText, setCurrentText] = useState(text);
  const animationCount = useRef(0);

  // Use the length of the currently active text
  const letterCount = useMemo(() => currentText.replace(/\s/g, '').length, [currentText]);

  useEffect(() => {
    // Initial delay before first animation (3-6 seconds after mount)
    const initialDelay = 3000 + Math.random() * 3000;

    let intervalId: NodeJS.Timeout;

    const runAnimation = () => {
      const letterDelay = 70;
      const glitchLeadTime = 115;
      const glitchClearTime = 190;
      animationCount.current += 1;

      // Odd intervals: Trigger alternate text animations
      const isAltAnimation = animationCount.current % 3 === 0 || animationCount.current % 5 === 0;

      setIsAnimating(true);

      // Phase 1: Redact standard text letters one by one with glitch
      for (let i = 1; i <= letterCount; i++) {
        setTimeout(() => {
          setGlitchingIndex(i - 1);
          // Random global glitch on some letters
          if (Math.random() > 0.4) setGlobalGlitch(true);
          setTimeout(() => {
            setRedactedCount(i);
          }, glitchLeadTime);
          setTimeout(() => {
            setGlitchingIndex(null);
            setGlobalGlitch(false);
          }, glitchClearTime);
        }, i * letterDelay);
      }

      // Phase 2: Hold fully redacted for 2 seconds
      const fullRedactTime = letterCount * letterDelay;
      const holdTime = 2000;

      // Phase 3: Reveal letters one by one (swapping to alternative text if isAltAnimation)
      setTimeout(() => {
        if (isAltAnimation) {
          const chosenAlt = ALTERNATE_TITLES[animationCount.current % ALTERNATE_TITLES.length];
          setCurrentText(chosenAlt);
        } else {
          setCurrentText(text);
        }

        // Now reveal the new active text
        for (let i = letterCount - 1; i >= 0; i--) {
          setTimeout(
            () => {
              setGlitchingIndex(i);
              if (Math.random() > 0.4) setGlobalGlitch(true);
              setTimeout(() => {
                setRedactedCount(i);
              }, glitchLeadTime);
              setTimeout(() => {
                setGlitchingIndex(null);
                setGlobalGlitch(false);
              }, glitchClearTime);
            },
            (letterCount - i) * letterDelay,
          );
        }
      }, fullRedactTime + holdTime);

      // Phase 4: End animation and restore standard text after a hold if alt text was shown
      const altHoldTime = isAltAnimation ? 2000 : 0;
      setTimeout(
        () => {
          setIsAnimating(false);
          setRedactedCount(0);
          setGlitchingIndex(null);
          setGlobalGlitch(false);
          if (isAltAnimation) {
            // Gradually transition back to original text
            setIsAnimating(true);
            for (let i = 1; i <= letterCount; i++) {
              setTimeout(() => {
                setGlitchingIndex(i - 1);
                setGlobalGlitch(true);
                setTimeout(() => setRedactedCount(i), 70);
                setTimeout(() => {
                  setGlitchingIndex(null);
                  setGlobalGlitch(false);
                }, 130);
              }, i * 20);

              setTimeout(
                () => {
                  setCurrentText(text);
                  for (let j = letterCount - 1; j >= 0; j--) {
                    setTimeout(
                      () => {
                        setGlitchingIndex(j);
                        setGlobalGlitch(true);
                        setTimeout(() => setRedactedCount(j), 70);
                        setTimeout(() => {
                          setGlitchingIndex(null);
                          setGlobalGlitch(false);
                        }, 130);
                      },
                      (letterCount - j) * 20,
                    );
                  }
                },
                letterCount * 20 + 400,
              );

              setTimeout(
                () => {
                  setIsAnimating(false);
                  setRedactedCount(0);
                  setGlitchingIndex(null);
                },
                letterCount * 40 + 500,
              );
            }
          }
        },
        fullRedactTime + holdTime + letterCount * letterDelay + 100 + altHoldTime,
      );
    };

    // First animation after initial delay
    const animationTimeout = setTimeout(() => {
      runAnimation();
      // Set up recurring animations every 12-20 seconds for active feel
      intervalId = setInterval(runAnimation, 12000 + Math.random() * 8000);
    }, initialDelay);

    return () => {
      clearTimeout(animationTimeout);
      clearInterval(intervalId);
    };
  }, [letterCount, currentText, text]);

  // Render text - individual spans with high-tech scrambles during transitions
  const renderText = () => {
    let letterIndex = 0;

    return currentText.split('').map((char, i) => {
      if (char === ' ') {
        return (
          <span key={i} className={styles.space}>
            {' '}
          </span>
        );
      }

      const currentLetterIndex = letterIndex;
      letterIndex++;

      const isRedacted = currentLetterIndex < redactedCount;
      const isGlitching = currentLetterIndex === glitchingIndex;

      // Scramble glitch characters
      let displayedChar = char;
      if (isRedacted) {
        displayedChar = '█';
      }
      if (isGlitching) {
        const glitchChars = ['█', '▓', '▒', '░', 'Δ', 'Ø', 'X', '#', '%', '&', '§', '?', '0', '1'];
        displayedChar = glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }

      // Dynamic CSS classes for high-speed chromatic aberration and skews
      const letterClasses = [styles.letter, isGlitching ? styles.letterGlitching : '']
        .filter(Boolean)
        .join(' ');

      return (
        <span
          key={i}
          className={letterClasses}
          style={{ transition: isGlitching ? 'none' : 'all 0.05s' }}
        >
          {isRedacted && !isGlitching ? (
            <span className={styles.redactedBlock}>█</span>
          ) : (
            <span className={styles.normalChar} data-glitch={displayedChar}>
              {displayedChar}
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {/* Global glitch overlay */}
      {globalGlitch && <div className={styles.globalGlitch} />}

      {/* Glowing Icon Badge */}
      <div className={styles.logoBadge}>
        <Icon name="Fingerprint" className={styles.logoIcon} />
      </div>

      <div className={styles.textContainer}>
        <h1
          className={styles.title}
          style={{
            transform: globalGlitch
              ? `translateX(${(Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 4)}px) skewX(${(Math.random() > 0.5 ? 1 : -1) * Math.random() * 5}deg)`
              : 'none',
            filter: globalGlitch
              ? `hue-rotate(${25 + Math.random() * 50}deg) saturate(3) brightness(1.5)`
              : 'none',
          }}
        >
          {isAnimating ? renderText() : <span className={styles.staticText}>{currentText}</span>}
        </h1>
      </div>
    </div>
  );
};

export default RedactedLogo;
