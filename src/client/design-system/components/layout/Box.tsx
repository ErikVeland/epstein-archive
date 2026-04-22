import React, { forwardRef } from 'react';
import { cn } from '../../../utils/cn';
import { buildSpacingStyles, type SpacingProps, type SizingProps } from '../../lib/resolveSpace';
import './Box.css';

export interface BoxProps extends React.HTMLAttributes<HTMLElement>, SpacingProps, SizingProps {
  children?: React.ReactNode;
  as?: React.ElementType;
  grow?: boolean;
  fullHeight?: boolean;
  fullWidth?: boolean;
  bgcolor?: string;
  flex?: boolean;
  direction?: 'row' | 'column';
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
      grow,
      fullHeight,
      fullWidth,
      bgcolor,
      flex,
      direction,
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

    const customStyle = {
      ...spacingStyle,
      ...(grow && { flexGrow: 1 }),
      ...(fullHeight && { height: '100%' }),
      ...(fullWidth && { width: '100%' }),
      ...(bgcolor && { backgroundColor: bgcolor }),
      ...(flex && { display: 'flex' }),
      ...(direction && { flexDirection: direction }),
      ...style,
    } as React.CSSProperties;

    return (
      <Component ref={ref} className={cn('lq-box', className)} style={customStyle} {...props}>
        {children}
      </Component>
    );
  },
);

Box.displayName = 'Box';
