import React from 'react';
import { AlertTriangle } from 'lucide-react';
import s from './SensitiveWarningBanner.module.css';

interface SensitiveWarningBannerProps {
  /** Type of media for contextual warning message */
  mediaType: 'audio' | 'video' | 'photo';
}

/**
 * Shared sensitive content warning banner displayed when viewing
 * albums containing potentially disturbing material.
 */
export function SensitiveWarningBanner({
  mediaType,
}: SensitiveWarningBannerProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = React.useState(true);
  const storageKey = `dismissed_warning_${mediaType}`;

  React.useEffect(() => {
    if (sessionStorage.getItem(storageKey)) {
      setIsVisible(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(storageKey, 'true');
  };

  if (!isVisible) return null;

  const mediaTypeLabel =
    mediaType === 'audio' ? 'audio' : mediaType === 'video' ? 'video' : 'image';
  const discretionLabel =
    mediaType === 'audio' ? 'Listener' : mediaType === 'video' ? 'Viewer' : 'Viewer';

  return (
    <div className={s.banner}>
      <AlertTriangle className={s.icon} size={20} />
      <div className={s.body}>
        <h4 className={s.heading}>Sensitive &amp; Disturbing Content</h4>
        <p className={s.message}>
          This album contains {mediaTypeLabel} testimony from victims and survivors. Content may be
          graphic, traumatic, and disturbing. {discretionLabel} discretion is strongly advised.
        </p>
      </div>
      <button onClick={handleDismiss} className={s.dismissBtn} aria-label="Dismiss warning">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}

export default SensitiveWarningBanner;
