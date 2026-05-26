import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Person } from '../types';
import { useNavigation } from '../services/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useApiStatus } from '../contexts/ApiStatusContext';
import { useFilters } from '../contexts/useFilters';
import { useIsMobile } from '../hooks/useIsMobile';
import { useSeoConfig } from '../hooks/useSeoConfig';
import { useAppNavigation, tabLabels } from '../hooks/useAppNavigation';
import {
  useBackLinkState,
  useReliableBackNavigation,
  useTrackRouteHistory,
} from '../hooks/useReliableBackNavigation';
import { useNavigationReturn } from '../hooks/useNavigationContextManager';
import { useFirstRunOnboarding } from '../hooks/useFirstRunOnboarding';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useAppFilters } from '../hooks/useAppFilters';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { parseReleaseNotes } from '../utils/releaseNotes';
import { cn } from '../utils/cn';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';
import { ModalHost } from './ModalHost';
import { AppShellLayout } from './shell/AppShellLayout';
import { OfflineIndicator } from '../components/common/OfflineIndicator';
import { CollaborationIndicator } from '../components/common/CollaborationIndicator';
import Footer from '../components/layout/Footer';
import MobileBottomNav from '../components/layout/MobileBottomNav';
import type { DocRecord } from '../components/documents/DocumentModal';
import styles from '../App.module.css';
import releaseNotesRaw from '@root/release_notes.md?raw';
import { useAnalyticsQuery } from './orchestration/useAnalyticsQuery';
import { useAppBootstrap } from './orchestration/useAppBootstrap';
import { useBuildAutoReload } from './orchestration/useBuildAutoReload';
import { useDevAffordanceAudit } from './orchestration/useDevAffordanceAudit';
import { useDocumentModalUrlSync } from './orchestration/useDocumentModalUrlSync';
import { useEntityModalUrlSync } from './orchestration/useEntityModalUrlSync';
import { useKeyboardShortcuts } from './orchestration/useKeyboardShortcuts';
import { useLegacyFileRedirect } from './orchestration/useLegacyFileRedirect';
import { useMobileGlobalToggles } from './orchestration/useMobileGlobalToggles';
import { usePeopleFiltersUrlSync } from './orchestration/usePeopleFiltersUrlSync';

export function AppRoot() {
  return (
    <AppProviders>
      <AppRootContent />
    </AppProviders>
  );
}

