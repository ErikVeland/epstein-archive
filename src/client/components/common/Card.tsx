import React from 'react';
import { cn } from '../../utils/cn';
import Icon, { IconName } from './Icon';
import { RedFlagIndex } from '../visualizations/RedFlagIndex';
import s from './Card.module.css';

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
      className={cn('surface-panel', s.root, onClick && s.clickable, className)}
    >
      {/* Header section with title, subtitle, and icon */}
      {(title || subtitle || icon || redFlagRating !== undefined) && (
        <div className={s.header}>
          <div className={s.headerLeft}>
            {icon && (
              <div className={s.iconWrapper}>
                <Icon name={icon} size="md" color={iconColor} />
              </div>
            )}
            <div className={s.textBlock}>
              {title && (
                <h3 className={s.title} title={title}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={s.subtitle} title={subtitle}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {redFlagRating !== undefined && (
            <div className={s.headerRight}>
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
      <div className={s.content}>{children}</div>

      {/* Metadata section */}
      {metadata.length > 0 && (
        <div className={s.metadata}>
          <div className={s.metadataList}>
            {metadata.map((item, index) => (
              <div key={index} className={s.metadataItem}>
                {item.icon && (
                  <span className={s.metaIconWrapper}>
                    <Icon name={item.icon} />
                  </span>
                )}
                <span className={s.metaLabel}>{item.label}:</span>
                <span className={s.metaValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {actionButtons.length > 0 && (
        <div className={s.actions}>
          {actionButtons.map((button, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                button.onClick();
              }}
              className={s.actionBtn}
              data-variant={button.variant ?? 'secondary'}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
