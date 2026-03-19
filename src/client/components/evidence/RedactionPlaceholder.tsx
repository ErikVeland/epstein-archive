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

interface RedactionPlaceholderProps {
  type: string; // inferred_class
  role?: string; // inferred_role
  confidence: number;
  originalText?: string; // If 'removed_text' type, what was the token? e.g. [REDACTED]
  kind: 'pdf_overlay' | 'removed_text' | 'image_box' | 'unknown';
}

export function RedactionPlaceholder({ type, role, confidence, kind }: RedactionPlaceholderProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case 'person':
        return <User className="w-3 h-3" />;
      case 'lawyer':
        return <Briefcase className="w-3 h-3" />;
      case 'org':
        return <Building className="w-3 h-3" />;
      case 'location':
        return <MapPin className="w-3 h-3" />;
      case 'contact':
        return <Mail className="w-3 h-3" />;
      case 'date':
        return <Calendar className="w-3 h-3" />;
      case 'id_number':
        return <Hash className="w-3 h-3" />;
      default:
        return <Shield className="w-3 h-3" />;
    }
  };

  // Color mapping based on type and confidence
  const getStyles = () => {
    // const opacity = Math.max(0.6, confidence); // Minimum opacity 0.6

    // Base colors
    let bg = 'bg-[var(--app-bg)]';
    let text = 'text-[var(--text-primary)]';
    let border = 'border-[var(--glass-border)]';

    if (confidence > 0.8) {
      // High confidence styling
      switch (type) {
        case 'person':
          bg = 'bg-blue-100';
          text = 'text-blue-800';
          border = 'border-blue-200';
          break;
        case 'lawyer':
          bg = 'bg-purple-100';
          text = 'text-purple-800';
          border = 'border-purple-200';
          break;
        case 'org':
          bg = 'bg-emerald-100';
          text = 'text-emerald-800';
          border = 'border-emerald-200';
          break;
        case 'contact':
          bg = 'bg-amber-100';
          text = 'text-amber-800';
          border = 'border-amber-200';
          break;
      }
    } else if (confidence < 0.4) {
      // Low confidence styling
      bg = 'bg-[var(--app-bg)]';
      text = 'text-[var(--text-muted)]';
      border = 'border-[var(--glass-border)]';
    }

    return `${bg} ${text} ${border}`;
  };

  const label = role
    ? `${type.toUpperCase()}:${role.toUpperCase()}`
    : type?.toUpperCase() || 'REDACTED';
  const displayLabel = confidence > 0.6 ? `[${label}]` : '[REDACTED]';

  return (
    <span
      className={`relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-mono select-none cursor-help ${getStyles()}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {getIcon()}
      {displayLabel}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--glass-bg-strong)] text-[var(--text-primary)] text-xs rounded shadow-[var(--glass-shadow)] whitespace-nowrap z-50">
          <div className="font-semibold">
            {type?.toUpperCase() || 'UNKNOWN'} {role ? `(${role})` : ''}
          </div>
          <div className="text-[var(--text-secondary)] text-[10px]">
            Confidence: {(confidence * 100).toFixed(0)}%
          </div>
          <div className="text-[var(--text-muted)] text-[10px] italic">
            Source: {kind.replace('_', ' ')}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </span>
  );
}
