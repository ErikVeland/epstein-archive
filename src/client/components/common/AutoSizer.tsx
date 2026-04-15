import React, { useEffect, useRef, useState, ReactNode } from 'react';
import styles from './AutoSizer.module.css';

interface Size {
  width: number;
  height: number;
}

interface AutoSizerProps {
  children: (size: Size) => ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const AutoSizer: React.FC<AutoSizerProps> = ({ children, className, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });

    resizeObserver.observe(element);

    // Initial measure
    const rect = element.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      style={style}
    >
      {size.width > 0 && size.height > 0 && children(size)}
    </div>
  );
};

export default AutoSizer;
