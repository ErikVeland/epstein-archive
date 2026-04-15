import React, { useRef, useEffect, useState } from 'react';
import { useSensitiveSettings } from '../../contexts/SensitiveSettingsContext';
import { EyeOff } from 'lucide-react';
import { Button } from '../../design-system/lib';
import styles from './SensitiveContent.module.css';

interface SensitiveContentProps {
  isSensitive?: boolean;
  children: React.ReactNode;
  className?: string;
  label?: string;
}

/**
 * Wrapper component that blurs sensitive content until the user clicks to reveal.
 * Features a particle dispersion effect on click.
 * Respects the global showAllSensitive setting from SensitiveSettingsContext.
 */
export function SensitiveContent({
  isSensitive = false,
  children,
  className = '',
  label = 'Sensitive Content',
}: SensitiveContentProps): React.ReactElement {
  const { showAllSensitive } = useSensitiveSettings();
  const [revealed, setRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<
    Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }>
  >([]);
  const particleColorsRef = useRef<{ primary: string; secondary: string }>({
    primary: 'transparent',
    secondary: 'transparent',
  });

  const shouldHide = isSensitive && !showAllSensitive && !revealed;

  useEffect(() => {
    if (!shouldHide || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const resize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [shouldHide]);

  const handleReveal = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (isRevealing) return;

    setIsRevealing(true);

    const canvas = canvasRef.current;
    if (!canvas) {
      setRevealed(true);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setRevealed(true);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const rootStyles = getComputedStyle(document.documentElement);
    const primary = rootStyles.getPropertyValue('--text-muted').trim() || 'transparent';
    const secondary = rootStyles.getPropertyValue('--text-dim').trim() || primary;
    particleColorsRef.current = { primary, secondary };

    // Create particle explosion from click point
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      size: number;
    }> = [];
    const particleCount = 120;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = Math.random() * 6 + 2;
      const size = Math.random() * 3 + 1;

      particles.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size,
      });
    }

    // Add scatter particles
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.5,
        size: Math.random() * 2 + 1,
      });
    }

    particlesRef.current = particles;
    animate();
  };

  const animate = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeParticles = 0;

    particlesRef.current.forEach((p) => {
      if (p.alpha <= 0.01) return;

      // Update position
      p.x += p.vx;
      p.y += p.vy;

      // Apply friction and gravity
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vy += 0.2; // Gravity

      // Fade out
      p.alpha *= 0.95;

      const { primary, secondary } = particleColorsRef.current;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.alpha * 0.25;
      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
      ctx.fill();

      activeParticles++;
    });
    ctx.globalAlpha = 1;

    if (activeParticles > 0) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setRevealed(true);
      setIsRevealing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // If content should not be hidden, render children directly
  if (!shouldHide) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={containerRef} className={[styles.container, className].filter(Boolean).join(' ')}>
      {/* Blurred content */}
      <div
        className={[
          styles.content,
          isRevealing ? styles.contentRevealing : styles.contentIdle,
        ].join(' ')}
      >
        {children}
      </div>

      {/* Particle canvas - only visible during reveal */}
      {isRevealing && <canvas ref={canvasRef} className={styles.canvas} />}

      {/* Click overlay - hidden during reveal to allow interaction */}
      {!isRevealing && (
        <Button
          onClick={handleReveal}
          className={styles.overlay}
          aria-label="Click to reveal sensitive content"
          type="button"
          variant="ghost"
          size="sm"
        >
          {/* Backdrop */}
          <div className={styles.backdrop} />

          {/* Icon and label */}
          <div className={styles.overlayInner}>
            <div className={styles.iconWrap}>
              <EyeOff size={28} className={styles.icon} />
            </div>
            <div className={styles.labelGroup}>
              <span className={styles.label}>{label}</span>
              <span className={styles.hint}>Click to reveal</span>
            </div>
          </div>

          {/* Grain texture */}
          <div className={styles.grain} />
        </Button>
      )}
    </div>
  );
}
