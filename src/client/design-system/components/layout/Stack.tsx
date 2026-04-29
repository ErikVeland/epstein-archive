import React from 'react';
import { cn } from '@client/utils/cn';
import {
  buildSpacingStyles,
  type SpacingProps,
  type SizingProps,
} from '@client/design-system/lib/resolveSpace';
import './Stack.css';

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>, SpacingProps, SizingProps {
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  children: React.ReactNode;
  grow?: boolean;
  fullHeight?: boolean;
  width?: number | string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

const alignMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export const Stack: React.FC<StackProps> = ({
  align = 'stretch',
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
  grow,
  fullHeight,
  width,
  textAlign,
  justify,
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
    <div
      className={cn('lq-stack', className)}
      style={
        {
          '--stack-align': alignMap[align] ?? 'stretch',
          '--stack-justify': justify !== undefined ? (justifyMap[justify] ?? 'normal') : 'normal',
          ...spacingStyle,
          ...(grow && { flexGrow: 1 }),
          ...(fullHeight && { height: '100%' }),
          ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
          ...(textAlign && { textAlign }),
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
};
