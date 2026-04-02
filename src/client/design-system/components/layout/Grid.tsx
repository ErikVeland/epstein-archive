import React, { CSSProperties } from 'react';
import './Grid.css';

export interface GridBreakpoints {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | GridBreakpoints;
  gap?: 'sm' | 'md' | 'lg' | 'none' | number;
  className?: string;
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  gap = 'md',
  className = '',
  children,
  style,
  ...props
}) => {
  const gridStyles: Record<string, string | number> = {};

  if (typeof cols === 'number') {
    gridStyles['--grid-cols'] = cols;
  } else {
    if (cols.base) gridStyles['--grid-cols'] = cols.base;
    if (cols.sm) gridStyles['--grid-cols-sm'] = cols.sm;
    if (cols.md) gridStyles['--grid-cols-md'] = cols.md;
    if (cols.lg) gridStyles['--grid-cols-lg'] = cols.lg;
    if (cols.xl) gridStyles['--grid-cols-xl'] = cols.xl;
  }

  // Handle gap
  if (typeof gap === 'number') {
    gridStyles['--grid-gap'] = `${gap}px`;
  } else {
    const gapMap = { none: '0px', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' };
    gridStyles['--grid-gap'] = gapMap[gap] || gapMap.md;
  }

  return (
    <div
      className={`lq-grid ${className}`}
      style={{ ...gridStyles, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
};
