import React, { CSSProperties } from 'react';
import './Flex.css';

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none' | number;
  className?: string;
  children: React.ReactNode;
}

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = 'nowrap',
  gap = 'none',
  className = '',
  children,
  style,
  ...props
}) => {
  const styles: Record<string, string | number> = {};

  styles['--flex-direction'] = direction;

  const alignMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
    baseline: 'baseline',
  };
  styles['--flex-align'] = alignMap[align] || 'stretch';

  const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };
  styles['--flex-justify'] = justifyMap[justify] || 'flex-start';

  styles['--flex-wrap'] = wrap;

  if (typeof gap === 'number') {
    styles.gap = `${gap}px`;
  } else if (gap !== 'none') {
    const gapMap = { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' };
    styles.gap = gapMap[gap] || '0px';
  }

  return (
    <div
      className={`lq-flex ${className}`}
      style={{ ...styles, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
};
