import React, { useRef, useEffect, useState } from 'react';
import { useSensitiveSettings } from '../../contexts/SensitiveSettingsContext';
import { EyeOff } from 'lucide-react';
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

      // Draw particle with glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(148, 163, 184, ${p.alpha})`);
      gradient.addColorStop(1, `rgba(71, 85, 105, ${p.alpha * 0.3})`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      activeParticles++;
    });

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
        style={{
          filter: isRevealing ? 'blur(8px) brightness(0.7)' : 'blur(40px) brightness(0.5)',
        }}
      >
        {children}
      </div>

      {/* Particle canvas - only visible during reveal */}
      {isRevealing && <canvas ref={canvasRef} className={styles.canvas} />}

      {/* Click overlay - hidden during reveal to allow interaction */}
      {!isRevealing && (
        <button
          onClick={handleReveal}
          className={styles.overlay}
          aria-label="Click to reveal sensitive content"
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
          <div
            className={styles.grain}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />
        </button>
      )}
    </div>
  );
}
