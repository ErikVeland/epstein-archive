import React from 'react';
import { cn } from '../../lib';
import { buildSpacingStyles, type SpacingProps, type SizingProps } from '../../lib/resolveSpace';
import './Surface.css';

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement>, SpacingProps, SizingProps {
  variant?: 'glass' | 'glass-strong' | 'glass-highlight' | 'solid' | 'panel' | 'outline';
  accent?: 'amber' | 'cyan' | 'purple' | 'rose' | 'emerald';
  children?: React.ReactNode;
  as?: React.ElementType;
}

export const Surface: React.FC<SurfaceProps> = ({
  variant = 'glass',
  accent,
  children,
  className,
  as: Component = 'div',
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
    <Component
      className={cn(
        'lq-surface',
        `lq-surface--${variant}`,
        accent && `lq-surface--accent-${accent}`,
        className,
      )}
      style={{ ...spacingStyle, ...style }}
      {...props}
    >
      {children}
    </Component>
  );
};
