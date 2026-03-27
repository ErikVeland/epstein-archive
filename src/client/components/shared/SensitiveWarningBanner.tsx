import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
    <div className="status-banner status-banner-danger relative rounded-none border-x-0 border-t-0">
      <AlertTriangle className="shrink-0 mt-0.5" size={20} />
      <div className="flex-1 pr-6">
        <h4 className="font-bold text-sm uppercase tracking-wider">
          Sensitive & Disturbing Content
        </h4>
        <p className="text-sm mt-1 opacity-90">
          This album contains {mediaTypeLabel} testimony from victims and survivors. Content may be
          graphic, traumatic, and disturbing. {discretionLabel} discretion is strongly advised.
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 p-1.5 rounded-full transition-colors opacity-70 hover:opacity-100 hover:bg-[var(--glass-bg-highlight)]"
        aria-label="Dismiss warning"
      >
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
