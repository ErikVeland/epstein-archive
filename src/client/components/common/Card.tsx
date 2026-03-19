import React from 'react';
import Icon, { IconName } from './Icon';
import { RedFlagIndex } from '../visualizations/RedFlagIndex';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?:
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'white'
    | 'gray';
  redFlagRating?: number;
  metadata?: Array<{
    label: string;
    value: string | number;
    icon?: IconName;
  }>;
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  title,
  subtitle,
  icon,
  iconColor = 'gray',
  redFlagRating,
  metadata = [],
  actionButtons = [],
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        surface-glass-card p-6
        active:scale-[0.99]
        transition-all duration-300 ${onClick ? 'cursor-pointer hover:bg-[var(--glass-bg-strong)] hover:border-[var(--glass-border-highlight)] hover:shadow-[var(--glass-shadow)]' : ''} group animate-fade-in
        ${className}
      `}
    >
      {/* Header section with title, subtitle, and icon */}
      {(title || subtitle || icon || redFlagRating !== undefined) && (
        <div className="flex items-start justify-between mb-5 gap-4">
          <div className="flex items-start space-x-4 overflow-hidden">
            {icon && (
              <div className="shrink-0 mt-0.5">
                <Icon name={icon} size="md" color={iconColor} />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3
                  className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight break-all"
                  title={title}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  className="text-sm text-[var(--text-secondary)] truncate mt-1.5 font-medium"
                  title={subtitle}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {redFlagRating !== undefined && (
            <div className="flex items-center shrink-0">
              <RedFlagIndex
                value={redFlagRating}
                size="sm"
                showLabel={false}
                variant="combined"
                showTextLabel={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="space-y-5">{children}</div>

      {/* Metadata section */}
      {metadata.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[var(--glass-border)]">
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-[var(--text-secondary)]">
            {metadata.map((item, index) => (
              <div
                key={index}
                className="flex items-center px-2 py-1 bg-[var(--glass-bg-strong)] rounded-md border border-[var(--glass-border)]"
              >
                {item.icon && (
                  <Icon name={item.icon} size="xs" className="mr-1.5 text-[var(--text-muted)]" />
                )}
                <span className="font-medium text-[var(--text-muted)] mr-1">{item.label}:</span>
                <span className="text-[var(--text-secondary)] font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {actionButtons.length > 0 && (
        <div className="mt-5 flex items-center justify-between pt-2">
          <div></div>
          <div className="flex items-center gap-2">
            {actionButtons.map((button, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  button.onClick();
                }}
                className={`
                  text-xs font-medium px-4 py-2 rounded-[var(--radius-lg)] transition-all duration-200
                  ${
                    button.variant === 'primary'
                      ? 'bg-[var(--accent)] hover:brightness-110 text-[var(--text-primary)] shadow-[var(--glass-shadow)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] border border-transparent hover:border-[var(--glass-border)]'
                  }
                `}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
