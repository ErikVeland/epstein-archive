import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import s from './Breadcrumb.module.css';

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
    <nav className={`${s.nav} ${className}`} aria-label="Breadcrumb">
      <ol className={s.list}>
        {items.map((item, index) => (
          <li key={index} className={s.item}>
            {index > 0 && <ChevronRight className={s.chevron} />}
            {index === 0 && <Home className={s.homeIcon} />}
            {index === items.length - 1 ? (
              <span className={s.current}>{item.label}</span>
            ) : item.onClick ? (
              <button onClick={item.onClick} className={s.link}>
                {item.label}
              </button>
            ) : (
              <span className={s.plain}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
