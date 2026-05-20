import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  Suspense,
  useRef,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { preloader } from './utils/ResourcePreloader';
import { runDevAffordanceAudit } from './utils/devAffordanceAudit';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
// Icons imported as needed via Icon component
import { Person, Photo } from './types';
import type { GlobalStatsPayload, EntityByIdResponse } from './types/api';

import { useNavigation } from './services/NavigationContext';
import { apiClient } from './services/apiClient';
// SECURITY: Removed non-authoritative document import paths
import MobileMenu from './components/layout/MobileMenu';
import MobileBottomNav from './components/layout/MobileBottomNav';
// ProgressBar available but not currently used
import LoadingIndicator from './components/common/LoadingIndicator';
import { Breadcrumb } from './components/layout/Breadcrumb';
import Icon from './components/common/Icon';
import { RedactedLogo } from './components/RedactedLogo';
// getEntityTypeIcon available via Icon component
import { FirstRunOnboarding } from './components/FirstRunOnboarding';
import { useFirstRunOnboarding } from './hooks/useFirstRunOnboarding';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useAppFilters } from './hooks/useAppFilters';
import { useGlobalSearch } from './hooks/useGlobalSearch';
import { useAuth } from './contexts/AuthContext';
import { cn } from './utils/cn';
import {
  BottomSheet,
  Box,
  Button,
  Flex,
  AppSegmentedNav,
  AppSegmentedNavItem,
  Input,
  LqText,
  SearchField,
  ShellActionButton,
  Stack,
  Surface,
} from './design-system/lib';
import { useFilters } from './contexts/useFilters';
import { SEO } from './components/common/SEO';
import { useSeoConfig } from './hooks/useSeoConfig';
import { useAppNavigation, tabLabels } from './hooks/useAppNavigation';
import { useIsMobile } from './hooks/useIsMobile';
import {
  useBackLinkState,
  useReliableBackNavigation,
  useTrackRouteHistory,
} from './hooks/useReliableBackNavigation';
import {
  useNavigationContextManager,
  useNavigationReturn,
} from './hooks/useNavigationContextManager';
import { parseReleaseNotes } from './utils/releaseNotes';
import { useApiStatus } from './contexts/ApiStatusContext';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { CollaborationIndicator } from './components/common/CollaborationIndicator';
import { AppRoutes } from './app/AppRoutes';
import { ModalHost } from './app/ModalHost';

import releaseNotesRaw from '@root/release_notes.md?raw';
import styles from './App.module.css';
import type { DocRecord } from './components/documents/DocumentModal';
import { AppProviders } from './app/AppProviders';

// Release notes logic and interface moved to src/client/utils/releaseNotes.ts

import Footer from './components/layout/Footer';

