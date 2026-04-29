import React from 'react';
import Icon from '@client/components/common/Icon';
import s from './EntityMentionPill.module.css';

interface EntityMentionPillProps {
  entityId?: string | number | null;
  entityName: string;
  onOpen?: (entityId: string) => void;
  showIcon?: boolean;
  className?: string;
}

/**
 * Renders an entity name as a clickable pill that opens the entity modal.
 * Falls back to a plain non-interactive chip if no entityId is available.
 */
export const EntityMentionPill: React.FC<EntityMentionPillProps> = ({
  entityId,
  entityName,
  onOpen,
  showIcon = true,
  className,
}) => {
  if (!entityId) {
    return (
      <span className={`${s.pillPlain}${className ? ` ${className}` : ''}`}>
        {showIcon && <Icon name="User" size="xs" className={s.icon} />}
        {entityName}
      </span>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen?.(String(entityId));
  };

  return (
    <button
      type="button"
      className={`${s.pill}${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      title={`View profile: ${entityName}`}
    >
      {showIcon && <Icon name="User" size="xs" className={s.icon} />}
      {entityName}
    </button>
  );
};
