import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from 'react';
import { preloader } from './utils/ResourcePreloader';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, Link } from 'react-router-dom';
// Icons imported as needed via Icon component
import { Person } from './types';
import { Document } from './types/documents';
import { OptimizedDataService, SearchFilters } from './services/OptimizedDataService';
import { useNavigation } from './services/ContentNavigationService.tsx';
import PersonCard from './components/entities/PersonCard';
import MediaAndArticlesTab from './components/media/MediaAndArticlesTab';
import PersonCardSkeleton from './components/entities/PersonCardSkeleton';
import StatsSkeleton from './components/pages/StatsSkeleton';
import { StatsDisplay } from './components/pages/StatsDisplay';
import { apiClient } from './services/apiClient';
import { DocumentProcessor } from './services/documentProcessor';
// SECURITY: Removed synthetic sample documents import - never fall back to fake data
import { useCountUp } from './hooks/useCountUp';
import MobileMenu from './components/layout/MobileMenu';
import UndoProvider from './components/UndoManager';
import ToastProvider, { useToasts } from './components/common/ToastProvider';
import ScopedErrorBoundary from './components/common/ScopedErrorBoundary';
// ProgressBar available but not currently used
import LoadingIndicator from './components/common/LoadingIndicator';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { Breadcrumb } from './components/layout/Breadcrumb';
import { VirtualList } from './components/common/VirtualList';
import Icon from './components/common/Icon';
import { RedactedLogo } from './components/RedactedLogo';
// getEntityTypeIcon available via Icon component
import EntityTypeFilter from './components/entities/EntityTypeFilter';
import SortFilter from './components/layout/SortFilter';
import { FirstRunOnboarding } from './components/FirstRunOnboarding';
import { useFirstRunOnboarding } from './hooks/useFirstRunOnboarding';
import { InvestigationsProvider } from './contexts/InvestigationsContext';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SEO } from './components/common/SEO';
// Lazy load heavy components
const EvidenceModal = lazy(() =>
  import('./components/common/EvidenceModal').then((module) => ({ default: module.EvidenceModal })),
);
const DataVisualization = lazy(() =>
  import('./components/visualizations/DataVisualization').then((module) => ({
    default: module.DataVisualization,
  })),
);
const BlackBookViewer = lazy(() =>
  import('./components/BlackBookViewer').then((module) => ({ default: module.BlackBookViewer })),
);
const EvidenceSearch = lazy(() =>
  import('./components/EvidenceSearch').then((module) => ({ default: module.EvidenceSearch })),
);
const DocumentBrowser = lazy(() =>
  import('./components/documents/DocumentBrowser').then((module) => ({
    default: module.DocumentBrowser,
  })),
);
const DocumentModal = lazy(() =>
  import('./components/documents/DocumentModal').then((module) => ({
    default: module.DocumentModal,
  })),
);
const InvestigationWorkspace = lazy(() =>
  import('./components/investigation/InvestigationWorkspace').then((module) => ({
    default: module.InvestigationWorkspace,
  })),
);
const ReleaseNotesPanel = lazy(() =>
  import('./components/ReleaseNotesPanel').then((module) => ({
    default: module.ReleaseNotesPanel,
  })),
);
const EmailClient = lazy(() =>
  import('./components/email/EmailClient').then((module) => ({ default: module.default })),
);
const AboutPage = lazy(() =>
  import('./components/pages/AboutPage').then((module) => ({ default: module.default })),
);
const FAQPage = lazy(() =>
  import('./components/pages/FAQPage').then((module) => ({ default: module.default })),
);

const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((module) => ({ default: module.AdminDashboard })),
);
const EvidenceDetail = lazy(() =>
  import('./pages/EvidenceDetail').then((module) => ({ default: module.EvidenceDetail })),
);
const ReviewDashboard = lazy(() =>
  import('./pages/ReviewDashboard').then((module) => ({ default: module.ReviewDashboard })),
);
const EnhancedAnalytics = lazy(() =>
  import('./components/pages/EnhancedAnalytics').then((module) => ({
    default: module.EnhancedAnalytics,
  })),
);
const TimelineWithFlights = lazy(() =>
  import('./components/TimelineWithFlights').then((module) => ({ default: module.default })),
);
const FlightTracker = lazy(() =>
  import('./components/FlightTracker').then((module) => ({ default: module.default })),
);
const PropertyBrowser = lazy(() =>
  import('./components/PropertyBrowser').then((module) => ({ default: module.default })),
);

import releaseNotesRaw from '../release_notes.md?raw';

// Helper to parse markdown release notes
const parseReleaseNotes = (markdown: string) => {
  try {
    // Split on ## Version headers, lowercase v, or the fancy header format
    const sections = markdown
      .split(/^## [Vv]ersion |^## v|^# 📣 Epstein Archive V/m)
      .filter(Boolean);

    return sections
      .map((section) => {
        const lines = section.split('\n').map((l) => l.trim());
        if (lines.length === 0) return null;

        // Line 0: "X.X.X (Date)" or "X.X.X - Title"
        const headerLine = lines[0];
        const versionMatch = headerLine.match(/^([\d\.]+)/);
        const version = versionMatch ? `v${versionMatch[1]}` : 'Update';

        const dateMatch = headerLine.match(/\(([^)]+)\)/);
        let date = dateMatch ? dateMatch[1] : null;

        // Fallback: look for *Released: Date*
        if (!date) {
          for (const line of lines) {
            const releasedMatch = line.match(/^\*Released: (.+)\*$/);
            if (releasedMatch) {
              date = releasedMatch[1];
              break;
            }
          }
        }
        if (!date) date = 'Recent';

        // Find title - first try to extract from header line after " - "
        let title = 'Maintenance Update';
        const titleInHeader = headerLine.match(/ - (.+)$/);
        if (titleInHeader) {
          title = titleInHeader[1];
        } else {
          // Fallback: look for title in subsequent lines (not starting with ** or --- or - or ###)
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (
              line &&
              !line.startsWith('**') &&
              !line.startsWith('---') &&
              !line.startsWith('-') &&
              !line.startsWith('###')
            ) {
              title = line;
              break;
            }
          }
        }

        // Find all bullet points and section headers
        const notes: string[] = [];
        for (const line of lines) {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            notes.push(line.substring(2));
          } else if (line.startsWith('### ')) {
            // Include markdown section headers
            notes.push(line);
          }
        }

        return {
          version,
          date,
          title,
          notes: notes,
        };
      })
      .filter(Boolean)
      .filter((r: any) => r.notes.length > 0 || r.title !== 'Maintenance Update')
      .sort((a: any, b: any) => {
        // Sort by version (descending)
        const vA = a.version.replace('v', '').split('.').map(Number);
        const vB = b.version.replace('v', '').split('.').map(Number);
        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
          const numA = vA[i] || 0;
          const numB = vB[i] || 0;
          if (numA !== numB) return numB - numA;
        }
        return 0;
      }) as any[];
  } catch (e) {
    console.error('Failed to parse release notes', e);
    return [];
  }
};

