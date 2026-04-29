import React, { forwardRef } from 'react';
import { cn } from '@client/utils/cn';
import {
  buildSpacingStyles,
  type SpacingProps,
  type SizingProps,
} from '@client/design-system/lib/resolveSpace';
import './Surface.css';

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement>, SpacingProps, SizingProps {
  variant?:
    | 'glass'
    | 'glass-strong'
    | 'glass-highlight'
    | 'solid'
    | 'panel'
    | 'outline'
    | 'glass-container';
  accent?: 'amber' | 'cyan' | 'purple' | 'rose' | 'emerald';
  children?: React.ReactNode;
  as?: React.ElementType;
  width?: number | string;
  grow?: boolean;
  fullWidth?: boolean;
}

export const Surface = forwardRef<HTMLElement, SurfaceProps>(
  (
    {
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
      width,
      grow,
      fullWidth,
      ...props
    },
    ref,
  ) => {
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
        ref={ref}
        className={cn(
          'lq-surface',
          `lq-surface--${variant}`,
          accent && `lq-surface--accent-${accent}`,
          className,
        )}
        style={{
          ...spacingStyle,
          ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
          ...(grow && { flexGrow: 1 }),
          ...(fullWidth && { width: '100%' }),
          ...style,
        }}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Surface.displayName = 'Surface';
