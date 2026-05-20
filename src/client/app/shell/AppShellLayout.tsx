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
  showReleaseNotes: boolean;
  setShowReleaseNotes: React.Dispatch<React.SetStateAction<boolean>>;
  showKeyboardShortcuts: boolean;
  setShowKeyboardShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  setShowCreateEntityModal: React.Dispatch<React.SetStateAction<boolean>>;
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
  const dateRangePickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!props.showDateRangePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dateRangePickerRef.current && !dateRangePickerRef.current.contains(e.target as Node)) {
        props.setShowDateRangePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [props.showDateRangePicker, props.setShowDateRangePicker]);

  const clearDateFilter = useCallback(() => {
    props.setFilters({ timeRange: [null, null] });
    props.setShowDateRangePicker(false);
  }, [props.setFilters, props.setShowDateRangePicker]);

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
            value={props.filters.timeRange[0] ?? ''}
            onChange={(e) =>
              props.setFilters({
                timeRange: [e.target.value || null, props.filters.timeRange[1]],
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
            value={props.filters.timeRange[1] ?? ''}
            onChange={(e) =>
              props.setFilters({
                timeRange: [props.filters.timeRange[0], e.target.value || null],
              })
            }
          />
        </div>
        {(props.filters.timeRange[0] || props.filters.timeRange[1]) && (
          <Button unstyled onClick={clearDateFilter} className={styles.dateClearButton}>
            Clear date filter
          </Button>
        )}
      </div>
    ),
    [clearDateFilter, props.filters.timeRange, props.setFilters],
  );

  const renderSearchSuggestions = useCallback(
    (containerClassName?: string) => (
      <Surface className={cn(styles.searchDropdown, containerClassName)}>
        <div className={styles.searchDropdownHeader}>Search results for "{props.searchTerm}"</div>
        {props.searchSuggestionsLoading ? (
          <div className={styles.searchDropdownLoading}>
            <div className={styles.miniSpinner}></div>
            Searching…
          </div>
        ) : props.searchSuggestions.length > 0 ? (
          props.searchSuggestions.slice(0, 8).map((suggestion, i) =>
            suggestion.kind === 'entity' ? (
              <Button
                unstyled
                key={`entity-sugg-${String(suggestion.id)}-${i}`}
                className={styles.searchSuggestionButton}
                onClick={() => {
                  props.onPersonClick(suggestion);
                  props.setIsMobileSearchOpen(false);
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
                  props.onDocumentSuggestionClick(suggestion.id);
                  props.setIsMobileSearchOpen(false);
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
          <Button
            unstyled
            className={styles.searchAllButton}
            onClick={props.openSearchResultsRoute}
          >
            <Icon name="Search" size="sm" />
            <span>Search all documents for "{props.searchTerm}"</span>
          </Button>
        </div>
      </Surface>
    ),
    [
      props.onDocumentSuggestionClick,
      props.onPersonClick,
      props.openSearchResultsRoute,
      props.searchSuggestions,
      props.searchSuggestionsLoading,
      props.searchTerm,
      props.setIsMobileSearchOpen,
    ],
  );

  const dateFilterActive = Boolean(props.filters.timeRange[0] || props.filters.timeRange[1]);
  const dateFilterLabel = useMemo(() => {
    if (!dateFilterActive) return null;
    return `${props.filters.timeRange[0] ?? '…'} – ${props.filters.timeRange[1] ?? '…'}`;
  }, [dateFilterActive, props.filters.timeRange]);

  return (
    <>
      <SEO {...props.seoConfig} />
      {props.shouldShowOnboarding && (
        <FirstRunOnboarding onComplete={props.completeOnboarding} onSkip={props.skipOnboarding} />
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
            {!props.isMobile && (
              <div className={styles.logoArea}>
                <Link to="/" className={styles.logoArea}>
                  <RedactedLogo text="THE EPSTEIN FILES" />
                </Link>
              </div>
            )}

            <div className={styles.actionsArea}>
              {!props.isMobile && (
                <>
                  <div className={styles.buttonGroup}>
                    <ShellActionButton
                      onClick={() => props.navigate('/investigations')}
                      icon="Plus"
                      iconColor="white"
                      label="New"
                      title="New Investigation"
                    />
                    <ShellActionButton
                      onClick={() => props.setShowKeyboardShortcuts(true)}
                      icon="Command"
                      iconColor="info"
                      label="Shortcuts"
                      title="Keyboard Shortcuts"
                    />
                    <ShellActionButton
                      onClick={() => props.navigate('/about')}
                      icon="Shield"
                      iconColor="success"
                      label="Sources"
                      title="Verified Sources"
                    />
                    <ShellActionButton
                      onClick={() => props.setShowReleaseNotes(true)}
                      icon="Book"
                      iconColor="info"
                      label="What's New"
                      title="What's New"
                    />
                    {props.isAdmin && (
                      <ShellActionButton
                        onClick={() => props.navigate('/admin')}
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
                        value={props.searchTerm}
                        onChange={(e) => props.setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && props.searchTerm.trim()) {
                            props.openSearchResultsRoute();
                          } else if (e.key === 'Escape') {
                            props.setSearchTerm('');
                            e.currentTarget.blur();
                          }
                        }}
                        rootClassName={styles.headerSearchFieldRoot}
                        className={styles.headerSearchFieldInput}
                      />
                      {props.searchTerm.trim().length > 0 && (
                        <Button
                          unstyled
                          type="button"
                          onClick={() => props.setSearchTerm('')}
                          aria-label="Clear search"
                          className={styles.searchClearButton}
                        >
                          <Icon name="X" size="xs" />
                        </Button>
                      )}
                      <Button
                        unstyled
                        onClick={props.openSearchResultsRoute}
                        aria-label="Run search"
                        className={cn(styles.searchButton)}
                      >
                        <Icon name="Search" size="sm" />
                      </Button>
                    </div>
                    {props.searchTerm.trim().length >= 2 && renderSearchSuggestions()}
                  </div>

                  <div ref={dateRangePickerRef} className={styles.dateFilterWrap}>
                    <Button
                      onClick={() => props.setShowDateRangePicker((v) => !v)}
                      aria-expanded={props.showDateRangePicker}
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
                    {props.showDateRangePicker && (
                      <Surface
                        className={styles.dateFilterPanel}
                        role="dialog"
                        aria-label="Global date range filter"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            props.setShowDateRangePicker(false);
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

              {props.isMobile && (
                <div className={styles.mobileHeaderStack}>
                  <div className={styles.mobileHeaderTopRow}>
                    <Link
                      to="/"
                      className={styles.logoArea}
                      onClick={() => props.setIsMobileMenuOpen(false)}
                    >
                      <RedactedLogo text="THE EPSTEIN FILES" />
                    </Link>
                    <Button
                      unstyled
                      onClick={() => props.setIsMobileMenuOpen((v) => !v)}
                      className={styles.mobileMenuButton}
                      aria-label={
                        props.isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
                      }
                    >
                      {props.isMobileMenuOpen ? (
                        <Icon name="X" size="sm" />
                      ) : (
                        <Icon name="Menu" size="sm" />
                      )}
                    </Button>
                  </div>

                  <div className={styles.mobileHeaderControls}>
                    <Button
                      unstyled
                      onClick={() => props.setIsMobileSearchOpen(true)}
                      className={cn(
                        styles.mobileControlButton,
                        (props.searchTerm.trim() || dateFilterActive) &&
                          styles.mobileHeaderButtonActive,
                      )}
                      aria-label="Open search and filters"
                    >
                      <span className={styles.mobileControlLead}>
                        <Icon name="Search" size="sm" />
                        <span className={styles.mobileControlLabel}>Search & Filters</span>
                      </span>
                      <span className={styles.mobileControlValue}>
                        {props.searchTerm.trim()
                          ? `“${props.searchTerm}”`
                          : 'People, evidence, documents'}
                        {dateFilterActive && ` • ${dateFilterLabel}`}
                      </span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className={cn(styles.contentShell, styles.mainShell)}>
        <LoadingIndicator
          isLoading={props.isInitializing || props.analyticsLoading}
          label={props.isInitializing ? props.loadingProgress : undefined}
        />

        <SegmentedNav
          activeTab={props.activeTab}
          navigate={props.navigate}
          shouldShowOnboarding={props.shouldShowOnboarding}
        />

        <MobileMenu
          open={props.isMobileMenuOpen}
          searchTerm={props.searchTerm}
          onSearchTermChange={props.setSearchTerm}
          onNavigate={(p) => props.navigate(p)}
          onClose={() => props.setIsMobileMenuOpen(false)}
          onSearch={(term) => {
            props.setSearchTerm(term);
            props.setIsMobileMenuOpen(false);
          }}
        />

        {props.isMobile && (
          <BottomSheet
            isOpen={props.isMobileSearchOpen || props.showDateRangePicker}
            onClose={() => {
              props.setIsMobileSearchOpen(false);
              props.setShowDateRangePicker(false);
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
                  value={props.searchTerm}
                  onChange={(e) => props.setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      props.openSearchResultsRoute();
                      props.setIsMobileSearchOpen(false);
                    }
                  }}
                  rootClassName={styles.mobileSheetSearchRoot}
                  className={styles.mobileSheetSearchInput}
                  aria-label="Search the archive"
                />
                {props.searchTerm.trim().length >= 2 ? (
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
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: props.breadcrumbLabel }]} />
          </div>
          <div className={styles.viewTransition}>
            <Suspense
              fallback={
                <div className={styles.centerLoader}>
                  <div className={styles.largeSpinner}></div>
                </div>
              }
            >
              {props.children}
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
