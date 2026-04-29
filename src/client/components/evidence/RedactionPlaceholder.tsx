import { useState } from 'react';
import Icon from '@client/components/common/Icon';
import styles from './RedactionPlaceholder.module.css';

interface RedactionPlaceholderProps {
  type: string; // inferred_class
  role?: string; // inferred_role
  confidence: number;
  originalText?: string; // If 'removed_text' type, what was the token? e.g. [REDACTED]
  kind: 'pdf_overlay' | 'removed_text' | 'image_box' | 'unknown';
}

export function RedactionPlaceholder({ type, role, confidence, kind }: RedactionPlaceholderProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'person':
        return <Icon name="User" className={styles.icon} />;
      case 'lawyer':
        return <Icon name="Briefcase" className={styles.icon} />;
      case 'org':
        return <Icon name="Building" className={styles.icon} />;
      case 'location':
        return <Icon name="MapPin" className={styles.icon} />;
      case 'contact':
        return <Icon name="Mail" className={styles.icon} />;
      case 'date':
        return <Icon name="Calendar" className={styles.icon} />;
      case 'id_number':
        return <Icon name="Hash" className={styles.icon} />;
      default:
        return <Icon name="Shield" className={styles.icon} />;
    }
  };

  const getStyles = () => {
    let state = styles.stateDefault;

    if (confidence > 0.8) {
      switch (type) {
        case 'person':
          state = styles.statePerson;
          break;
        case 'lawyer':
          state = styles.stateLawyer;
          break;
        case 'org':
          state = styles.stateOrg;
          break;
        case 'contact':
          state = styles.stateContact;
          break;
      }
    } else if (confidence < 0.4) {
      state = styles.stateMuted;
    }

    return state;
  };

  const label = role
    ? `${type.toUpperCase()}:${role.toUpperCase()}`
    : type?.toUpperCase() || 'REDACTED';
  const displayLabel = confidence > 0.6 ? `[${label}]` : '[REDACTED]';

  return (
    <span
      className={`${styles.root} ${getStyles()}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {getIcon()}
      {displayLabel}

      {showTooltip && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipTitle}>
            {type?.toUpperCase() || 'UNKNOWN'} {role ? `(${role})` : ''}
          </div>
          <div className={styles.tooltipMeta}>Confidence: {(confidence * 100).toFixed(0)}%</div>
          <div className={styles.tooltipSource}>Source: {kind.replace('_', ' ')}</div>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </span>
  );
}