function App() {
  const { status: apiStatus } = useApiStatus();
  const apiEnabled = apiStatus !== 'down';
  const queryClient = useQueryClient();
  const { filters, setFilters } = useFilters();
  const { activeTab, location } = useAppNavigation();
  const navigate = useNavigate();
  const backLinkState = useBackLinkState();
  const { goBack } = useReliableBackNavigation();
  const { closeModal: _closeModal, restoreScroll: _restoreScroll } = useNavigationContextManager();
  const { user: currentUser, isAdmin } = useAuth();
  const isMobile = useIsMobile();

  useTrackRouteHistory();

  const seoConfig = useSeoConfig();

  useNavigationReturn();

  // people state removed - PeoplePage handles its own data fetching

  // UNUSED STATE REMOVED:  const [people, setPeople] = useState<Person[]>([]);
  // filteredPeople removed - unused

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

  // Modal State
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  // Prevents the urlEntityData effect from re-opening the modal immediately after close
  const closingEntityModal = useRef(false);

  const [selectedDocumentSearchTerm, setSelectedDocumentSearchTerm] = useState<string>('');
  const [documentModalId, setDocumentModalId] = useState<string | null>(null);
  const [documentModalInitial, setDocumentModalInitial] = useState<DocRecord | null>(null);

  const [investigateAttract, setInvestigateAttract] = useState<boolean>(false);
  const [investigatePopoverOpen, setInvestigatePopoverOpen] = useState<boolean>(false);
  const investigateBtnRef = useRef<HTMLButtonElement | null>(null);
  const [investigatePopoverPos, setInvestigatePopoverPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = window.requestAnimationFrame(() => {
      runDevAffordanceAudit(document);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [location.pathname, location.search]);
  const [investigateArrowLeft, setInvestigateArrowLeft] = useState<number>(16);

  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showCreateEntityModal, setShowCreateEntityModal] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
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
  }, [showDateRangePicker]);
  const parsedReleaseNotes = useMemo(() => parseReleaseNotes(releaseNotesRaw), []);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const navTrackRef = useRef<HTMLDivElement | null>(null);
  const [navEdgeFade, setNavEdgeFade] = useState({ left: false, right: false });
  const [navLayoutMode, setNavLayoutMode] = useState<'normal' | 'compact' | 'icons'>('normal');

  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;

  const { searchSuggestions, searchSuggestionsLoading } = useGlobalSearch({
    searchTerm,
    apiEnabled,
  });

  // First  // Onboarding
  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } = useFirstRunOnboarding();
  const commandPalette = useCommandPalette();
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = commandPalette;

  const pathMatch = location.pathname.match(/^\/(?:documents|evidence)\/(.+)$/);
  const params = new URLSearchParams(location.search);
  const queryDocId = params.get('id') || params.get('docId') || params.get('documentId');
  const docId = pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : queryDocId;

  const [prevDocIdForModal, setPrevDocIdForModal] = useState<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: track docId changes to sync modal state */
  useEffect(() => {
    if (docId !== prevDocIdForModal) {
      setPrevDocIdForModal(docId);
    }

    if (docId) {
      if (documentModalId !== docId) {
        if (selectedPerson) setSelectedPerson(null);
        setDocumentModalId(docId);
      }
    } else if (documentModalId) {
      setDocumentModalId('');
      setDocumentModalInitial(null);
    }
  }, [docId, prevDocIdForModal, documentModalId, selectedPerson]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Load entity from URL on page load (for shareable links)

  const urlEntityMatch = location.pathname.match(/^\/entity\/(\d+)/);
  const urlEntityId = urlEntityMatch ? parseInt(urlEntityMatch[1], 10) : null;
  const needsEntityFetch = !!urlEntityId && (!selectedPerson || selectedPerson.id !== urlEntityId);

  const { data: urlEntityData } = useQuery<EntityByIdResponse | null>({
    queryKey: ['urlEntity', urlEntityId],
    queryFn: async () => {
      if (!urlEntityId) return null;
      const res = await fetch(`/api/entities/${urlEntityId}`);
      return (await res.json()) as EntityByIdResponse;
    },
    enabled: apiEnabled && needsEntityFetch,
    staleTime: 60_000,
  });

  const [prevUrlEntityId, setPrevUrlEntityId] = useState<number | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: track entityId changes to sync modal state */
  useEffect(() => {
    if (urlEntityId !== prevUrlEntityId) {
      setPrevUrlEntityId(urlEntityId);
      if (urlEntityId) {
        if (documentModalId) setDocumentModalId('');
        if (documentModalInitial) setDocumentModalInitial(null);
      }
    }
  }, [urlEntityId, prevUrlEntityId, documentModalId, documentModalInitial]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [_prevUrlEntityDataId, _setPrevUrlEntityDataId] = useState<number | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: track entityData changes to set selected person */
  useEffect(() => {
    if (closingEntityModal.current) {
      closingEntityModal.current = false;
      return;
    }
    if (urlEntityData?.id && (!selectedPerson || selectedPerson.id !== urlEntityData.id)) {
      const photos: Photo[] = Array.isArray(urlEntityData.photos)
        ? (urlEntityData.photos as unknown[])
            .map((p) => {
              const rec = p as Record<string, unknown>;
              const id = rec.id ?? rec.photo_id ?? rec.media_id;
              const filePath = rec.filePath ?? rec.file_path ?? rec.path ?? rec.url;
              if (typeof id !== 'string' && typeof id !== 'number') return null;
              if (typeof filePath !== 'string') return null;
              return { id: String(id), filePath };
            })
            .filter((v): v is Photo => v !== null)
        : [];

      const blackBookEntries = Array.isArray(urlEntityData.blackBookEntry)
        ? (urlEntityData.blackBookEntry as Array<Record<string, unknown>>)
            .map((rec) => {
              const id = rec.id;
              if (typeof id !== 'number') return null;
              return {
                id,
                phoneNumbers: Array.isArray(rec.phoneNumbers)
                  ? (rec.phoneNumbers as string[])
                  : undefined,
                emailAddresses: Array.isArray(rec.emailAddresses)
                  ? (rec.emailAddresses as string[])
                  : undefined,
                addresses: Array.isArray(rec.addresses) ? (rec.addresses as string[]) : undefined,
                entryText: typeof rec.entryText === 'string' ? rec.entryText : undefined,
                notes: typeof rec.notes === 'string' ? rec.notes : undefined,
                entryCategory:
                  typeof rec.entryCategory === 'string' ? rec.entryCategory : undefined,
                documentId: typeof rec.documentId === 'number' ? rec.documentId : undefined,
              };
            })
            .filter((v) => v !== null)
        : undefined;

      const person: Person = {
        id: urlEntityData.id,
        name: urlEntityData.fullName || 'Unknown',
        fullName: urlEntityData.fullName || 'Unknown',
        role: urlEntityData.primaryRole || 'Unknown',
        mentions: urlEntityData.mentions || urlEntityData.mention_count || 0,
        redFlagRating: urlEntityData.redFlagRating ?? 0,
        files: urlEntityData.documentCount || urlEntityData.document_count || 0,
        contexts: [],
        evidenceTypes: urlEntityData.evidenceTypes || [],
        significantPassages: [],
        likelihoodScore: urlEntityData.likelihoodLevel || 'MEDIUM',
        fileReferences: [],
        bio: urlEntityData.bio || urlEntityData.description,
        birthDate: urlEntityData.birthDate,
        deathDate: urlEntityData.deathDate,
        photos,
        blackBookEntries,
        entityType: urlEntityData.entityType || urlEntityData.type,
        redFlagDescription: urlEntityData.redFlagDescription,
      };
      setSelectedPerson(person);
    }
  }, [urlEntityData, selectedPerson]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [prevPathname, setPrevPathname] = useState(location.pathname);
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: track pathname changes to clear selected person */
  useEffect(() => {
    if (location.pathname !== prevPathname) {
      setPrevPathname(location.pathname);
      if (!urlEntityId && selectedPerson) {
        setSelectedPerson(null);
      }
    }
  }, [location.pathname, prevPathname, urlEntityId, selectedPerson]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle global entity click events (e.g. from DocumentMetadataPanel or MediaViewerModal)
  useEffect(() => {
    const handleEntityClick = (event: CustomEvent) => {
      const { id, name } = event.detail as { id: number | string; name?: string };
      if (id) {
        const partialPerson: Person = {
          id: Number(id),
          name: name || 'Unknown Entity',
          fullName: name || 'Unknown Entity',
          mentions: 0,
          files: 0,
          contexts: [],
          evidenceTypes: [],
          significantPassages: [],
          fileReferences: [],
        };
        setSelectedPerson(partialPerson);
      }
    };

    window.addEventListener('entityClick', handleEntityClick as EventListener);
    return () => {
      window.removeEventListener('entityClick', handleEntityClick as EventListener);
    };
  }, []);

  // Document modal state is now synchronized during render above.

  // Safety net for legacy justice.gov path swaps when edge proxy serves SPA shell.
  // Example: /epstein/files/DataSet%209/EFTA01188336.pdf
  const legacyFileSuffix = location.pathname.startsWith('/epstein/files/')
    ? location.pathname.replace(/^\/epstein\/files\//, '')
    : null;

  const { data: legacyFilePayload } = useQuery<{
    redirectTo?: string;
    documentId?: string;
  } | null>({
    queryKey: ['legacyFilePath', legacyFileSuffix],
    queryFn: async () => {
      if (!legacyFileSuffix) return null;
      const response = await fetch(
        `/api/resolve/epstein-file?path=${encodeURIComponent(legacyFileSuffix)}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      return (await response.json()) as { redirectTo?: string; documentId?: string };
    },
    enabled: apiEnabled && !!legacyFileSuffix,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!legacyFilePayload) return;
    if (legacyFilePayload.redirectTo) {
      navigate(legacyFilePayload.redirectTo, { replace: true });
    } else if (legacyFilePayload.documentId) {
      navigate(`/documents/${encodeURIComponent(legacyFilePayload.documentId)}`, { replace: true });
    }
  }, [legacyFilePayload, navigate]);

  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + K for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
          // Announce focus change for screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Search input focused';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
      }

      // Ctrl/Cmd + 1-9 for tab navigation
      if (e.ctrlKey || e.metaKey) {
        const tabMap: Record<string, string> = {
          '1': '/people',
          '2': '/search',
          '3': '/documents',
          '4': '/media',
          '5': '/timeline',
          '7': '/analytics',
          '8': '/blackbook',
          '9': '/about',
          '0': '/admin',
        };

        if (tabMap[e.key]) {
          e.preventDefault();
          navigate(tabMap[e.key]);
          // Announce navigation change for screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = `Navigated to ${tabMap[e.key].substring(1)} section`;
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
      }

      // ESC to close modals
      if (e.key === 'Escape') {
        if (selectedPerson) {
          setSelectedPerson(null);
          const params = new URLSearchParams(location.search);
          params.delete('entityId');
          params.delete('entityTab');
          navigate(`${location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
          // Announce modal close for screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Person details modal closed';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
        if (documentModalId) {
          setDocumentModalId('');
          setDocumentModalInitial(null);
          goBack('/documents');
          // Announce modal close for screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Document modal closed';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
        if (showReleaseNotes) {
          setShowReleaseNotes(false);
          // Announce modal close for screen readers
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Release notes closed';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
      }

      // Ctrl/Cmd + Shift + R for refresh/reload
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        window.location.reload();
        // Announce reload for screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'Reloading application';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }

      // Ctrl/Cmd + / for keyboard shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        // Announce modal open for screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'Keyboard shortcuts help opened';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    navigate,
    selectedPerson,
    documentModalId,
    showReleaseNotes,
    showKeyboardShortcuts,
    activeTab,
    location.pathname,
    location.search,
    goBack,
  ]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleToggleMobileMenu = () => setIsMobileMenuOpen((v) => !v);
    const handleToggleMobileSearch = () => setIsMobileSearchOpen((v) => !v);
    const handleToggleReleaseNotes = () => setShowReleaseNotes((v) => !v);
    window.addEventListener('toggleMobileMenu', handleToggleMobileMenu);
    window.addEventListener('toggleMobileSearch', handleToggleMobileSearch);
    window.addEventListener('toggleReleaseNotes', handleToggleReleaseNotes);
    return () => {
      window.removeEventListener('toggleMobileMenu', handleToggleMobileMenu);
      window.removeEventListener('toggleMobileSearch', handleToggleMobileSearch);
      window.removeEventListener('toggleReleaseNotes', handleToggleReleaseNotes);
    };
  }, []);

  useEffect(() => {
    if (isMobile) return;
    setIsMobileSearchOpen(false);
    setShowDateRangePicker(false);
  }, [isMobile]);

  // Initialize optimized data service (caches first page to sessionStorage)
  const { isLoading: isInitializing } = useQuery<boolean>({
    queryKey: ['initDataService'],
    queryFn: async () => {
      const result = await apiClient.getEntities({}, 1);
      const normalized = (result.data || []).map((person: Person) => ({
        ...person,
        redFlagRating: person.redFlagRating ?? 0,
        name: person.name ?? person.fullName,
        files: person.files ?? person.documentCount ?? 0,
        likelihoodScore:
          person.likelihoodScore ??
          person.likelihoodLevel ??
          ((person.redFlagRating ?? 0) >= 4
            ? 'HIGH'
            : (person.redFlagRating ?? 0) >= 2
              ? 'MEDIUM'
              : 'LOW'),
      }));
      try {
        sessionStorage.setItem('epstein_archive_people_page1_v13_14_1', JSON.stringify(normalized));
      } catch (err) {
        console.error('Error caching people data:', err);
      }
      return true;
    },
    staleTime: Infinity,
    retry: false,
    enabled: apiEnabled,
  });

  // Fetch global stats for header counters
  const { data: globalStatsData } = useQuery<GlobalStatsPayload>({
    queryKey: ['globalStats'],
    queryFn: async () => (await apiClient.getStats()) as GlobalStatsPayload,
    staleTime: 5 * 60_000,
    enabled: apiEnabled,
  });

  const dataStats = useMemo(() => {
    if (!globalStatsData) {
      return {
        totalPeople: 0,
        totalMentions: 0,
        totalFiles: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
      };
    }
    const likelihoodDistribution = Array.isArray(globalStatsData.likelihoodDistribution)
      ? globalStatsData.likelihoodDistribution
      : [];
    const highRisk =
      likelihoodDistribution.find(
        (bucket: { level: string; count: number }) => bucket.level === 'HIGH',
      )?.count || 0;
    const mediumRisk =
      likelihoodDistribution.find(
        (bucket: { level: string; count: number }) => bucket.level === 'MEDIUM',
      )?.count || 0;
    const lowRisk =
      likelihoodDistribution.find(
        (bucket: { level: string; count: number }) => bucket.level === 'LOW',
      )?.count || 0;
    const newStats = {
      totalPeople: globalStatsData.totalEntities,
      totalMentions: globalStatsData.totalMentions,
      totalFiles: globalStatsData.totalDocuments,
      highRisk,
      mediumRisk,
      lowRisk,
    };
    try {
      sessionStorage.setItem('epstein_archive_stats_v13_14_1', JSON.stringify(newStats));
    } catch {
      // ignore
    }
    return newStats;
  }, [globalStatsData]);

  const loadingProgress = isInitializing ? 'Loading subjects...' : 'Ready';

  const [attractShown, setAttractShown] = useState(false);
  const canShowAttract = useMemo(() => {
    try {
      const shown = localStorage.getItem('investigate_attract_shown') === 'true';
      const hasSeenInvestigationOnboarding =
        localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
      const hasSeenBoardOnboarding = localStorage.getItem('board_onboarding_seen') === 'true';
      return (
        !shown &&
        !attractShown &&
        !shouldShowOnboarding &&
        hasSeenInvestigationOnboarding &&
        hasSeenBoardOnboarding
      );
    } catch {
      return false;
    }
  }, [shouldShowOnboarding, attractShown]);

  const [prevCanShowAttract, setPrevCanShowAttract] = useState(false);
  if (canShowAttract !== prevCanShowAttract) {
    setPrevCanShowAttract(canShowAttract);
    if (canShowAttract) {
      setInvestigateAttract(true);
      setAttractShown(true);
      try {
        localStorage.setItem('investigate_attract_shown', 'true');
      } catch (e) {
        void e;
      }
    }
  }

  useEffect(() => {
    if (investigateAttract) {
      const t = setTimeout(() => setInvestigateAttract(false), 8000);
      return () => clearTimeout(t);
    }
  }, [investigateAttract]);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('investigate_popover_dismissed') === 'true';
      const hasSeenInvestigationOnboarding =
        localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
      const hasSeenBoardOnboarding = localStorage.getItem('board_onboarding_seen') === 'true';
      const isMobile = window.innerWidth < 768;

      if (
        !dismissed &&
        activeTab === 'people' &&
        !shouldShowOnboarding &&
        hasSeenInvestigationOnboarding &&
        hasSeenBoardOnboarding &&
        !isMobile
      ) {
        const timer = setTimeout(() => setInvestigatePopoverOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      void e;
    }
  }, [activeTab, shouldShowOnboarding]);

  const updatePopoverPos = useCallback(() => {
    if (!investigatePopoverOpen) return;
    const anchor =
      (document.querySelector('[data-investigation-nav-top]') as HTMLElement) ||
      (document.querySelector('[data-investigation-nav]') as HTMLElement) ||
      investigateBtnRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const x = Math.round(rect.left + window.scrollX);
      const y = Math.round(rect.bottom + 8 + window.scrollY);

      setInvestigatePopoverPos((prev) => {
        if (prev.x === x && prev.y === y) return prev;
        return { x, y };
      });

      const centerX = rect.left + rect.width / 2 + window.scrollX;
      const arrowX = Math.max(12, Math.min(300 - 12, centerX - x - 8));
      setInvestigateArrowLeft((prev) => {
        if (prev === arrowX) return prev;
        return arrowX;
      });
    }
  }, [investigatePopoverOpen]);

  useLayoutEffect(() => {
    if (investigatePopoverOpen) {
      const handle = requestAnimationFrame(updatePopoverPos);
      return () => cancelAnimationFrame(handle);
    }
  }, [investigatePopoverOpen, updatePopoverPos]);

  useEffect(() => {
    window.addEventListener('resize', updatePopoverPos);
    window.addEventListener('scroll', updatePopoverPos, { passive: true });
    const id = setInterval(updatePopoverPos, 300); // defensive update in dynamic layouts
    return () => {
      window.removeEventListener('resize', updatePopoverPos);
      window.removeEventListener('scroll', updatePopoverPos);
      clearInterval(id);
    };
  }, [updatePopoverPos]);

  // Sync people filter state to URL so back navigation and sharing preserve filters.
  // Only writes when on a people-related path; omits params that equal the default.
  useEffect(() => {
    const isPeoplePath =
      location.pathname === '/' ||
      location.pathname === '/people' ||
      location.pathname.startsWith('/entity/');
    if (!isPeoplePath) return;

    const next = new URLSearchParams(location.search);
    // Preserve non-filter params (e.g. ?q= from search)
    ['sort', 'order', 'type', 'risk'].forEach((k) => next.delete(k));
    if (sortBy !== 'red_flag') next.set('sort', sortBy);
    if (sortOrder !== 'desc') next.set('order', sortOrder);
    if (entityType !== 'all') next.set('type', entityType);
    if (selectedRiskLevel) next.set('risk', selectedRiskLevel);

    const newSearch = next.toString();
    const currentSearch = new URLSearchParams(location.search).toString();
    if (newSearch !== currentSearch) {
      navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excludes location.search to avoid loop
  }, [sortBy, sortOrder, entityType, selectedRiskLevel, location.pathname]);

  // Handler for risk level click clicks
  const handleRiskLevelClick = useCallback(
    (level: 'HIGH' | 'MEDIUM' | 'LOW') => {
      setSelectedRiskLevel(selectedRiskLevel === level ? null : level);
    },
    [selectedRiskLevel, setSelectedRiskLevel],
  );

  // Handler to reset all filters
  const handleResetFilters = useCallback(() => {
    setSelectedRiskLevel(null);
    setEntityType('all');
    setSearchTerm('');
    setSortBy('red_flag');
    setSortOrder('desc');
  }, [setSelectedRiskLevel, setEntityType, setSearchTerm, setSortBy, setSortOrder]);

  // Poll for new builds and reload if a new version is deployed
  const currentHash = (() => {
    const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
    const src = entry?.src || '';
    return (src.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null;
  })();
  const { data: buildCheckHtml } = useQuery<string | null>({
    queryKey: ['buildCheck'],
    queryFn: async () => {
      if (!currentHash) return null;
      const res = await fetch(`/?build_check=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!res.ok) return null;
      return res.text();
    },
    enabled: !!currentHash,
    refetchInterval: 15_000,
    staleTime: 0,
  });
  useEffect(() => {
    if (!buildCheckHtml || !currentHash) return;
    const latestHash = (buildCheckHtml.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null;
    if (latestHash && latestHash !== currentHash) {
      window.location.reload();
    }
  }, [buildCheckHtml, currentHash]);

  // Analytics data — fetched when the analytics tab is active
  const {
    data: analyticsData,
    isFetching: analyticsLoading,
    error: analyticsQueryError,
    refetch: refetchAnalytics,
  } = useQuery<GlobalStatsPayload>({
    queryKey: ['analyticsStats', filters],
    queryFn: async () => {
      const stats = (await apiClient.getStats(
        filters as unknown as { timeRange?: string[]; limit?: number },
      )) as GlobalStatsPayload;
      return stats;
    },
    enabled: apiEnabled && activeTab === 'analytics',
    staleTime: 60_000,
  });

  const analyticsError =
    analyticsQueryError instanceof Error
      ? analyticsQueryError.message
      : analyticsQueryError != null
        ? 'Failed to load analytics data'
        : null;

  // Effect to prefetch next page when current page loads
  // Prefetch effect removed

  const handlePersonClick = useCallback(
    (person: Person) => {
      setSelectedPerson(person);

      // Update URL via router so UI/state stays synchronized
      if (person.id) {
        navigate(`/entity/${person.id}`, { state: backLinkState });
      }

      // Announce navigation for screen readers
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
    (documentId: string) => {
      setSelectedPerson(null);
      setDocumentModalInitial(null);
      setDocumentModalId(documentId);
      navigate(`/documents/${encodeURIComponent(documentId)}`, { state: backLinkState });
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

  const clearDateFilter = useCallback(() => {
    setFilters({ timeRange: [null, null] });
    setShowDateRangePicker(false);
  }, [setFilters]);

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
                key={`entity-sugg-${suggestion.id}-${i}`}
                className={styles.searchSuggestionButton}
                onClick={() => {
                  handlePersonClick(suggestion);
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
                  handleDocumentSuggestionClick(suggestion.id);
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
      handleDocumentSuggestionClick,
      handlePersonClick,
      openSearchResultsRoute,
      searchSuggestions,
      searchSuggestionsLoading,
      searchTerm,
    ],
  );

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

  useEffect(() => {
    const track = navTrackRef.current;
    if (!track) return;

    const updateEdgeFade = () => {
      const width = track.clientWidth;
      const mode: 'normal' | 'compact' | 'icons' =
        width < 1080 ? 'icons' : width < 1440 ? 'compact' : 'normal';
      setNavLayoutMode((prev) => (prev === mode ? prev : mode));

      const overflowPx = track.scrollWidth - track.clientWidth;
      // Suppress fades for tiny rounding overflow; show only when true horizontal scrolling is needed.
      const hasOverflow = overflowPx > 12;
      const left = hasOverflow && track.scrollLeft > 6;
      const right = hasOverflow && track.scrollLeft + track.clientWidth < track.scrollWidth - 6;
      setNavEdgeFade((prev) =>
        prev.left === left && prev.right === right ? prev : { left, right },
      );
    };

    updateEdgeFade();
    track.addEventListener('scroll', updateEdgeFade, { passive: true });
    window.addEventListener('resize', updateEdgeFade);

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdgeFade) : null;
    if (resizeObserver) {
      resizeObserver.observe(track);
      if (track.firstElementChild instanceof HTMLElement) {
        resizeObserver.observe(track.firstElementChild);
      }
    }

    return () => {
      track.removeEventListener('scroll', updateEdgeFade);
      window.removeEventListener('resize', updateEdgeFade);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <AppProviders>
      <div className={cn(styles.appRoot)} data-scroll-lock-root="true">
        <SEO {...seoConfig} />
        {shouldShowOnboarding && (
          <FirstRunOnboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />
        )}

        {/* Skip links for accessibility */}
        <div className={styles.srOnly}>
          <a href="#main-content" className={styles.skipLink}>
            Skip to main content
          </a>
          <a href="#navigation" className={cn(styles.skipLink, styles.skipNavigation)}>
            Skip to navigation
          </a>
        </div>
        <div className={styles.bgEffects}>
          {/* Background effects removed requested by user for stability */}

          {/* Floating particles removed due to UI blocking/performance issues */}
        </div>

        {/* Header */}
        <header className={cn(styles.headerShell)}>
          <div className={styles.contentShell}>
            <div className={styles.header}>
              {!isMobile && (
                <div className={styles.logoArea}>
                  {/* Logo */}
                  <Link to="/" className={styles.logoArea}>
                    <RedactedLogo text="THE EPSTEIN FILES" />
                  </Link>
                </div>
              )}

              {/* RIGHT: Actions and Search */}
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
                          (filters.timeRange[0] || filters.timeRange[1]) &&
                            styles.dateFilterButtonActive,
                        )}
                        title="Global date range filter"
                      >
                        <Icon
                          name="Calendar"
                          size="sm"
                          color={filters.timeRange[0] || filters.timeRange[1] ? 'warning' : 'gray'}
                        />
                        {(filters.timeRange[0] || filters.timeRange[1]) && (
                          <span className={styles.dateFilterValue}>
                            {filters.timeRange[0] ?? '…'} – {filters.timeRange[1] ?? '…'}
                          </span>
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
                      <Button
                        unstyled
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className={styles.mobileMenuButton}
                        aria-label={
                          isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
                        }
                      >
                        {isMobileMenuOpen ? (
                          <Icon name="X" size="sm" />
                        ) : (
                          <Icon name="Menu" size="sm" />
                        )}
                      </Button>
                    </div>

                    <div className={styles.mobileHeaderControls}>
                      <Button
                        unstyled
                        onClick={() => setIsMobileSearchOpen(true)}
                        className={cn(
                          styles.mobileControlButton,
                          (searchTerm.trim() || filters.timeRange[0] || filters.timeRange[1]) &&
                            styles.mobileHeaderButtonActive,
                        )}
                        aria-label="Open search and filters"
                      >
                        <span className={styles.mobileControlLead}>
                          <Icon name="Search" size="sm" />
                          <span className={styles.mobileControlLabel}>Search & Filters</span>
                        </span>
                        <span className={styles.mobileControlValue}>
                          {searchTerm.trim() ? `“${searchTerm}”` : 'People, evidence, documents'}
                          {(filters.timeRange[0] || filters.timeRange[1]) &&
                            ` • ${filters.timeRange[0] ?? '…'} – ${filters.timeRange[1] ?? '…'}`}
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
          {/* Simple loading indicator - no text labels */}
          <LoadingIndicator
            isLoading={isInitializing || analyticsLoading}
            label={isInitializing ? loadingProgress : undefined}
          />
          {/* Navigation Tabs - segmented pill with responsive horizontal track */}
          <Box id="navigation" mb={6} className={styles.navShell}>
            <div className={styles.navWrap}>
              <div ref={navTrackRef} className={styles.navTrack}>
                <AppSegmentedNav density={navLayoutMode}>
                  <AppSegmentedNavItem
                    onClick={() => navigate('/people')}
                    tone="people"
                    active={activeTab === 'people'}
                    density={navLayoutMode}
                    icon="Users"
                    label="People"
                  />
                  <AppSegmentedNavItem
                    onClick={() => {
                      try {
                        localStorage.setItem('investigate_attract_shown', 'true');
                        localStorage.setItem('investigate_popover_dismissed', 'true');
                      } catch {
                        // Ignore localStorage access errors.
                      }
                      setInvestigateAttract(false);
                      setInvestigatePopoverOpen(false);
                      navigate('/investigations');
                    }}
                    tone="investigations"
                    active={activeTab === 'investigations'}
                    density={navLayoutMode}
                    icon="Target"
                    label="Investigations"
                    wrapperClassName={styles.navItemRelative}
                    className={cn(
                      investigateAttract && activeTab !== 'investigations'
                        ? styles.investigationPulse
                        : '',
                    )}
                    aria-haspopup="dialog"
                    aria-expanded={investigatePopoverOpen}
                    ref={investigateBtnRef}
                    data-investigation-nav-top
                  />
                  {investigatePopoverOpen &&
                    activeTab !== 'investigations' &&
                    investigatePopoverPos.x !== 0 &&
                    createPortal(
                      <Surface
                        variant="glass-strong"
                        p={4}
                        style={{
                          position: 'fixed',
                          width: '320px',
                          left: investigatePopoverPos.x,
                          top: investigatePopoverPos.y,
                          zIndex: 50,
                        }}
                        className={styles.popoverSurface}
                      >
                        <div
                          className={styles.popoverPointer}
                          style={{ left: `${investigateArrowLeft}px` }}
                        >
                          <div className={styles.popoverPointerDiamond}></div>
                        </div>
                        <Box mb={1}>
                          <LqText weight="semibold">Investigations</LqText>
                        </Box>
                        <Box mb={3}>
                          <LqText variant="small" color="secondary">
                            Create and manage deep-dive investigations, link evidence, and track
                            findings.
                          </LqText>
                        </Box>
                        <Flex align="center" gap={2}>
                          <Button
                            unstyled
                            className={styles.popoverButton}
                            onClick={() => {
                              try {
                                localStorage.setItem('investigate_popover_dismissed', 'true');
                              } catch {
                                // Ignore localStorage access errors.
                              }
                              setInvestigatePopoverOpen(false);
                              setInvestigateAttract(false);
                            }}
                          >
                            Got it
                          </Button>
                          <Button
                            unstyled
                            className={cn(styles.popoverButton, styles.popoverButtonPrimary)}
                            onClick={() => {
                              try {
                                localStorage.setItem('investigate_popover_dismissed', 'true');
                                localStorage.setItem('investigate_attract_shown', 'true');
                              } catch {
                                // Ignore localStorage access errors.
                              }
                              setInvestigatePopoverOpen(false);
                              setInvestigateAttract(false);
                              navigate('/investigations');
                            }}
                          >
                            Try it
                          </Button>
                        </Flex>
                      </Surface>,
                      document.body,
                    )}
                  <AppSegmentedNavItem
                    onClick={() => navigate('/documents')}
                    tone="documents"
                    active={activeTab === 'documents'}
                    density={navLayoutMode}
                    icon="FileText"
                    label="Documents"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/redactions')}
                    onMouseEnter={() =>
                      preloader.prefetchJson('/api/documents?hasFailedRedactions=true&limit=25')
                    }
                    tone="documents"
                    active={activeTab === 'redactions'}
                    density={navLayoutMode}
                    icon="ScanText"
                    label="Redactions"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/media')}
                    onMouseEnter={() => {
                      preloader.prefetchJson('/api/media/albums');
                      preloader.prefetchJson('/api/media/images?limit=24');
                    }}
                    tone="media"
                    active={activeTab === 'media'}
                    density={navLayoutMode}
                    icon="Newspaper"
                    label="Media"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/emails')}
                    onMouseEnter={() => preloader.prefetchJson('/api/emails')}
                    tone="emails"
                    active={activeTab === 'emails'}
                    density={navLayoutMode}
                    icon="Mail"
                    label="Emails"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/flights')}
                    onMouseEnter={() => preloader.prefetchJson('/api/flights')}
                    tone="flights"
                    active={activeTab === 'flights'}
                    density={navLayoutMode}
                    icon="Navigation"
                    label="Flights"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/properties')}
                    onMouseEnter={() => preloader.prefetchJson('/api/properties/stats')}
                    tone="properties"
                    active={activeTab === 'properties'}
                    density={navLayoutMode}
                    icon="Building"
                    label="Properties"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/blackbook')}
                    onMouseEnter={() => preloader.prefetchJson('/api/media/albums')}
                    tone="blackbook"
                    active={activeTab === 'blackbook'}
                    density={navLayoutMode}
                    icon="BookOpen"
                    label="Black Book"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/timeline')}
                    onMouseEnter={() => preloader.prefetchJson('/api/timeline')}
                    tone="timeline"
                    active={activeTab === 'timeline'}
                    density={navLayoutMode}
                    icon="Clock"
                    label="Timeline"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/financial')}
                    onMouseEnter={() =>
                      preloader.prefetchJson('/api/financial/transactions?limit=100')
                    }
                    tone="financial"
                    active={activeTab === 'financial'}
                    density={navLayoutMode}
                    icon="DollarSign"
                    label="Financial"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/analytics')}
                    tone="analytics"
                    active={activeTab === 'analytics'}
                    density={navLayoutMode}
                    icon="BarChart3"
                    label="Analytics"
                  />
                  <AppSegmentedNavItem
                    onClick={() => navigate('/about')}
                    tone="about"
                    active={activeTab === 'about'}
                    density={navLayoutMode}
                    icon="Shield"
                    label="About"
                  />
                </AppSegmentedNav>
              </div>
              {navEdgeFade.left && (
                <div className={cn(styles.navEdgeFade, styles.navEdgeFadeLeft)} />
              )}
              {navEdgeFade.right && (
                <div className={cn(styles.navEdgeFade, styles.navEdgeFadeRight)} />
              )}
            </div>
          </Box>
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

          {/* Tab Content */}
          <div id="main-content" className={styles.mainContent}>
            {/* Breadcrumb navigation */}
            <div className={styles.breadcrumbContainer}>
              <Breadcrumb
                items={[
                  { label: 'Home', href: '/' },
                  {
                    label: tabLabels[activeTab],
                  },
                ]}
              />
            </div>
            <div className={styles.viewTransition}>
              <Suspense
                fallback={
                  <div className={styles.centerLoader}>
                    <div className={styles.largeSpinner}></div>
                  </div>
                }
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
                    if (
                      val === 'name' ||
                      val === 'mentions' ||
                      val === 'red_flag' ||
                      val === 'risk'
                    ) {
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
                  onRetryAnalytics={refetchAnalytics}
                  onDocumentClick={handleDocumentSuggestionClick}
                  selectedDocumentSearchTerm={selectedDocumentSearchTerm}
                  onSelectedDocumentSearchTermChange={setSelectedDocumentSearchTerm}
                  selectedDocumentId={documentModalId || ''}
                  currentUser={currentUser}
                />
                <CollaborationIndicator />
              </Suspense>
            </div>
          </div>
        </div>

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

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </AppProviders>
  );
}

export default App;
