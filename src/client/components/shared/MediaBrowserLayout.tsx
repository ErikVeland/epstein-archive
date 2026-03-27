import React from 'react';
import { Button, EmptyState, Surface, StatusBanner, type IconName } from '@design-system';

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
    <Surface className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)]">
      {/* Header */}
      <div className="bg-[var(--glass-bg-strong)] border-b border-[var(--glass-border)] flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Album Dropdown */}
        {mobileAlbumDropdown}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-light text-[var(--text-primary)]">{title}</h2>
            <p className="text-[var(--text-muted)] text-xs hidden md:block">{subtitle}</p>
          </div>
          <button
            onClick={onToggleBatchMode}
            className={
              isBatchMode
                ? 'control h-8 min-h-8 bg-[var(--accent)] px-3 text-xs text-[var(--text-primary)]'
                : 'control h-8 min-h-8 px-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }
          >
            {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        {albumSidebar}

        {/* Main Content */}
        <div className="flex-1 bg-[var(--glass-bg)] flex flex-col overflow-hidden">
          {/* Loading overlay for initial load */}
          {loading && isInitialLoad && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--glass-bg)] backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--accent)]" />
            </div>
          )}

          {/* Warning Banner */}
          {warningBanner}

          {/* Error Display */}
          {error && (
            <StatusBanner tone="danger" className="mx-6 mt-6">
              {error}
            </StatusBanner>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-[var(--glass-bg-strong)] border-t border-[var(--glass-border)] flex items-center justify-between px-3 text-[10px] text-[var(--text-muted)] select-none shrink-0">
        <div>{footerLeft}</div>
        <div>{footerRight}</div>
      </div>

      {/* Batch Toolbar */}
      {batchToolbar}
    </Surface>
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
  return <EmptyState icon={icon} title={message} />;
}

/**
 * Load more button component
 */
export function LoadMoreButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <div className="text-center mt-8">
      <Button onClick={onClick} variant="secondary" className="rounded-full px-[var(--space-6)]">
        Load More
      </Button>
    </div>
  );
}

export default MediaBrowserLayout;
