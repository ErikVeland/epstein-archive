import React from 'react';

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
    <section className={`mt-[var(--space-6)] mb-[var(--space-3)] first:mt-0 ${className}`}>
      {title && (
        <h2 className="text-[var(--font-size-h2)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
          {title}
        </h2>
      )}
      <div className="space-y-[var(--space-4)]">{children}</div>
    </section>
  );
};

interface CardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const CardGrid: React.FC<CardGridProps> = ({ children, columns = 3, className = '' }) => {
  const getColumnClass = () => {
    switch (columns) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <div className={`grid ${getColumnClass()} gap-[var(--space-4)] ${className}`}>{children}</div>
  );
};
