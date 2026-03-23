import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center gap-[var(--space-1)]">
        {items.map((item, index) => (
          <li key={index} className="flex items-center min-w-0">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] mx-[var(--space-1)] shrink-0" />
            )}
            {index === 0 && (
              <Home
                className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
                style={{ marginRight: '0.375rem' }}
              />
            )}
            {index === items.length - 1 ? (
              <span className="text-[var(--text-primary)] font-medium truncate">{item.label}</span>
            ) : item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors truncate"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-[var(--text-muted)] truncate">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
