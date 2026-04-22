import React from 'react';
import { cn } from '../../../utils/cn';
import { buildSpacingStyles, type SpacingProps, type SizingProps } from '../../lib/resolveSpace';
import './Flex.css';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement>, SpacingProps, SizingProps {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  children: React.ReactNode;
  grow?: boolean;
  fullWidth?: boolean;
  fullHeight?: boolean;
}

const alignMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const justifyMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = 'nowrap',
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
  fullWidth,
  fullHeight,
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
      className={cn('lq-flex', className)}
      style={
        {
          '--flex-direction': direction,
          '--flex-align': alignMap[align] ?? 'stretch',
          '--flex-justify': justifyMap[justify] ?? 'flex-start',
          '--flex-wrap': wrap,
          ...spacingStyle,
          ...(grow && { flexGrow: 1 }),
          ...(fullWidth && { width: '100%' }),
          ...(fullHeight && { height: '100%' }),
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
};
