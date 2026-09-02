import type { ReactNode } from 'react';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { Link } from 'react-router-dom';
import type { Person } from '@client/types';
import { Breadcrumb } from '@client/components/layout/Breadcrumb';
import Icon from '@client/components/common/Icon';
import LoadingIndicator from '@client/components/common/LoadingIndicator';
import { SEO } from '@client/components/common/SEO';
import { FirstRunOnboarding } from '@client/components/FirstRunOnboarding';
import MobileMenu from '@client/components/layout/MobileMenu';
import { RedactedLogo } from '@client/components/RedactedLogo';
import { cn } from '@client/utils/cn';
import {
  BottomSheet,
  Button,
  Input,
  LqText,
  SearchField,
  ShellActionButton,
  Stack,
  Surface,
} from '@client/design-system/lib';
import styles from '@client/App.module.css';
import { SegmentedNav } from './SegmentedNav';

export function AppShellLayout(props: {
  seoConfig: React.ComponentProps<typeof SEO>;
  shouldShowOnboarding: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  isMobile: boolean;
  navigate: NavigateFunction;
  isAdmin: boolean;
  activeTab: string;
  breadcrumbLabel: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileSearchOpen: boolean;
  setIsMobileSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReleaseNotes: React.Dispatch<React.SetStateAction<boolean>>;
  setShowKeyboardShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: (next: string) => void;
  searchSuggestions: Array<
    | (Person & { kind: 'entity'; canonicalName?: string; matchedAlias?: string | null })
    | { kind: 'document'; id: string; title: string; snippet?: string; evidenceType?: string }
  >;
  searchSuggestionsLoading: boolean;
  onPersonClick: (person: Person) => void;
  onDocumentSuggestionClick: (documentId: string) => void;
  openSearchResultsRoute: () => void;
  filters: { timeRange: [string | null, string | null] };
  setFilters: (next: { timeRange: [string | null, string | null] }) => void;
  showDateRangePicker: boolean;
  setShowDateRangePicker: React.Dispatch<React.SetStateAction<boolean>>;
  isInitializing: boolean;
  analyticsLoading: boolean;
  loadingProgress: string;
  children: ReactNode;
}) {
  const {
    seoConfig,
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding,
    isMobile,
    navigate,
    isAdmin,
    activeTab,
    breadcrumbLabel,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    setShowReleaseNotes,
    setShowKeyboardShortcuts,
    searchTerm,
    setSearchTerm,
    searchSuggestions,
    searchSuggestionsLoading,
    onPersonClick,
    onDocumentSuggestionClick,
    openSearchResultsRoute,
    filters,
    setFilters,
    showDateRangePicker,
    setShowDateRangePicker,
    isInitializing,
    analyticsLoading,
    loadingProgress,
    children,
  } = props;

  const dateRangePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showDateRangePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dateRangePickerRef.current && !dateRangePickerRef.current.contains(e.target as Node)) {
        setShowDateRangePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDateRangePicker, setShowDateRangePicker]);

  const clearDateFilter = useCallback(() => {
    setFilters({ timeRange: [null, null] });
    setShowDateRangePicker(false);
  }, [setFilters, setShowDateRangePicker]);

  const renderDateFilterFields = useCallback(
    (className?: string) => (
      <div className={cn(styles.dateFilterFields, className)}>
        <div>
          <label htmlFor="global-date-from" className={styles.dateFilterLabel}>
            From
          </label>
          <Input
            id="global-date-from"
            type="date"
            className={styles.dateInput}
            value={filters.timeRange[0] ?? ''}
            onChange={(e) =>
              setFilters({
                timeRange: [e.target.value || null, filters.timeRange[1]],
              })
            }
          />
        </div>
        <div>
          <label htmlFor="global-date-to" className={styles.dateFilterLabel}>
            To
          </label>
          <Input
            id="global-date-to"
            type="date"
            className={styles.dateInput}
            value={filters.timeRange[1] ?? ''}
            onChange={(e) =>
              setFilters({
                timeRange: [filters.timeRange[0], e.target.value || null],
              })
            }
          />
        </div>
        {(filters.timeRange[0] || filters.timeRange[1]) && (
          <Button unstyled onClick={clearDateFilter} className={styles.dateClearButton}>
            Clear date filter
          </Button>
        )}
      </div>
    ),
    [clearDateFilter, filters.timeRange, setFilters],
  );

  const renderSearchSuggestions = useCallback(
    (containerClassName?: string) => (
      <Surface className={cn(styles.searchDropdown, containerClassName)}>
        <div className={styles.searchDropdownHeader}>Search results for "{searchTerm}"</div>
        {searchSuggestionsLoading ? (
          <div className={styles.searchDropdownLoading}>
            <div className={styles.miniSpinner}></div>
            Searching…
          </div>
        ) : searchSuggestions.length > 0 ? (
          searchSuggestions.slice(0, 8).map((suggestion, i) =>
            suggestion.kind === 'entity' ? (
              <Button
                unstyled
                key={`entity-sugg-${String(suggestion.id)}-${i}`}
                className={styles.searchSuggestionButton}
                onClick={() => {
                  onPersonClick(suggestion);
                  setIsMobileSearchOpen(false);
                }}
              >
                <Icon name="User" size="sm" color="gray" />
                <span className={styles.searchSuggestionText}>
                  {suggestion.canonicalName || suggestion.name}
                  {suggestion.matchedAlias && (
                    <span className={styles.searchSuggestionAlias}>
                      ({suggestion.matchedAlias})
                    </span>
                  )}
                </span>
                <span className={styles.searchSuggestionMeta}>
                  {suggestion.role !== 'Unknown' ? suggestion.role : 'Subject'}
                </span>
              </Button>
            ) : (
              <Button
                unstyled
                key={`doc-sugg-${suggestion.id}-${i}`}
                className={styles.searchDocButton}
                onClick={() => {
                  onDocumentSuggestionClick(suggestion.id);
                  setIsMobileSearchOpen(false);
                }}
              >
                <Icon name="FileText" size="sm" color="gray" className={styles.searchDocIcon} />
                <span className={styles.searchDocBody}>
                  <span className={styles.searchDocTitle}>{suggestion.title}</span>
                  {suggestion.snippet && (
                    <span className={styles.searchDocSnippet}>
                      {suggestion.snippet.replace(/<[^>]+>/g, '')}
                    </span>
                  )}
                </span>
                <span className={styles.searchDocMeta}>
                  {suggestion.evidenceType || 'Document'}
                </span>
              </Button>
            ),
          )
        ) : (
          <div className={styles.searchDropdownEmpty}>No subjects or documents found</div>
        )}
        <div className={styles.searchDropdownFooter}>
          <Button unstyled className={styles.searchAllButton} onClick={openSearchResultsRoute}>
            <Icon name="Search" size="sm" />
            <span>Search all documents for "{searchTerm}"</span>
          </Button>
        </div>
      </Surface>
    ),
    [
      onDocumentSuggestionClick,
      onPersonClick,
      openSearchResultsRoute,
      searchSuggestions,
      searchSuggestionsLoading,
      searchTerm,
      setIsMobileSearchOpen,
    ],
  );

  const dateFilterActive = Boolean(filters.timeRange[0] || filters.timeRange[1]);
  const dateFilterLabel = useMemo(() => {
    if (!dateFilterActive) return null;
    return `${filters.timeRange[0] ?? '…'} – ${filters.timeRange[1] ?? '…'}`;
  }, [dateFilterActive, filters.timeRange]);

  return (
    <>
      <SEO {...seoConfig} />
      {shouldShowOnboarding && (
        <FirstRunOnboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />
      )}

      <div className={styles.srOnly}>
        <a href="#main-content" className={styles.skipLink}>
          Skip to main content
        </a>
        <a href="#navigation" className={cn(styles.skipLink, styles.skipNavigation)}>
          Skip to navigation
        </a>
      </div>

      <div className={styles.bgEffects} />

      <header className={cn(styles.headerShell)}>
        <div className={styles.contentShell}>
          <div className={styles.header}>
            {!isMobile && (
              <div className={styles.logoArea}>
                <Link to="/" className={styles.logoArea}>
                  <RedactedLogo text="THE EPSTEIN FILES" />
                </Link>
              </div>
            )}

            <div className={styles.actionsArea}>
              {!isMobile && (
                <>
                  <div className={styles.buttonGroup}>
                    <ShellActionButton
                      onClick={() => navigate('/investigations')}
                      icon="Plus"
                      iconColor="white"
                      label="New"
                      title="New Investigation"
                    />
                    <ShellActionButton
                      onClick={() => setShowKeyboardShortcuts(true)}
                      icon="Command"
                      iconColor="info"
                      label="Shortcuts"
                      title="Keyboard Shortcuts"
                    />
                    <ShellActionButton
                      onClick={() => navigate('/about')}
                      icon="Shield"
                      iconColor="success"
                      label="Sources"
                      title="Verified Sources"
                    />
                    <ShellActionButton
                      onClick={() => setShowReleaseNotes(true)}
                      icon="Book"
                      iconColor="info"
                      label="What's New"
                      title="What's New"
                    />
                    {isAdmin && (
                      <ShellActionButton
                        onClick={() => navigate('/admin')}
                        icon="Shield"
                        iconClassName={styles.adminIcon}
                        label="Admin"
                        labelClassName={styles.adminButtonText}
                        title="Admin Dashboard"
                      />
                    )}
                  </div>

                  <div className={styles.searchWrapper}>
                    <div className={styles.headerSearchPill}>
                      <SearchField
                        type="text"
                        placeholder="Search evidence..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchTerm.trim()) {
                            openSearchResultsRoute();
                          } else if (e.key === 'Escape') {
                            setSearchTerm('');
                            e.currentTarget.blur();
                          }
                        }}
                        rootClassName={styles.headerSearchFieldRoot}
                        className={styles.headerSearchFieldInput}
                      />
                      {searchTerm.trim().length > 0 && (
                        <Button
                          unstyled
                          type="button"
                          onClick={() => setSearchTerm('')}
                          aria-label="Clear search"
                          className={styles.searchClearButton}
                        >
                          <Icon name="X" size="xs" />
                        </Button>
                      )}
                      <Button
                        unstyled
                        onClick={openSearchResultsRoute}
                        aria-label="Run search"
                        className={cn(styles.searchButton)}
                      >
                        <Icon name="Search" size="sm" />
                      </Button>
                    </div>
                    {searchTerm.trim().length >= 2 && renderSearchSuggestions()}
                  </div>

                  <div ref={dateRangePickerRef} className={styles.dateFilterWrap}>
                    <Button
                      onClick={() => setShowDateRangePicker((v) => !v)}
                      aria-expanded={showDateRangePicker}
                      aria-haspopup="dialog"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        styles.dateFilterButton,
                        dateFilterActive && styles.dateFilterButtonActive,
                      )}
                      title="Global date range filter"
                    >
                      <Icon
                        name="Calendar"
                        size="sm"
                        color={dateFilterActive ? 'warning' : 'gray'}
                      />
                      {dateFilterLabel && (
                        <span className={styles.dateFilterValue}>{dateFilterLabel}</span>
                      )}
                    </Button>
                    {showDateRangePicker && (
                      <Surface
                        className={styles.dateFilterPanel}
                        role="dialog"
                        aria-label="Global date range filter"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setShowDateRangePicker(false);
                          }
                        }}
                      >
                        <div className={styles.dateFilterTitle}>Global Date Filter</div>
                        {renderDateFilterFields()}
                      </Surface>
                    )}
                  </div>
                </>
              )}

              {isMobile && (
                <div className={styles.mobileHeaderStack}>
                  <div className={styles.mobileHeaderTopRow}>
                    <Link
                      to="/"
                      className={styles.logoArea}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <RedactedLogo text="THE EPSTEIN FILES" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={cn(styles.contentShell, styles.mainShell)}>
        <LoadingIndicator
          isLoading={isInitializing || analyticsLoading}
          label={isInitializing ? loadingProgress : undefined}
        />

        <SegmentedNav
          activeTab={activeTab}
          navigate={navigate}
          shouldShowOnboarding={shouldShowOnboarding}
        />

        <MobileMenu
          open={isMobileMenuOpen}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onNavigate={(p) => navigate(p)}
          onClose={() => setIsMobileMenuOpen(false)}
          onSearch={(term) => {
            setSearchTerm(term);
            setIsMobileMenuOpen(false);
          }}
        />

        {isMobile && (
          <BottomSheet
            isOpen={isMobileSearchOpen || showDateRangePicker}
            onClose={() => {
              setIsMobileSearchOpen(false);
              setShowDateRangePicker(false);
            }}
            title="Search & Filters"
          >
            <Stack gap="lg" className={styles.mobileSheetStack}>
              <div className={styles.mobileSheetSearchRoot}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className={styles.mobileControlLabel}
                  style={{ marginBottom: '0.5rem' }}
                >
                  Archive Query
                </LqText>
                <SearchField
                  type="text"
                  placeholder="Search evidence…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      openSearchResultsRoute();
                      setIsMobileSearchOpen(false);
                    }
                  }}
                  rootClassName={styles.mobileSheetSearchRoot}
                  className={styles.mobileSheetSearchInput}
                  aria-label="Search the archive"
                />
                {searchTerm.trim().length >= 2 ? (
                  <div style={{ marginTop: '1rem' }}>
                    {renderSearchSuggestions(styles.mobileSheetDropdown)}
                  </div>
                ) : (
                  <Surface
                    variant="panel"
                    className={cn(
                      styles.mobileSearchEmptyState,
                      styles.mobileSearchEmptyStateOffset,
                    )}
                  >
                    <LqText variant="small" color="secondary">
                      Search people, evidence, and document excerpts.
                    </LqText>
                  </Surface>
                )}
              </div>

              <div className={cn(styles.divider, styles.mobileFilterDivider)} />

              <div className={styles.mobileDateSection}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="secondary"
                  className={styles.mobileControlLabel}
                  style={{ marginBottom: '0.5rem' }}
                >
                  Global Date Range
                </LqText>
                {renderDateFilterFields(styles.mobileDateFields)}
              </div>
            </Stack>
          </BottomSheet>
        )}

        <div id="main-content" className={styles.mainContent}>
          <div className={styles.breadcrumbContainer}>
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: breadcrumbLabel }]} />
          </div>
          <div className={styles.viewTransition}>
            <Suspense
              fallback={
                <div className={styles.centerLoader}>
                  <div className={styles.largeSpinner}></div>
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
