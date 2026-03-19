import React from 'react';

interface BaseCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const BaseCard: React.FC<BaseCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[var(--bg-elevated)] 
        border border-[var(--border-subtle)] 
        rounded-[var(--radius-lg)] 
        p-[var(--space-4)] 
        transition-all duration-200
        hover:border-[var(--accent)]
        hover:shadow-[var(--glass-shadow)]
        cursor-pointer
        ${onClick ? 'hover:translate-y-[-2px]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