function AppRootContent() {
  const { status: apiStatus } = useApiStatus();
  const apiEnabled = apiStatus !== 'down';
  const queryClient = useQueryClient();
  const { filters, setFilters } = useFilters();
  const { activeTab, location } = useAppNavigation();
  const navigate = useNavigate();
  const backLinkState = useBackLinkState();
  const { goBack } = useReliableBackNavigation();
  const { user: currentUser, isAdmin } = useAuth();
  const isMobile = useIsMobile();

  useTrackRouteHistory();
  useNavigationReturn();

  const seoConfig = useSeoConfig();

  const {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    entityType,
    setEntityType,
    selectedRiskLevel,
    setSelectedRiskLevel,
  } = useAppFilters();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const closingEntityModal = useRef(false);

  const [selectedDocumentSearchTerm, setSelectedDocumentSearchTerm] = useState('');
  const [documentModalId, setDocumentModalId] = useState<string | null>(null);
  const [documentModalInitial, setDocumentModalInitial] = useState<DocRecord | null>(null);

  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showCreateEntityModal, setShowCreateEntityModal] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;

  const { searchSuggestions, searchSuggestionsLoading } = useGlobalSearch({
    searchTerm,
    apiEnabled,
  });

  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } = useFirstRunOnboarding();
  const commandPalette = useCommandPalette();
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = commandPalette;

  const parsedReleaseNotes = useMemo(() => parseReleaseNotes(releaseNotesRaw), []);

  useDevAffordanceAudit({ pathname: location.pathname, search: location.search });
  useBuildAutoReload();
  useLegacyFileRedirect({ apiEnabled, pathname: location.pathname, navigate });
  useMobileGlobalToggles({ setIsMobileMenuOpen, setIsMobileSearchOpen, setShowReleaseNotes });
  useDocumentModalUrlSync({
    location,
    selectedPerson,
    setSelectedPerson,
    documentModalId,
    setDocumentModalId,
    documentModalInitial,
    setDocumentModalInitial,
  });
  useEntityModalUrlSync({
    apiEnabled,
    location,
    selectedPerson,
    setSelectedPerson,
    closingEntityModal,
    clearClosingEntityModal: () => {
      closingEntityModal.current = false;
    },
    documentModalId,
    setDocumentModalId,
    documentModalInitial,
    setDocumentModalInitial,
  });
  useKeyboardShortcuts({
    navigate,
    location,
    selectedPerson,
    setSelectedPerson,
    markClosingEntityModal: () => {
      closingEntityModal.current = true;
    },
    documentModalId,
    setDocumentModalId,
    setDocumentModalInitial,
    goBack,
    showReleaseNotes,
    setShowReleaseNotes,
    setShowKeyboardShortcuts,
    activeTab,
    showKeyboardShortcuts,
  });

  // Sync mobile-only UI state when viewport switches to desktop.
  // useLayoutEffect runs before paint so the UI never flashes in an inconsistent state.
  useLayoutEffect(() => {
    if (isMobile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync viewport-specific overlays before desktop paint.
    setIsMobileSearchOpen(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync viewport-specific overlays before desktop paint.
    setShowDateRangePicker(false);
  }, [isMobile]);

  const { isInitializing, dataStats, loadingProgress } = useAppBootstrap({ apiEnabled });

  const { analyticsData, analyticsLoading, analyticsError, refetchAnalytics } = useAnalyticsQuery({
    apiEnabled,
    activeTab,
    filters,
  });

  usePeopleFiltersUrlSync({
    pathname: location.pathname,
    search: location.search,
    navigate,
    sortBy,
    sortOrder,
    entityType,
    selectedRiskLevel,
  });

  const handleRiskLevelClick = useCallback(
    (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
      setSelectedRiskLevel(selectedRiskLevel === level ? null : level);
    },
    [selectedRiskLevel, setSelectedRiskLevel],
  );

  const handleResetFilters = useCallback(() => {
    setSelectedRiskLevel(null);
    setEntityType('all');
    setSearchTerm('');
    setSortBy('red_flag');
    setSortOrder('desc');
  }, [setSelectedRiskLevel, setEntityType, setSearchTerm, setSortBy, setSortOrder]);

  const handlePersonClick = useCallback(
    (person: Person) => {
      setSelectedPerson(person);
      if (person.id) {
        navigate(`/entity/${person.id}`, { state: backLinkState });
      }

      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Opening details for ${person.name}`;
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    },
    [backLinkState, navigate],
  );

  const handleDocumentSuggestionClick = useCallback(
    (nextDocumentId: string) => {
      setSelectedPerson(null);
      setDocumentModalInitial(null);
      setDocumentModalId(nextDocumentId);
      navigate(`/documents/${encodeURIComponent(nextDocumentId)}`, { state: backLinkState });
    },
    [backLinkState, navigate],
  );

  const openSearchResultsRoute = useCallback(() => {
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/search');
    }
    setIsMobileSearchOpen(false);
  }, [navigate, searchTerm]);

  const breadcrumbLabel = tabLabels[activeTab];

  return (
    <div className={cn(styles.appRoot)} data-scroll-lock-root="true">
      <AppShellLayout
        seoConfig={seoConfig}
        shouldShowOnboarding={shouldShowOnboarding}
        completeOnboarding={completeOnboarding}
        skipOnboarding={skipOnboarding}
        isMobile={isMobile}
        navigate={navigate}
        isAdmin={isAdmin}
        activeTab={activeTab}
        breadcrumbLabel={breadcrumbLabel}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isMobileSearchOpen={isMobileSearchOpen}
        setIsMobileSearchOpen={setIsMobileSearchOpen}
        setShowReleaseNotes={setShowReleaseNotes}
        setShowKeyboardShortcuts={setShowKeyboardShortcuts}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchSuggestions={searchSuggestions}
        searchSuggestionsLoading={searchSuggestionsLoading}
        onPersonClick={handlePersonClick}
        onDocumentSuggestionClick={handleDocumentSuggestionClick}
        openSearchResultsRoute={openSearchResultsRoute}
        filters={filters}
        setFilters={setFilters}
        showDateRangePicker={showDateRangePicker}
        setShowDateRangePicker={setShowDateRangePicker}
        isInitializing={isInitializing}
        analyticsLoading={analyticsLoading}
        loadingProgress={loadingProgress}
      >
        <AppRoutes
          apiStatus={apiStatus}
          location={location}
          dataStats={dataStats}
          selectedRiskLevel={selectedRiskLevel}
          onRiskLevelClick={handleRiskLevelClick}
          onResetFilters={handleResetFilters}
          isAdmin={isAdmin}
          onAddSubject={() => setShowCreateEntityModal(true)}
          entityType={entityType}
          onEntityTypeChange={setEntityType}
          sortBy={sortBy}
          onSortByChange={(val) => {
            if (val === 'name' || val === 'mentions' || val === 'red_flag' || val === 'risk') {
              setSortBy(val);
            }
          }}
          sortOrder={sortOrder}
          onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          searchTerm={searchTerm}
          onPersonClick={handlePersonClick}
          analyticsData={analyticsData ?? undefined}
          analyticsLoading={analyticsLoading}
          analyticsError={analyticsError}
          onRetryAnalytics={() => void refetchAnalytics()}
          onDocumentClick={handleDocumentSuggestionClick}
          selectedDocumentSearchTerm={selectedDocumentSearchTerm}
          onSelectedDocumentSearchTermChange={setSelectedDocumentSearchTerm}
          selectedDocumentId={documentModalId || ''}
          currentUser={currentUser}
        />
        <CollaborationIndicator />
      </AppShellLayout>

      <ModalHost
        selectedPerson={selectedPerson}
        setSelectedPerson={setSelectedPerson}
        markClosingEntityModal={() => {
          closingEntityModal.current = true;
        }}
        location={location}
        navigate={navigate}
        backLinkState={backLinkState}
        documentModalId={documentModalId}
        setDocumentModalId={setDocumentModalId}
        selectedDocumentSearchTerm={selectedDocumentSearchTerm}
        documentModalInitial={documentModalInitial}
        setDocumentModalInitial={setDocumentModalInitial}
        goBack={goBack}
        showReleaseNotes={showReleaseNotes}
        setShowReleaseNotes={setShowReleaseNotes}
        parsedReleaseNotes={parsedReleaseNotes}
        showKeyboardShortcuts={showKeyboardShortcuts}
        setShowKeyboardShortcuts={setShowKeyboardShortcuts}
        isCommandPaletteOpen={isCommandPaletteOpen}
        closeCommandPalette={closeCommandPalette}
        showCreateEntityModal={showCreateEntityModal}
        setShowCreateEntityModal={setShowCreateEntityModal}
        queryClient={queryClient}
      />

      <OfflineIndicator />
      <Footer onVersionClick={() => setShowReleaseNotes(true)} />
      <MobileBottomNav />
    </div>
  );
}
