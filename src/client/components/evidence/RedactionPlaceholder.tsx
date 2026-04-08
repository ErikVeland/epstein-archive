import { useState } from 'react';
import {
  Shield,
  // HelpCircle,
  User,
  Briefcase,
  Building,
  MapPin,
  Mail,
  Calendar,
  Hash,
} from 'lucide-react';
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
        return <User className={styles.icon} />;
      case 'lawyer':
        return <Briefcase className={styles.icon} />;
      case 'org':
        return <Building className={styles.icon} />;
      case 'location':
        return <MapPin className={styles.icon} />;
      case 'contact':
        return <Mail className={styles.icon} />;
      case 'date':
        return <Calendar className={styles.icon} />;
      case 'id_number':
        return <Hash className={styles.icon} />;
      default:
        return <Shield className={styles.icon} />;
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
