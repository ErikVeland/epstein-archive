import React, { forwardRef } from 'react';
import { cn } from '../../lib';
import { buildSpacingStyles, type SpacingProps, type SizingProps } from '../../lib/resolveSpace';
import './Box.css';

export interface BoxProps extends React.HTMLAttributes<HTMLElement>, SpacingProps, SizingProps {
  children?: React.ReactNode;
  as?: React.ElementType;
}

export const Box = forwardRef<HTMLElement, BoxProps>(
  (
    {
      children,
      className,
      as: Component = 'div',
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
      style,
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
        className={cn('lq-box', className)}
        style={{ ...spacingStyle, ...style }}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Box.displayName = 'Box';
