import React from 'react';
import { buildSpacingStyles, type SpacingProps, type SizingProps } from '../../lib/resolveSpace';
import './Stack.css';

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>, SpacingProps, SizingProps {
  align?: 'start' | 'center' | 'end' | 'stretch';
  children: React.ReactNode;
}

const alignMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

export const Stack: React.FC<StackProps> = ({
  align = 'stretch',
  className = '',
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
      className={`lq-stack ${className}`}
      style={
        {
          '--stack-align': alignMap[align] ?? 'stretch',
          ...spacingStyle,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
};
