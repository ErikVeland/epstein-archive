import React, { CSSProperties } from 'react';
import './Stack.css';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'none' | number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  gap = 'md',
  align = 'stretch',
  className = '',
  children,
  style,
  ...props
}) => {
  const styles: Record<string, any> = {};

  const alignMap = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch' };
  styles['--stack-align'] = alignMap[align] || 'stretch';

  if (typeof gap === 'number') {
    styles.gap = `${gap}px`;
  } else if (gap !== 'none') {
    const gapMap = { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' };
    styles.gap = gapMap[gap] || gapMap.md;
  }

  return (
    <div
      className={`lq-stack ${className}`}
      style={{ ...styles, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
};
