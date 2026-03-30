import React from 'react';
import s from './Layout.module.css';

interface LayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, maxWidth = 'xl', className = '' }) => {
  const getShellClass = () => {
    switch (maxWidth) {
      case 'full':
        return 'content-shell edge-breakout';
      default:
        return 'content-shell';
    }
  };

  return <div className={`${getShellClass()} ${className}`}>{children}</div>;
};

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ children, title, className = '' }) => {
  return (
    <section className={`${s.section} ${className}`}>
      {title && <h2 className={s.sectionTitle}>{title}</h2>}
      <div className={s.sectionBody}>{children}</div>
    </section>
  );
};

interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

const columnClass: Record<number, string> = {
  1: s.grid1,
  2: s.grid2,
  3: s.grid3,
  4: s.grid4,
};

export const CardGrid: React.FC<CardGridProps> = ({ children, columns = 3, className = '' }) => {
  return (
    <div className={`${s.gridWrap} ${columnClass[columns] ?? s.grid3} ${className}`}>
      {children}
    </div>
  );
};
