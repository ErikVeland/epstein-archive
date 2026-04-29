import React from 'react';
import { cn } from '@client/utils/cn';
import {
  buildSpacingStyles,
  type SpacingProps,
  type SizingProps,
} from '@client/design-system/lib/resolveSpace';
import './Grid.css';

export interface GridBreakpoints {
  base?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

export interface GridProps extends React.HTMLAttributes<HTMLDivElement>, SpacingProps, SizingProps {
  cols?: number | GridBreakpoints;
  children: React.ReactNode;
  align?: string;
  gridColumn?: string;
}

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  className,
  children,
  style,
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  gap,
  w,
  h,
  minW,
  minH,
  maxW,
  maxH,
  ...props
}) => {
  const colStyles: Record<string, number> = {};
  if (typeof cols === 'number') {
    colStyles['--grid-cols'] = cols;
  } else {
    if (cols.base !== undefined) colStyles['--grid-cols'] = cols.base;
    if (cols.sm !== undefined) colStyles['--grid-cols-sm'] = cols.sm;
    if (cols.md !== undefined) colStyles['--grid-cols-md'] = cols.md;
    if (cols.lg !== undefined) colStyles['--grid-cols-lg'] = cols.lg;
    if (cols.xl !== undefined) colStyles['--grid-cols-xl'] = cols.xl;
  }

  const spacingStyle = buildSpacingStyles({
    p,
    px,
    py,
    pt,
    pb,
    pl,
    pr,
    m,
    mx,
    my,
    mt,
    mb,
    ml,
    mr,
    gap,
    w,
    h,
    minW,
    minH,
    maxW,
    maxH,
  });

  return (
    <div
      className={cn('lq-grid', className)}
      style={{ ...colStyles, ...spacingStyle, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
};
