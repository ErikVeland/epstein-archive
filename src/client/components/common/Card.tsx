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
        bg-gradient-to-br from-slate-800/70 to-slate-900/50 backdrop-blur-sm 
        border border-slate-600 rounded-2xl p-6 
        hover:from-slate-800/80 hover:to-slate-900/60 hover:border-slate-500 hover:shadow-lg hover:shadow-blue-500/5
        active:scale-[0.99] active:bg-slate-800/90 
        transition-all duration-300 cursor-pointer group animate-fade-in
        ${onClick ? '' : ''}
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
                  className="text-lg font-bold text-white group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-tight break-all"
                  title={title}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-slate-400 truncate mt-1.5 font-medium" title={subtitle}>
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
        <div className="mt-5 pt-4 border-t border-slate-700/50">
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-400">
            {metadata.map((item, index) => (
              <div
                key={index}
                className="flex items-center px-2 py-1 bg-slate-800/50 rounded-md border border-slate-700/30"
              >
                {item.icon && <Icon name={item.icon} size="xs" className="mr-1.5 text-slate-500" />}
                <span className="font-medium text-slate-500 mr-1">{item.label}:</span>
                <span className="text-slate-300 font-semibold">{item.value}</span>
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
                  text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200
                  ${
                    button.variant === 'primary'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent hover:border-slate-600'
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
