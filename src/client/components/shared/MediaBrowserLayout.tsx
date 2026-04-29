import React from 'react';
import Icon from '../common/Icon';
import type { IconName } from '../common/Icon';
import s from './MediaBrowserLayout.module.css';

import { Button } from '@client/design-system/lib';

interface MediaBrowserLayoutProps {
  /** Page title (e.g., "Audio Recordings", "Video Recordings") */
  title: string;
  /** Page subtitle */
  subtitle: string;
  /** Whether batch mode is currently enabled */
  isBatchMode: boolean;
  /** Callback to toggle batch mode */
  onToggleBatchMode: () => void;
  /** Album dropdown component (rendered in header on mobile) */
  mobileAlbumDropdown: React.ReactNode;
  /** Album sidebar component (rendered on desktop) */
  albumSidebar: React.ReactNode;
  /** Warning banner to display (e.g., sensitive content warning) */
  warningBanner?: React.ReactNode;
  /** Error message to display */
  error?: string | null;
  /** Main content area */
  children: React.ReactNode;
  /** Footer content showing item count and current album */
  footerLeft: React.ReactNode;
  /** Footer content showing current view context */
  footerRight: React.ReactNode;
  /** Batch toolbar component (fixed position at bottom) */
  batchToolbar?: React.ReactNode;
  /** Whether content is loading (for initial load state) */
  loading?: boolean;
  /** Whether this is the initial page load */
  isInitialLoad?: boolean;
}

/**
 * Shared layout component for media browsers (Audio, Video, Photo).
 * Provides consistent structure with header, sidebar, content area, and footer.
 */
export function MediaBrowserLayout({
  title,
  subtitle,
  isBatchMode,
  onToggleBatchMode,
  mobileAlbumDropdown,
  albumSidebar,
  warningBanner,
  error,
  children,
  footerLeft,
  footerRight,
  batchToolbar,
  loading = false,
  isInitialLoad = false,
}: MediaBrowserLayoutProps): React.ReactElement {
  return (
    <div className={s.root}>
      {/* Header */}
      <div className={s.header}>
        {/* Mobile Album Dropdown */}
        {mobileAlbumDropdown}

        <div className={s.titleGroup}>
          <div>
            <h2 className={s.titleText}>{title}</h2>
            <p className={s.subtitle}>{subtitle}</p>
          </div>
          <Button
            unstyled
            onClick={onToggleBatchMode}
            className={`${s.batchBtn} ${isBatchMode ? s.batchBtnActive : ''}`}
          >
            {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
          </Button>
        </div>
      </div>

      <div className={s.body}>
        {/* Albums sidebar - Hidden on mobile */}
        {albumSidebar}

        {/* Main Content */}
        <div className={s.main}>
          {/* Loading overlay for initial load */}
          {loading && isInitialLoad && (
            <div className={s.loadingOverlay}>
              <div className={s.spinner} />
            </div>
          )}

          {/* Warning Banner */}
          {warningBanner}

          {/* Error Display */}
          {error && <div className={s.errorBox}>{error}</div>}

          {/* Content Area */}
          <div className={s.content}>{children}</div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className={s.footer}>
        <div>{footerLeft}</div>
        <div>{footerRight}</div>
      </div>

      {/* Batch Toolbar */}
      {batchToolbar}
    </div>
  );
}

/**
 * Empty state component for when no media items are found
 */
export function MediaEmptyState({
  icon,
  message,
}: {
  icon: IconName;
  message: string;
}): React.ReactElement {
  return (
    <div className={s.emptyState}>
      <Icon name={icon} size="lg" className={s.emptyIcon} />
      <p>{message}</p>
    </div>
  );
}

/**
 * Load more button component
 */
export function LoadMoreButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <div className={s.loadMoreWrap}>
      <Button unstyled onClick={onClick} className={s.loadMoreBtn}>
        Load More
      </Button>
    </div>
  );
}

export default MediaBrowserLayout;