import { CreateEntityModal } from './components/entities/CreateEntityModal';
import Footer from './components/layout/Footer';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  const getTabFromPath = (pathname: string): Tab => {
    if (pathname === '/' || pathname === '/people') return 'people';
    if (pathname.startsWith('/entity/')) return 'people'; // Entity modal opens on people tab
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/documents')) return 'documents';
    if (pathname.startsWith('/media')) return 'media';
    if (pathname.startsWith('/timeline')) return 'timeline';
    if (pathname.startsWith('/investigations')) return 'investigations';
    if (pathname.startsWith('/analytics')) return 'analytics';
    if (pathname.startsWith('/blackbook')) return 'blackbook';
    if (pathname.startsWith('/about')) return 'about';
    if (pathname.startsWith('/emails')) return 'emails';
    if (pathname === '/login') return 'login';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/review')) return 'review';
    if (pathname.startsWith('/evidence/')) return 'evidence';
    if (pathname.startsWith('/flights')) return 'flights';
    if (pathname.startsWith('/properties')) return 'properties';
    if (pathname.startsWith('/faq')) return 'faq';
    return 'people'; // default
  };

  type Tab =
    | 'people'
    | 'search'
    | 'documents'
    | 'media'
    | 'timeline'
    | 'flights'
    | 'properties'
    | 'investigations'
    | 'analytics'
    | 'blackbook'
    | 'about'
    | 'emails'
    | 'login'
    | 'evidence'
    | 'faq'
    | 'review'
    | 'admin';
  const activeTab = getTabFromPath(location.pathname);

  const [people, setPeople] = useState<Person[]>(() => {
    // Try to load first page from cache for instant render
    try {
      // Clear old legacy keys
      localStorage.removeItem('epstein_archive_people_page1');
      localStorage.removeItem('epstein_archive_people_page1_v5_3_1');
      localStorage.removeItem('epstein_archive_stats');
      localStorage.removeItem('epstein_archive_stats_v5_3_1');

      const cached = localStorage.getItem('epstein_archive_people_page1_v12_7_2');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error loading cached people:', e);
    }
    return [];
  });
  const [filteredPeople, setFilteredPeople] = useState<Person[]>(people);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [previousPath, setPreviousPath] = useState<string>('/people'); // Track path before modal opens
  const [searchTermForModal, setSearchTermForModal] = useState<string>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedDocumentSearchTerm, setSelectedDocumentSearchTerm] = useState<string>('');
  const [showAudioCTA, setShowAudioCTA] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cta_audio_dismissed') !== '1';
    } catch {
      return true;
    }
  });
  const [documentModalId, setDocumentModalId] = useState<string>('');
  const [documentModalInitial, setDocumentModalInitial] = useState<any | null>(null);
  const [investigateAttract, setInvestigateAttract] = useState<boolean>(false);
  const [investigatePopoverOpen, setInvestigatePopoverOpen] = useState<boolean>(false);
  const investigateBtnRef = useRef<HTMLButtonElement | null>(null);
  const [investigatePopoverPos, setInvestigatePopoverPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [investigateArrowLeft, setInvestigateArrowLeft] = useState<number>(16);
  const [sortBy, setSortBy] = useState<'name' | 'mentions' | 'spice' | 'risk'>('spice');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [entityType, setEntityType] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW' | null>(
    null,
  );
  const [documentProcessor, setDocumentProcessor] = useState<DocumentProcessor | null>(null);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showCreateEntityModal, setShowCreateEntityModal] = useState(false);
  const parsedReleaseNotes = useMemo(() => parseReleaseNotes(releaseNotesRaw), []);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;

  // Search suggestions from API (not limited to current page)
  const [searchSuggestions, setSearchSuggestions] = useState<Person[]>([]);
  const [searchSuggestionsLoading, setSearchSuggestionsLoading] = useState(false);

  // Fetch search suggestions from API when search term changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchSuggestions([]);
        return;
      }

      setSearchSuggestionsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&limit=10`);
        const data = await response.json();
        const entities = data.entities || [];
        const normalized: Person[] = entities.map((e: any) => ({
          id: e.id,
          name: e.fullName || e.name,
          role: e.primaryRole || e.role || 'Unknown',
          mentions: e.mention_count || e.mentions || 0,
          red_flag_rating: e.red_flag_rating || e.redFlagRating || 0,
          files: e.document_count || e.files || 0,
        }));
        setSearchSuggestions(normalized);
      } catch (error) {
        console.error('Error fetching search suggestions:', error);
        setSearchSuggestions([]);
      } finally {
        setSearchSuggestionsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  // First run onboarding
  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } = useFirstRunOnboarding();

  // Clear selected document when switching tabs
  useEffect(() => {
    if (activeTab !== 'documents') {
      setSelectedDocumentId('');
    }
  }, [activeTab]);

  // Load entity from URL on page load (for shareable links)
  useEffect(() => {
    const entityMatch = location.pathname.match(/^\/entity\/(\d+)/);
    if (entityMatch && !selectedPerson) {
      const entityId = parseInt(entityMatch[1], 10);
      // Fetch entity data from API
      fetch(`/api/entities/${entityId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) {
            const person: Person = {
              id: data.id,
              name: data.fullName || data.full_name || 'Unknown',
              role: data.primaryRole || data.primary_role || 'Unknown',
              mentions: data.mentions || data.mention_count || 0,
              red_flag_rating: data.redFlagRating || data.red_flag_rating || 0,
              files: data.documentCount || data.document_count || 0,
              contexts: [],
              evidence_types: data.evidenceTypes || [],
              spicy_passages: [],
              likelihood_score: data.likelihoodLevel || 'MEDIUM',
              fileReferences: [],
              // Enhanced fields
              bio: data.bio || data.description,
              birthDate: data.birthDate,
              deathDate: data.deathDate,
              photos: data.photos,
              blackBookEntry: data.blackBookEntry,
              entity_type: data.entity_type || (data as any).type,
              red_flag_description: data.redFlagDescription || data.red_flag_description,
            };
            setSelectedPerson(person);
          }
        })
        .catch((err) => console.error('Error loading entity from URL:', err));
    }
  }, [location.pathname, selectedPerson]);

  // Load document from URL on page load (for shareable links)
  useEffect(() => {
    const docMatch = location.pathname.match(/^\/documents\/(\d+)/);
    if (docMatch && !documentModalId) {
      const docId = docMatch[1];
      // Set IDs to trigger modal opening
      setDocumentModalId(docId);
      setSelectedDocumentId(docId);

      // Optionally fetch document details if needed immediately,
      // but DocumentModal usually handles fetching if passed an ID
    }
  }, [location.pathname, documentModalId]);

  // Update navigation context when search term changes
  useEffect(() => {
    // This will automatically sync with the navigation context
  }, [searchTerm]);

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
          navigate(previousPath || '/people');
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
          if (activeTab === 'documents') {
            navigate('/documents');
          } else {
            // If we're on another tab (e.g. search), just clear the query param or keep URL context
            // But usually document modal is /documents/:id.
            // If accessed via /documents/:id, we should go back to /documents
            if (location.pathname.startsWith('/documents/')) {
              navigate('/documents');
            }
          }
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
  }, [navigate, selectedPerson, documentModalId, showReleaseNotes, showKeyboardShortcuts]);
  const [dataStats, setDataStats] = useState(() => {
    // Try to load from local storage for immediate display
    try {
      const cached = localStorage.getItem('epstein_archive_stats_v12_7_2');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error loading cached stats:', e);
    }
    return {
      totalPeople: 0,
      totalMentions: 0,
      totalFiles: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
    };
  });

  // Animate header stats
  const headerTotalPeople = useCountUp(dataStats.totalPeople, 1000);
  const headerTotalMentions = useCountUp(dataStats.totalMentions, 1200);
  const headerTotalFiles = useCountUp(dataStats.totalFiles, 1100);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(() => {
    // If we have cached people, don't show loading skeleton
    const cached = localStorage.getItem('epstein_archive_people_page1_v5_3_4');
    return !cached;
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [, setLoadingProgressValue] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPeople, setTotalPeople] = useState(0);
  const [dataService, setDataService] = useState<OptimizedDataService | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { addToast } = useToasts();
  useEffect(() => {
    // Initialize optimized data service
    const initializeDataService = async () => {
      try {
        const hadCachedPeople = !!localStorage.getItem('epstein_archive_people_page1_v5_3_4');
        if (!hadCachedPeople) {
          setLoading(true);
        }
        setIsInitializing(true);
        setLoadingProgress('Connecting to database...');
        setLoadingProgressValue(10);
        const service = OptimizedDataService.getInstance();
        await service.initialize();
        setDataService(service);
        setLoadingProgress('Loading subjects...');
        setLoadingProgressValue(30);

        // Load first page of data
        console.log('About to load first page...');
        const result = await service.getPaginatedData({}, 1);
        console.log('Initial data load:', {
          dataLength: result.data.length,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          pageSize: result.pageSize,
          firstPerson: result.data[0],
        });
        setLoadingProgress(`Loaded ${result.data.length} subjects...`);
        setLoadingProgressValue(60);
        const normalized = (result.data || []).map((p: any) => ({
          ...p,
          red_flag_rating: p.red_flag_rating ?? p.redFlagRating ?? p.spiceRating ?? 0,
          name: p.name ?? p.fullName ?? p.full_name,
          files: p.files ?? p.documentCount ?? 0,
          likelihood_score:
            p.likelihood_score ??
            p.likelihoodLevel ??
            p.likelihood_level ??
            ((p.red_flag_rating ?? p.redFlagRating ?? 0) >= 4
              ? 'HIGH'
              : (p.red_flag_rating ?? p.redFlagRating ?? 0) >= 2
                ? 'MEDIUM'
                : 'LOW'),
        }));
        setPeople(normalized);
        setFilteredPeople(normalized);
        setCurrentPage(result.page);
        setTotalPages(result.totalPages);
        setTotalPeople(result.total);

        // Cache first page for next load
        try {
          localStorage.setItem('epstein_archive_people_page1_v12_7_2', JSON.stringify(normalized));
        } catch (e) {
          console.error('Error caching people data:', e);
        }

        // Enable virtual scrolling for large datasets (disabled for pagination)
        // setUseVirtualScroll(result.total > 100);

        // We don't update stats here anymore to avoid double-updates/jumps
        // fetchGlobalStats will handle the authoritative stats
      } catch (error) {
        console.error('Error initializing data service:', error);
        addToast({ text: 'Failed to load subjects', type: 'error' });
      } finally {
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initializeDataService();

    // Fetch global stats
    const fetchGlobalStats = async () => {
      try {
        setLoadingProgress('Loading statistics...');
        setLoadingProgressValue(80);
        const service = OptimizedDataService.getInstance();
        await service.initialize();
        const stats = await service.getStatistics();
        console.log('Global stats loaded:', stats);
        setLoadingProgress('Finalizing...');
        setLoadingProgressValue(90);

        const highRisk =
          stats.likelihoodDistribution.find((d: any) => d.level === 'HIGH')?.count || 0;
        const mediumRisk =
          stats.likelihoodDistribution.find((d: any) => d.level === 'MEDIUM')?.count || 0;
        const lowRisk =
          stats.likelihoodDistribution.find((d: any) => d.level === 'LOW')?.count || 0;

        const newStats = {
          totalPeople: stats.totalEntities,
          totalMentions: stats.totalMentions,
          totalFiles: stats.totalDocuments,
          highRisk,
          mediumRisk,
          lowRisk,
        };

        // Only update if changed to prevent animation restart
        setDataStats((prev: typeof newStats) => {
          if (JSON.stringify(prev) !== JSON.stringify(newStats)) {
            localStorage.setItem('epstein_archive_stats_v12_7_2', JSON.stringify(newStats));
            return newStats;
          }
          return prev;
        });
        setLoadingProgressValue(100);
      } catch (error) {
        console.error('Error fetching global stats:', error);
        addToast({ text: 'Failed to load statistics', type: 'error' });
      }
    };

    fetchGlobalStats();
  }, [addToast]);

  useEffect(() => {
    try {
      const shown = localStorage.getItem('investigate_attract_shown') === 'true';
      if (!shown) setInvestigateAttract(true);
      const t = setTimeout(() => setInvestigateAttract(false), 8000);
      return () => clearTimeout(t);
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }, []);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('investigate_popover_dismissed') === 'true';
      // Don't show if dismissed, not on people tab, onboarding is active, or on mobile (button hidden)
      const isMobile = window.innerWidth < 768;

      if (!dismissed && activeTab === 'people' && !shouldShowOnboarding && !isMobile) {
        const timer = setTimeout(() => setInvestigatePopoverOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
  }, [activeTab, shouldShowOnboarding]);

  useEffect(() => {
    if (!investigatePopoverOpen) return;
    const anchor =
      (document.querySelector('[data-investigation-nav-top]') as HTMLElement) ||
      (document.querySelector('[data-investigation-nav]') as HTMLElement) ||
      investigateBtnRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const x = Math.round(rect.left + window.scrollX);
      const y = Math.round(rect.bottom + 8 + window.scrollY);
      setInvestigatePopoverPos({ x, y });
      const centerX = rect.left + rect.width / 2 + window.scrollX;
      const arrowX = Math.max(12, Math.min(300 - 12, centerX - x - 8));
      setInvestigateArrowLeft(arrowX);
    }
  }, [investigatePopoverOpen]);

  useEffect(() => {
    const reposition = () => {
      if (investigatePopoverOpen) {
        const anchor =
          (document.querySelector('[data-investigation-nav-top]') as HTMLElement) ||
          (document.querySelector('[data-investigation-nav]') as HTMLElement) ||
          investigateBtnRef.current;
        if (anchor) {
          const rect = anchor.getBoundingClientRect();
          const x = Math.round(rect.left + window.scrollX);
          const y = Math.round(rect.bottom + 8 + window.scrollY);
          setInvestigatePopoverPos({ x, y });
          const centerX = rect.left + rect.width / 2 + window.scrollX;
          const arrowX = Math.max(12, Math.min(300 - 12, centerX - x - 8));
          setInvestigateArrowLeft(arrowX);
        }
      }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, { passive: true });
    const id = setInterval(reposition, 300); // defensive update in dynamic layouts
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition);
      clearInterval(id);
    };
  }, [investigatePopoverOpen]);

  const [documentLoadingProgress, setDocumentLoadingProgress] = useState<string>('');
  const [, setDocumentLoadingProgressValue] = useState<number>(0);

  useEffect(() => {
    // Initialize document processor with REAL database documents
    const loadRealDocuments = async () => {
      try {
        console.log('Loading documents from API...');
        setDocumentLoadingProgress('Connecting to document database...');
        setDocumentLoadingProgressValue(10);
        // Fetch recent documents for client-side processing
        // Reduced from 3000 to 500 to prevent browser timeout (was taking 20+ seconds)
        const response = await apiClient.getDocuments({}, 1, 500);

        console.log('API response:', response);

        if (!response || !response.data) {
          throw new Error('Invalid API response structure');
        }

        if (response.data.length === 0) {
          throw new Error('No documents found in API response');
        }

        console.log(`Loaded ${response.data.length} documents from API (total: ${response.total})`);
        setDocumentLoadingProgress(`Processing ${response.data.length} documents...`);
        setDocumentLoadingProgressValue(40);

        const documents: Document[] = response.data.map((doc: any, index: number) => {
          // Update progress periodically
          if (index % 100 === 0) {
            const progress = 40 + Math.floor((index / response.data.length) * 40);
            setDocumentLoadingProgressValue(progress);
          }

          return {
            id: doc.id,
            title: doc.fileName,
            filename: doc.fileName,
            fileType: doc.fileType || 'unknown',
            fileSize: doc.fileSize || 0,
            dateCreated: doc.dateCreated,
            dateModified: doc.dateModified,
            content: doc.content || '',
            metadata: {
              source: 'Epstein Files',
              confidentiality: 'Public',
              categories: [],
              ...doc.metadata,
            },
            entities: [], // Entities are loaded separately or on demand
            spiceRating: doc.spiceRating || 1,
            spicePeppers: '🌶️'.repeat(doc.spiceRating || 1),
            spiceDescription: `Red Flag Index ${doc.spiceRating || 1}`,
          };
        });

        setDocumentLoadingProgress('Initializing document processor...');
        setDocumentLoadingProgressValue(80);
        const processor = new DocumentProcessor();
        await processor.loadDocuments(documents);
        setDocumentLoadingProgress('Documents ready');
        setDocumentLoadingProgressValue(100);
        setDocumentProcessor(processor);
      } catch (error) {
        console.error('Error loading documents:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        // SECURITY: Never fall back to sample/synthetic data - show clear error
        setDocumentLoadingProgress('Failed to load documents from server');
        setDocumentLoadingProgressValue(0);
        setDocumentProcessor(null);
        addToast({
          text: 'Could not load documents. Please check server connection.',
          type: 'error',
        });
      } finally {
        setDocumentsLoaded(true);
      }
    };

    loadRealDocuments();
  }, [addToast]);

  const handleSearchAndFilter = useCallback(async () => {
    if (!dataService) return;

    try {
      const filters: SearchFilters = {
        searchTerm: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
        entityType: entityType !== 'all' ? entityType : undefined,
        likelihoodScore: selectedRiskLevel ? [selectedRiskLevel] : undefined,
      };

      const result = await dataService.getPaginatedData(filters, currentPage);
      setPeople(result.data);
      setFilteredPeople(result.data);
      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
      setTotalPeople(result.total);

      // Enable virtual scrolling for large filtered datasets (disabled for pagination)
      // setUseVirtualScroll(result.total > 100);

      // Only update totalPeople count from search results, keep other global stats
      // unless we implement a specific filtered-stats endpoint
      if (filters.searchTerm) {
        // If searching, we might want to update stats to reflect search results
        // But for now, let's keep global stats in the header to avoid "0 files" issues
        // or just update the total count
      }
    } catch (error) {
      console.error('Error searching and filtering:', error);
    }
  }, [dataService, searchTerm, sortBy, sortOrder, entityType, selectedRiskLevel, currentPage]);

  // Handler for risk level chip clicks
  const handleRiskLevelClick = useCallback((level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    // Toggle: if clicking the same level, deselect it
    setSelectedRiskLevel((prev) => (prev === level ? null : level));
    // Reset to page 1 when filter changes
    setCurrentPage(1);
  }, []);

  // Handler to reset all filters
  const handleResetFilters = useCallback(() => {
    setSelectedRiskLevel(null);
    setEntityType('all');
    setSearchTerm('');
    setSortBy('spice');
    setSortOrder('desc');
    setCurrentPage(1);
  }, [setSelectedRiskLevel, setEntityType, setSearchTerm, setSortBy, setSortOrder, setCurrentPage]);

  useEffect(() => {
    handleSearchAndFilter();
  }, [handleSearchAndFilter]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);

    // Prefetch next page for smoother experience
    if (dataService && newPage < totalPages) {
      const filters: SearchFilters = {
        searchTerm: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
        entityType: entityType !== 'all' ? entityType : undefined,
        likelihoodScore: selectedRiskLevel ? [selectedRiskLevel] : undefined,
      };

      // Prefetch next page in background
      dataService.prefetchNextPage(filters, newPage).catch((error) => {
        console.warn('Failed to prefetch next page:', error);
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchAnalyticsData = useCallback(async () => {
    if (!dataService) return;

    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      console.log('Fetching analytics data...');
      // Get statistics from the data service
      const stats = await dataService.getStatistics();
      console.log('Analytics stats:', stats);

      // Set the analytics data directly - the stats already match what DataVisualization expects
      setAnalyticsData(stats);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [dataService]);

  // Effect for fetching analytics data when tab changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    }
  }, [activeTab, fetchAnalyticsData]);

  // Effect to prefetch next page when current page loads
  useEffect(() => {
    if (dataService && currentPage < totalPages) {
      const filters: SearchFilters = {
        searchTerm: searchTerm.trim() || undefined,
        sortBy,
        sortOrder,
        entityType: entityType !== 'all' ? entityType : undefined,
        likelihoodScore: selectedRiskLevel ? [selectedRiskLevel] : undefined,
      };

      // Prefetch next page in background
      dataService.prefetchNextPage(filters, currentPage).catch((error) => {
        console.warn('Failed to prefetch next page:', error);
      });
    }
  }, [
    dataService,
    currentPage,
    totalPages,
    searchTerm,
    sortBy,
    sortOrder,
    entityType,
    selectedRiskLevel,
  ]);

  const handlePersonClick = useCallback(
    (person: Person, searchTerm?: string) => {
      console.log('Person clicked:', person.name, 'Search term:', searchTerm);

      // Save current path before opening modal so we can restore it on close
      setPreviousPath(location.pathname + location.search);

      setSelectedPerson(person);
      setSearchTermForModal(searchTerm || '');

      // Update URL for shareable link
      if (person.id) {
        window.history.pushState({}, '', `/entity/${person.id}`);
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
    [location.pathname, location.search],
  );

  const handleDocumentClick = useCallback((document: any, searchTerm?: string) => {
    console.log('=== handleDocumentClick START ===');
    console.log('Document clicked:', document);
    console.log('document.id:', document?.id);
    console.log('Search term:', searchTerm);

    // Open inline document modal first; keep person modal to avoid race/unmount issues
    const docId = document?.id?.toString() || '';
    setDocumentModalId(docId);
    setDocumentModalInitial(document || null);

    // Set the search term for highlighting
    console.log('Setting selectedDocumentSearchTerm to:', searchTerm);
    if (searchTerm) {
      setSelectedDocumentSearchTerm(searchTerm);
      console.log('selectedDocumentSearchTerm set successfully');
    } else {
      console.log('No searchTerm provided, clearing selectedDocumentSearchTerm');
      setSelectedDocumentSearchTerm('');
    }

    // Keep legacy path as fallback for browser tab
    setSelectedDocumentId(docId);

    // Announce navigation for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Opening document ${document?.title || 'untitled'}`;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);

    console.log('=== handleDocumentClick END ===');
  }, []);

  const { user: currentUser, isAdmin } = useAuth();

  return (
    <ToastProvider>
      <UndoProvider>
        <InvestigationsProvider>
          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black relative overflow-x-hidden overflow-y-auto flex flex-col">
            <SEO />
            {shouldShowOnboarding && (
              <FirstRunOnboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />
            )}

            {/* Skip links for accessibility */}
            <div className="sr-only">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-slate-900 focus:text-white z-50"
              >
                Skip to main content
              </a>
              <a
                href="#navigation"
                className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-slate-900 focus:text-white z-50 mt-10"
              >
                Skip to navigation
              </a>
            </div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Background effects removed requested by user for stability */}

              {/* Floating particles removed due to UI blocking/performance issues */}
            </div>

            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40 transition-all duration-300">
              <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between py-2 min-h-[64px] gap-4">
                  {/* LEFT: Logo and Stats */}
                  <div className="flex items-center gap-6">
                    {/* Logo */}
                    <Link
                      to="/"
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20 flex-shrink-0">
                        <Icon name="Database" size="md" color="white" />
                      </div>
                      <RedactedLogo text="THE EPSTEIN FILES" />
                    </Link>

                    {/* Stats - Desktop only */}
                    <div className="hidden lg:flex items-center space-x-4 ml-4 pl-4 border-l border-slate-700/50">
                      <div className="flex flex-col items-start px-2 gap-0.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Subjects
                        </span>
                        <span className="text-sm font-bold text-cyan-400 font-mono">
                          {headerTotalPeople.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-start px-2 gap-0.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Mentions
                        </span>
                        <span className="text-sm font-bold text-blue-400 font-mono">
                          {headerTotalMentions.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex flex-col items-start px-2 gap-0.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Files
                        </span>
                        <span className="text-sm font-bold text-purple-400 font-mono">
                          {headerTotalFiles.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Actions and Search */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Button Group */}
                    <div className="hidden md:flex items-center gap-2 mr-2">
                      {/* New Investigation */}
                      <button
                        onClick={() => navigate('/investigations')}
                        className="group flex items-center bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-full h-10 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                        title="New Investigation"
                      >
                        <Icon name="Plus" size="sm" color="white" />
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-white ml-0 group-hover:ml-2">
                          New
                        </span>
                      </button>

                      {/* Shortcuts */}
                      <button
                        onClick={() => setShowKeyboardShortcuts(true)}
                        className="group flex items-center bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-full h-10 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                        title="Keyboard Shortcuts"
                      >
                        <Icon name="Command" size="sm" color="info" />
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-white ml-0 group-hover:ml-2">
                          Shortcuts
                        </span>
                      </button>

                      {/* Sources */}
                      <div className="group relative">
                        <button
                          onClick={() => navigate('/about')}
                          className="group flex items-center bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-full h-10 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                          title="Verified Sources"
                        >
                          <Icon name="Shield" size="sm" color="success" />
                          <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-white ml-0 group-hover:ml-2">
                            Sources
                          </span>
                        </button>
                        {/* Tooltip Panel */}
                        <div className="absolute hidden group-hover:block z-50 right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl transition-opacity duration-300">
                          <div className="text-sm font-semibold text-white mb-2">
                            Verified Sources
                          </div>
                          <div className="text-xs text-slate-300 space-y-2">
                            <div>
                              <div className="font-medium text-emerald-400 mb-1">Source Types:</div>
                              <ul className="list-disc list-inside space-y-1 text-slate-400">
                                <li>Court Documents & Legal Filings</li>
                                <li>Flight Logs & Travel Records</li>
                                <li>Email Correspondence</li>
                                <li>Deposition Transcripts</li>
                                <li>Financial Records</li>
                                <li>Photographic Evidence</li>
                              </ul>
                            </div>
                            <div className="pt-2 border-t border-slate-700">
                              <div className="font-medium text-cyan-400">
                                Total Documents: {headerTotalFiles.toLocaleString()}
                              </div>
                              <div className="text-slate-500 mt-1">
                                All sources verified through public court records and official
                                filings
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* What's New */}
                      <button
                        onClick={() => setShowReleaseNotes(true)}
                        className="group flex items-center bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-full h-10 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                        title="What's New"
                      >
                        <Icon name="Book" size="sm" color="info" />
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-white ml-0 group-hover:ml-2">
                          What's New
                        </span>
                      </button>

                      {/* Admin Dashboard */}
                      {isAdmin && (
                        <button
                          onClick={() => navigate('/admin')}
                          className="group flex items-center bg-blue-900/40 hover:bg-blue-800/40 border border-blue-700/50 rounded-full h-10 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                          title="Admin Dashboard"
                        >
                          <Icon name="Shield" size="sm" className="text-blue-400" />
                          <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-blue-100 ml-0 group-hover:ml-2">
                            Admin
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 md:flex-none flex gap-2">
                      <div className="relative flex-1">
                        <Icon
                          name="Search"
                          size="sm"
                          color="gray"
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                        />
                        <input
                          type="text"
                          placeholder="Search evidence..."
                          className="w-full md:w-64 pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-600/50 rounded-l-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm transition-all focus:w-full md:focus:w-80"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchTerm.trim()) {
                              navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (searchTerm.trim()) {
                            navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                          } else {
                            navigate('/search');
                          }
                        }}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-r-lg transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <Icon name="Search" size="sm" />
                        <span className="hidden md:inline">Search</span>
                      </button>
                      {searchTerm.trim().length >= 2 && (
                        <div className="absolute top-full right-0 mt-1 w-full md:w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                          <div className="p-2 text-xs text-slate-400 border-b border-slate-700">
                            Search results for "{searchTerm}"
                          </div>
                          {searchSuggestionsLoading ? (
                            <div className="px-3 py-4 text-sm text-slate-400 flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                              Searching...
                            </div>
                          ) : searchSuggestions.length > 0 ? (
                            searchSuggestions.slice(0, 8).map((p, i) => (
                              <button
                                key={`sugg-${p.id}-${i}`}
                                className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                                onClick={() => handlePersonClick(p, searchTerm)}
                              >
                                <Icon name="User" size="sm" color="gray" />
                                <span className="truncate flex-1">{p.name}</span>
                                <span className="text-xs text-slate-500">
                                  {p.role !== 'Unknown' ? p.role : 'Subject'}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-slate-400">
                              No subjects found
                            </div>
                          )}
                          <div className="border-t border-slate-700 mt-1 pt-1">
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-slate-800 flex items-center gap-2"
                              onClick={() =>
                                navigate(`/search?q=${encodeURIComponent(searchTerm)}`)
                              }
                            >
                              <Icon name="Search" size="sm" />
                              <span>Search all documents for "{searchTerm}"</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="md:hidden p-2 text-slate-400 hover:text-white"
                    >
                      {isMobileMenuOpen ? (
                        <Icon name="X" size="sm" />
                      ) : (
                        <Icon name="Menu" size="sm" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative z-10 flex-grow">
              {/* Mobile Stats Row */}
              <div className="md:hidden grid grid-cols-3 gap-2 mb-6 text-center">
                <button
                  onClick={() => navigate('/search')}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Subjects</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {headerTotalPeople.toLocaleString()}
                  </div>
                </button>
                <button
                  onClick={() => navigate('/search')}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Mentions</div>
                  <div className="text-lg font-bold text-blue-400">
                    {headerTotalMentions.toLocaleString()}
                  </div>
                </button>
                <button
                  onClick={() => navigate('/documents')}
                  className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Files</div>
                  <div className="text-lg font-bold text-purple-400">
                    {headerTotalFiles.toLocaleString()}
                  </div>
                </button>
              </div>
              {/* Simple loading indicator - no text labels */}
              <LoadingIndicator
                isLoading={
                  isInitializing ||
                  (!documentsLoaded && activeTab === 'documents') ||
                  analyticsLoading
                }
                label={
                  isInitializing
                    ? loadingProgress
                    : !documentsLoaded && activeTab === 'documents'
                      ? documentLoadingProgress
                      : undefined
                }
              />
              {/* Navigation Tabs - Compact layout to fit all 11 tabs */}
              <div className="hidden md:flex flex-nowrap gap-1 mb-6 text-sm font-medium w-full justify-between">
                <div className="relative group">
                  <button
                    onClick={() => navigate('/people')}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                      activeTab === 'people'
                        ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white border border-cyan-400/50 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                    }`}
                  >
                    <Icon name="Users" size="sm" />
                    <span className="hidden lg:inline">Subjects</span>
                  </button>
                  {/* Help Tooltip */}
                  <div className="absolute hidden group-hover:block z-50 left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl">
                    <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Icon name="HelpCircle" size="sm" color="info" />
                      What are Subjects?
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <p>
                        Subjects are individuals or entities mentioned in the Epstein archive
                        documents. Each subject has:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 ml-2">
                        <li>
                          <strong className="text-cyan-400">Red Flag Index (RFI)</strong>: Risk
                          rating from 1-5 based on mention context
                        </li>
                        <li>
                          <strong className="text-cyan-400">Mentions</strong>: Number of document
                          references
                        </li>
                        <li>
                          <strong className="text-cyan-400">Evidence Types</strong>: Categories of
                          supporting documents
                        </li>
                      </ul>
                      <p className="text-slate-500 pt-1 border-t border-slate-700 mt-2">
                        Click any subject card to view their full profile and connected evidence.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/documents')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'documents'
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white border border-red-400/50 shadow-sm shadow-red-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="FileText" size="sm" />
                  <span className="hidden lg:inline">Docs</span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem('investigate_attract_shown', 'true');
                        localStorage.setItem('investigate_popover_dismissed', 'true');
                      } catch (e) {
                        console.warn('localStorage not available:', e);
                      }
                      setInvestigateAttract(false);
                      setInvestigatePopoverOpen(false);
                      navigate('/investigations');
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                      activeTab === 'investigations'
                        ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white border border-pink-400/50 shadow-sm shadow-pink-500/20'
                        : `bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm ${investigateAttract ? 'ring-2 ring-pink-500 shadow-lg shadow-pink-500/30 animate-pulse' : ''}`
                    }`}
                    aria-haspopup="dialog"
                    aria-expanded={investigatePopoverOpen}
                    ref={investigateBtnRef}
                    data-investigation-nav-top
                  >
                    <Icon name="Target" size="sm" />
                    <span className="hidden lg:inline">Investigate</span>
                  </button>
                  {investigatePopoverOpen &&
                    activeTab !== 'investigations' &&
                    investigatePopoverPos.x !== 0 && // Ensure valid position
                    createPortal(
                      <div
                        className="fixed w-[320px] bg-slate-900 border border-pink-500/40 rounded-xl shadow-xl p-4 pointer-events-auto" // Ensure it doesn't block if transparent? Actually it has bg.
                        style={{
                          left: investigatePopoverPos.x,
                          top: investigatePopoverPos.y,
                          zIndex: 50, // Reduce from max int to something reasonable but high
                        }}
                      >
                        <div
                          className="absolute -top-2"
                          style={{ left: `${investigateArrowLeft}px` }}
                        >
                          <div className="w-4 h-4 bg-slate-900 border border-pink-500/40 rotate-45"></div>
                        </div>
                        <div className="text-white font-semibold mb-1">Investigations</div>
                        <div className="text-slate-300 text-sm mb-3">
                          Create and manage deep-dive investigations, link evidence, and track
                          findings.
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 hover:bg-slate-700"
                            onClick={() => {
                              try {
                                localStorage.setItem('investigate_popover_dismissed', 'true');
                              } catch (e) {
                                console.warn('localStorage not available:', e);
                              }
                              setInvestigatePopoverOpen(false);
                              setInvestigateAttract(false);
                            }}
                          >
                            Got it
                          </button>
                          <button
                            className="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg"
                            onClick={() => {
                              try {
                                localStorage.setItem('investigate_popover_dismissed', 'true');
                                localStorage.setItem('investigate_attract_shown', 'true');
                              } catch (e) {
                                console.warn('localStorage not available:', e);
                              }
                              setInvestigatePopoverOpen(false);
                              setInvestigateAttract(false);
                              navigate('/investigations');
                            }}
                          >
                            Try it
                          </button>
                        </div>
                      </div>,
                      document.body,
                    )}
                </div>
                <button
                  onClick={() => navigate('/timeline')}
                  onMouseEnter={() => preloader.prefetchJson('/api/timeline')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'timeline'
                      ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white border border-orange-400/50 shadow-sm shadow-orange-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="Clock" size="sm" />
                  <span className="hidden lg:inline">Timeline</span>
                </button>
                <button
                  onClick={() => navigate('/flights')}
                  onMouseEnter={() => preloader.prefetchJson('/api/flights')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'flights'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white border border-cyan-400/50 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="Navigation" size="sm" />
                  <span className="hidden lg:inline">Flights</span>
                </button>
                <button
                  onClick={() => navigate('/properties')}
                  onMouseEnter={() => preloader.prefetchJson('/api/properties/stats')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'properties'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="Building" size="sm" />
                  <span className="hidden lg:inline">Property</span>
                </button>
                <button
                  onClick={() => navigate('/media')}
                  onMouseEnter={() => {
                    preloader.prefetchJson('/api/media/albums');
                    preloader.prefetchJson('/api/media/images?limit=24');
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'media'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border border-indigo-400/50 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="Newspaper" size="sm" />
                  <span className="hidden lg:inline">Media</span>
                </button>
                <button
                  onClick={() => navigate('/emails')}
                  onMouseEnter={() => preloader.prefetchJson('/api/emails')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'emails'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border border-blue-400/50 shadow-sm shadow-blue-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="Mail" size="sm" />
                  <span className="hidden lg:inline">Emails</span>
                </button>
                <button
                  onClick={() => navigate('/blackbook')}
                  onMouseEnter={() => preloader.prefetchJson('/api/media/albums')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'blackbook'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white border border-amber-400/50 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="BookOpen" size="sm" />
                  <span>Black Book</span>
                </button>
                <button
                  onClick={() => navigate('/analytics')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'analytics'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border border-purple-400/50 shadow-sm shadow-purple-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="BarChart3" size="sm" />
                  <span className="hidden lg:inline">Stats</span>
                </button>
                <button
                  onClick={() => navigate('/about')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg transition-all duration-300 whitespace-nowrap ${
                    activeTab === 'about'
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white border border-cyan-400/50 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-800/40 text-slate-400 hover:text-white hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 backdrop-blur-sm'
                  }`}
                >
                  <Icon name="Shield" size="sm" />
                  <span className="hidden lg:inline">About</span>
                </button>
              </div>
              <MobileMenu
                open={isMobileMenuOpen}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                onNavigate={(p) => navigate(p)}
                onClose={() => setIsMobileMenuOpen(false)}
              />

              {/* Tab Content */}
              <div id="main-content" className="flex-grow">
                {/* Breadcrumb navigation */}
                <div className="mb-4 px-4 md:px-0">
                  <Breadcrumb
                    items={[
                      { label: 'Home', href: '/' },
                      { label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1) },
                    ]}
                  />
                </div>
                <div className="view-transition-enter view-transition-enter-active">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                      </div>
                    }
                  >
                    {activeTab === 'people' && (
                      <div className="space-y-6">
                        {/* Stats Overview - Using Real Data */}
                        {loading && !dataStats.totalPeople ? (
                          <StatsSkeleton />
                        ) : (
                          <StatsDisplay
                            stats={dataStats}
                            selectedRiskLevel={selectedRiskLevel}
                            onRiskLevelClick={handleRiskLevelClick}
                            onResetFilters={handleResetFilters}
                          />
                        )}

                        {/* Filters and Controls - Mobile-first layout */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3">
                          {/* Results info - Hidden on mobile */}
                          <div className="hidden md:flex items-center gap-2">
                            <Icon name="Users" size="md" color="info" className="flex-shrink-0" />
                            <p className="text-slate-400 text-sm">
                              {(totalPeople ?? 0).toLocaleString()} subjects
                              {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
                            </p>
                          </div>

                          {/* Controls - Always visible, compact on mobile */}
                          <div className="w-full md:w-auto grid grid-cols-[1fr_1fr_auto] gap-2 md:flex md:items-center font-sans">
                            {/* Add Subject - Only for admin/moderator users */}
                            {isAdmin && (
                              <button
                                onClick={() => setShowCreateEntityModal(true)}
                                className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
                              >
                                <Icon name="Plus" size="sm" />
                                <span className="hidden sm:inline">Add Subject</span>
                              </button>
                            )}

                            {/* Entity Type Filter */}
                            <EntityTypeFilter
                              value={entityType}
                              onChange={setEntityType}
                              className="w-full md:w-auto"
                            />

                            {/* Sort Dropdown - No label on mobile */}
                            <SortFilter
                              value={sortBy}
                              onChange={(val) => setSortBy(val as any)}
                              options={[
                                {
                                  value: 'spice',
                                  label: 'Red Flag',
                                  icon: (
                                    <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                                      🚩
                                    </div>
                                  ),
                                },
                                {
                                  value: 'mentions',
                                  label: 'Mentions',
                                  icon: (
                                    <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                                      📊
                                    </div>
                                  ),
                                },
                                {
                                  value: 'risk',
                                  label: 'Risk',
                                  icon: (
                                    <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                                      ⚠️
                                    </div>
                                  ),
                                },
                                {
                                  value: 'name',
                                  label: 'Name',
                                  icon: (
                                    <div className="w-4 h-4 flex items-center justify-center text-base leading-none">
                                      👤
                                    </div>
                                  ),
                                },
                              ]}
                              className="w-full md:w-auto"
                            />

                            {/* Sort Order Toggle */}
                            <button
                              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                              className="h-10 w-10 flex items-center justify-center bg-slate-800 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                            >
                              {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                          </div>
                        </div>

                        {/* Featured Content Banner - Only on Page 1 Default View */}
                        {currentPage === 1 && !searchTerm && !entityType && (
                          <div className="mb-8 rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-900/40 to-slate-900/40 p-6 shadow-lg backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                    NEW INVESTIGATION
                                  </span>
                                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                                    <span className="animate-pulse">●</span> HIGH PRIORITY
                                  </span>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight group-hover:text-blue-200 transition-colors">
                                  The Sascha Barros Testimony
                                </h2>
                                <p className="text-slate-300 max-w-2xl leading-relaxed">
                                  Exclusive 6-part interview series revealing critical new details
                                  about the network's operation. Includes full audio recordings and
                                  searchable precision transcripts.
                                </p>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                                <button
                                  onClick={() => navigate('/media/audio?albumId=25')}
                                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 group/btn"
                                >
                                  <svg
                                    className="w-5 h-5 fill-current group-hover/btn:scale-110 transition-transform"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  Listen to Interviews
                                </button>
                                <button
                                  onClick={() => navigate('/media/articles?q=Sascha%20Barros')}
                                  className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-medium transition-all hover:bg-slate-750"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                  </svg>
                                  Read Transcripts
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* People Grid - Use virtualization for large datasets */}
                        {loading ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {/* Show 12 skeletons while loading to match 3-column grid */}
                            {[...Array(12)].map((_, index) => (
                              <PersonCardSkeleton key={`skeleton-${index}`} />
                            ))}
                          </div>
                        ) : filteredPeople.length > 100 ? (
                          // Use virtual list for large datasets
                          <div className="h-[600px]">
                            <VirtualList
                              items={filteredPeople}
                              itemHeight={300}
                              containerHeight={600}
                              renderItem={(person, index) => (
                                <div className="p-2">
                                  <PersonCard
                                    key={`${person.name}-${index}`}
                                    person={person}
                                    onClick={() => handlePersonClick(person, searchTerm)}
                                    searchTerm={searchTerm}
                                    onDocumentClick={handleDocumentClick}
                                  />
                                </div>
                              )}
                              onItemClick={(person) => handlePersonClick(person, searchTerm)}
                            />
                          </div>
                        ) : (
                          // Use grid layout for smaller datasets
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredPeople.map((person, index) => (
                              <PersonCard
                                key={`${person.name}-${index}`}
                                person={person}
                                onClick={() => handlePersonClick(person, searchTerm)}
                                searchTerm={searchTerm}
                                onDocumentClick={handleDocumentClick}
                              />
                            ))}
                          </div>
                        )}

                        {!loading && filteredPeople.length === 0 && (
                          <div className="text-center py-12">
                            <Icon name="Users" size="xl" color="gray" className="mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-300 mb-2">
                              No results found
                            </h3>
                            <p className="text-slate-400">Try adjusting your search terms</p>
                          </div>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-center space-x-4 mt-8">
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors btn-secondary"
                            >
                              <Icon name="ChevronLeft" size="sm" />
                              <span>Previous</span>
                            </button>

                            <div className="flex items-center space-x-2">
                              <span className="text-slate-400">Page</span>
                              <span className="text-white font-medium">{currentPage}</span>
                              <span className="text-slate-400">of</span>
                              <span className="text-white font-medium">{totalPages}</span>
                            </div>

                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === totalPages}
                              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors btn-secondary"
                            >
                              <span>Next</span>
                              <Icon name="ChevronRight" size="sm" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'analytics' && (
                      <ScopedErrorBoundary>
                        <div className="space-y-8">
                          <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-2">
                              Enhanced Analytics
                            </h2>
                            <p className="text-slate-400">
                              Interactive visualizations of the Epstein Investigation dataset
                            </p>
                          </div>
                          <EnhancedAnalytics
                            onEntitySelect={(entityId) => {
                              const person = filteredPeople.find((p) => Number(p.id) === entityId);
                              if (person) {
                                setSelectedPerson(person);
                                setSearchTermForModal('');
                              }
                            }}
                            onTypeFilter={(type) => {
                              // Could filter to documents tab with this type
                              console.log('Filter by type:', type);
                            }}
                          />

                          {/* Classic Analytics - Always Visible */}
                          <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                                Classic Analytics
                              </span>
                            </h3>
                            <DataVisualization
                              people={filteredPeople}
                              analyticsData={analyticsData}
                              loading={analyticsLoading}
                              error={analyticsError}
                              onRetry={fetchAnalyticsData}
                              onPersonSelect={(person) => {
                                setSelectedPerson(person);
                                setSearchTermForModal('');
                              }}
                            />
                          </div>
                        </div>
                      </ScopedErrorBoundary>
                    )}

                    {activeTab === 'search' && <EvidenceSearch onPersonClick={handlePersonClick} />}

                    {activeTab === 'documents' && (
                      <div className="space-y-6">
                        {documentProcessor && (
                          <DocumentBrowser
                            processor={documentProcessor}
                            searchTerm={selectedDocumentSearchTerm}
                            onSearchTermChange={setSelectedDocumentSearchTerm}
                            selectedDocumentId={selectedDocumentId}
                            onDocumentClose={() => {
                              setSelectedDocumentId('');
                              setSelectedDocumentSearchTerm('');
                            }}
                          />
                        )}
                      </div>
                    )}
                    {activeTab === 'timeline' && <TimelineWithFlights />}

                    {activeTab === 'flights' && (
                      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
                        <FlightTracker />
                      </div>
                    )}

                    {activeTab === 'properties' && (
                      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
                        <PropertyBrowser />
                      </div>
                    )}

                    {activeTab === 'emails' && (
                      <div className="h-full">
                        <EmailClient />
                      </div>
                    )}

                    {activeTab === 'media' && (
                      <ScopedErrorBoundary>
                        <MediaAndArticlesTab />
                      </ScopedErrorBoundary>
                    )}

                    {activeTab === 'about' && <AboutPage />}
                    {activeTab === 'faq' && <FAQPage />}

                    {activeTab === 'login' && <LoginPage />}

                    {activeTab === 'admin' && <AdminDashboard />}

                    {activeTab === 'evidence' && <EvidenceDetail />}

                    {activeTab === 'review' && (
                      <Suspense
                        fallback={
                          <LoadingIndicator isLoading={true} label="Loading Review Dashboard..." />
                        }
                      >
                        <ReviewDashboard />
                      </Suspense>
                    )}

                    {activeTab === 'investigations' &&
                      (() => {
                        // Extract investigation ID from URL path (e.g., /investigations/maxwell-epstein-network-001)
                        const pathParts = location.pathname.split('/');
                        const investigationIdFromUrl =
                          pathParts.length > 2 && pathParts[1] === 'investigations' && pathParts[2]
                            ? pathParts[2]
                            : undefined;
                        return (
                          <InvestigationWorkspace
                            investigationId={investigationIdFromUrl}
                            currentUser={
                              currentUser
                                ? {
                                    id: currentUser.id,
                                    name: currentUser.username,
                                    email: currentUser.email || 'investigator@example.com',
                                    role: isAdmin ? 'lead' : 'analyst',
                                    permissions: ['read', 'write', ...(isAdmin ? ['admin'] : [])],
                                    joinedAt: new Date(),
                                    expertise: ['investigative journalism', 'data analysis'],
                                  }
                                : {
                                    id: 'guest',
                                    name: 'Guest',
                                    email: 'guest@example.com',
                                    role: 'analyst',
                                    permissions: ['read'],
                                    joinedAt: new Date(),
                                    expertise: [],
                                  }
                            }
                          />
                        );
                      })()}

                    {activeTab === 'blackbook' && (
                      <div className="mt-6">
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center h-64">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                            </div>
                          }
                        >
                          <BlackBookViewer />
                        </Suspense>
                      </div>
                    )}
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Evidence Modal */}
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                </div>
              }
            >
              {selectedPerson && (
                <ScopedErrorBoundary>
                  <EvidenceModal
                    person={selectedPerson}
                    onClose={() => {
                      setSelectedPerson(null);
                      navigate(previousPath || '/people');
                    }}
                    searchTerm={searchTermForModal}
                    onDocumentClick={handleDocumentClick}
                  />
                </ScopedErrorBoundary>
              )}
            </Suspense>
            {/* Inline Document Modal */}
            <Suspense fallback={null}>
              {documentModalId && (
                <DocumentModal
                  id={documentModalId}
                  searchTerm={selectedDocumentSearchTerm}
                  initialDoc={documentModalInitial}
                  onClose={() => {
                    setDocumentModalId('');
                    setDocumentModalInitial(null);
                    if (activeTab === 'documents') {
                      navigate('/documents');
                    } else if (location.pathname.startsWith('/documents/')) {
                      navigate('/documents');
                    }
                  }}
                />
              )}
            </Suspense>

            <Suspense fallback={null}>
              <ReleaseNotesPanel
                isOpen={showReleaseNotes}
                onClose={() => setShowReleaseNotes(false)}
                releaseNotes={parsedReleaseNotes}
              />
            </Suspense>

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />

            {showCreateEntityModal && (
              <CreateEntityModal
                onClose={() => setShowCreateEntityModal(false)}
                onSuccess={() => {
                  // Refresh data
                  if (dataService) {
                    dataService
                      .getPaginatedData(
                        {
                          searchTerm: searchTerm.trim() || undefined,
                          sortBy,
                          sortOrder,
                          entityType: entityType !== 'all' ? entityType : undefined,
                          likelihoodScore: selectedRiskLevel ? [selectedRiskLevel] : undefined,
                        },
                        currentPage,
                      )
                      .then((result) => {
                        setPeople(result.data);
                        setFilteredPeople(result.data);
                        setTotalPages(result.totalPages);
                        setTotalPeople(result.total);
                      });
                  }
                }}
              />
            )}

            <Footer onVersionClick={() => setShowReleaseNotes(true)} />
            {showAudioCTA && activeTab !== 'media' && (
              <div className="fixed bottom-4 right-4 z-50">
                <div className="flex items-center gap-3 px-4 py-3 rounded-full bg-slate-900/90 border border-cyan-600 shadow-xl backdrop-blur">
                  <button
                    onClick={() => {
                      navigate('/media/audio?albumId=25&quickstart=1');
                      try {
                        localStorage.setItem('cta_audio_dismissed', '1');
                      } catch (e) {
                        console.warn('Failed to persist audio CTA dismissal flag', e);
                      }
                      setShowAudioCTA(false);
                    }}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs"
                  >
                    Listen Now
                  </button>
                  <span className="text-xs text-slate-300">New: Sascha Barros Testimony</span>
                  <button
                    onClick={async () => {
                      try {
                        const resp = await fetch(
                          `/api/investigations/by-title?title=${encodeURIComponent('Sascha Barros Testimony')}`,
                        );
                        if (resp.ok) {
                          const inv = await resp.json();
                          navigate(`/investigations/${inv.id}`);
                        }
                      } catch (e) {
                        console.warn('Failed to open Sascha investigation from CTA', e);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded-full text-xs border border-amber-500"
                  >
                    Open Investigation
                  </button>
                  <button
                    onClick={() => {
                      try {
                        localStorage.setItem('cta_audio_dismissed', '1');
                      } catch (e) {
                        console.warn('Failed to persist audio CTA dismissal flag', e);
                      }
                      setShowAudioCTA(false);
                    }}
                    className="text-slate-400 hover:text-white"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        </InvestigationsProvider>
      </UndoProvider>
    </ToastProvider>
  );
}

export default App;
