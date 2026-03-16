import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from 'react';
import { preloader } from './utils/ResourcePreloader';
import { runDevAffordanceAudit } from './utils/devAffordanceAudit';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, Link } from 'react-router-dom';
// Icons imported as needed via Icon component
import { Person } from './types';

import { useNavigation } from './services/NavigationContext';
import { apiClient } from './services/apiClient';
// SECURITY: Removed non-authoritative document import paths
import { useCountUp } from './hooks/useCountUp';
import MobileMenu from './components/layout/MobileMenu';
import UndoProvider from './components/UndoManager';
import ToastProvider from './components/common/ToastProvider';
import { useToasts } from './components/common/useToasts';
import ScopedErrorBoundary from './components/common/ScopedErrorBoundary';
// ProgressBar available but not currently used
import LoadingIndicator from './components/common/LoadingIndicator';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { Breadcrumb } from './components/layout/Breadcrumb';
import Icon from './components/common/Icon';
import { RedactedLogo } from './components/RedactedLogo';
// getEntityTypeIcon available via Icon component
import { FirstRunOnboarding } from './components/FirstRunOnboarding';
import { useFirstRunOnboarding } from './hooks/useFirstRunOnboarding';
import { InvestigationsProvider } from './contexts/InvestigationsContext';
import { useAuth } from './contexts/AuthContext';
import { useFilters } from './contexts/useFilters';
import { LoginPage } from './pages/LoginPage';
import { SEO } from './components/common/SEO';
const PeoplePage = lazy(() =>
  import('./pages/PeoplePage').then((m) => ({ default: m.PeoplePage })),
);
const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })),
);
const TimelinePage = lazy(() =>
  import('./pages/TimelinePage').then((m) => ({ default: m.TimelinePage })),
);
const FlightsPage = lazy(() =>
  import('./pages/FlightsPage').then((m) => ({ default: m.FlightsPage })),
);
const PropertyPage = lazy(() =>
  import('./pages/PropertyPage').then((m) => ({ default: m.PropertyPage })),
);
const EmailPage = lazy(() => import('./pages/EmailPage').then((m) => ({ default: m.EmailPage })));
const MediaPage = lazy(() => import('./pages/MediaPage').then((m) => ({ default: m.MediaPage })));
const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const EvidenceModal = lazy(() =>
  import('./components/common/EvidenceModal').then((module) => ({ default: module.EvidenceModal })),
);
const BlackBookViewer = lazy(() =>
  import('./components/BlackBookViewer').then((module) => ({ default: module.BlackBookViewer })),
);
const EvidenceSearch = lazy(() =>
  import('./components/EvidenceSearch').then((module) => ({ default: module.EvidenceSearch })),
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
const AboutPage = lazy(() =>
  import('./components/pages/AboutPage').then((module) => ({ default: module.default })),
);
const FAQPage = lazy(() =>
  import('./components/pages/FAQPage').then((module) => ({ default: module.default })),
);
const TheEpsteinFilesPage = lazy(() =>
  import('./pages/TheEpsteinFilesPage').then((module) => ({ default: module.TheEpsteinFilesPage })),
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

import releaseNotesRaw from '../../release_notes.md?raw';

// Helper to parse markdown release notes
const parseReleaseNotes = (markdown: string) => {
  try {
    const sections: string[] = [];
    const lines = markdown.split('\n');
    let current: string[] = [];

    const isVersionHeading = (line: string): boolean =>
      /^##\s+(?:[Vv]ersion\s+|[Vv])?\d+\.\d+\.\d+\b/.test(line) ||
      /^#\s*📣\s*Epstein Archive\s+[Vv]\d+\.\d+\.\d+\b/.test(line);

    for (const line of lines) {
      if (isVersionHeading(line)) {
        if (current.length > 0) {
          sections.push(current.join('\n'));
          current = [];
        }
      }
      if (current.length > 0 || isVersionHeading(line)) {
        current.push(line);
      }
    }
    if (current.length > 0) {
      sections.push(current.join('\n'));
    }

    return sections
      .map((section) => {
        const sectionLines = section.split('\n').map((l) => l.trim());
        if (sectionLines.length === 0) return null;

        const headerLine = sectionLines[0];
        const versionMatch = headerLine.match(/(?:[Vv]ersion\s+|[Vv])?(\d+\.\d+\.\d+)/);
        const version = versionMatch ? `v${versionMatch[1]}` : 'Update';

        let date = 'Recent';
        const isoDate = headerLine.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoDate) date = isoDate[1];
        const parenDate = headerLine.match(/\(([^)]+)\)/);
        if (parenDate) date = parenDate[1];

        let title = 'Maintenance Update';
        const dashTitle = headerLine.match(/[—-]\s*(.+)$/);
        if (dashTitle) {
          const candidate = dashTitle[1].trim().replace(/^\d{4}-\d{2}-\d{2}\s*[—-]\s*/, '');
          if (candidate.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
            title = candidate;
          }
        }
        if (title === 'Maintenance Update') {
          const sectionHeading = sectionLines.find((line) => line.startsWith('### '));
          if (sectionHeading) {
            title = sectionHeading.replace(/^###\s+/, '').trim();
          }
        }

        const notes: string[] = [];
        for (const line of sectionLines) {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            notes.push(line.substring(2));
          } else if (line.startsWith('### ')) {
            notes.push(line);
          }
        }

        return { version, date, title, notes };
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
  const { filters, setFilters } = useFilters();
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();

  // Determine active tab from URL
  const getTabFromPath = (pathname: string): Tab => {
    if (pathname === '/' || pathname === '/people') return 'people';
    if (pathname === '/the-epstein-files') return 'landing';
    if (pathname === '/epstein-documents') return 'landing';
    if (pathname === '/epstein-people') return 'landing';
    if (pathname === '/epstein-media') return 'landing';
    if (pathname === '/epstein-timeline') return 'landing';
    if (pathname === '/epstein-flights') return 'landing';
    if (pathname.startsWith('/entity/')) return 'people'; // Entity modal opens on people tab
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/documents')) return 'documents';
    if (pathname.startsWith('/media')) return 'media';
    if (pathname.startsWith('/timeline')) return 'timeline';
    if (pathname.startsWith('/investigations')) return 'investigations';
    if (pathname.startsWith('/investigate')) return 'investigations';
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
    | 'admin'
    | 'landing';
  const activeTab = getTabFromPath(location.pathname);
  const landingVariant = (() => {
    if (location.pathname === '/epstein-documents') return 'documents';
    if (location.pathname === '/epstein-people') return 'people';
    if (location.pathname === '/epstein-media') return 'media';
    if (location.pathname === '/epstein-timeline') return 'timeline';
    if (location.pathname === '/epstein-flights') return 'flights';
    return 'overview';
  })() as 'overview' | 'documents' | 'people' | 'media' | 'timeline' | 'flights';
  const seoConfig = useMemo(() => {
    const origin = 'https://epstein.academy';
    const canonical = `${origin}${location.pathname}`;
    const commonKeywords = ['Epstein Files', 'Epstein documents', 'Jeffrey Epstein archive'];

    if (location.pathname.startsWith('/documents')) {
      return {
        title: 'Epstein Documents',
        description:
          'Search Epstein files by document title, source, OCR text, and linked entities in the document browser.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'court documents', 'depositions', 'evidence files'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Epstein Documents Dataset',
          description:
            'Searchable collection of documents, OCR text, and metadata from the Epstein files archive.',
          url: canonical,
          inLanguage: 'en',
          isAccessibleForFree: true,
        },
      };
    }

    if (location.pathname.startsWith('/people')) {
      return {
        title: 'Epstein People Index',
        description:
          'Browse entities, mention context, and supporting references across the Epstein files archive.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'Epstein people', 'entity index', 'named entities'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Epstein People Index',
          description: 'Entity index and relationship navigation for people linked in the archive.',
          url: canonical,
        },
      };
    }

    if (location.pathname.startsWith('/media')) {
      const hasShareParams =
        location.search.includes('id=') || location.search.includes('albumId=');
      const mediaCanonical = hasShareParams ? `${canonical}${location.search}` : canonical;
      return {
        title: 'Epstein Media Archive',
        description:
          'Explore photos, audio, and video connected to the Epstein files with album and document context.',
        url: mediaCanonical,
        canonical: mediaCanonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein media', 'epstein photos', 'epstein audio'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Epstein Media Archive',
          description:
            'Image, audio, and video records linked to entities and documents in the Epstein archive.',
          url: mediaCanonical,
        },
      };
    }

    if (location.pathname.startsWith('/timeline')) {
      return {
        title: 'Epstein Timeline',
        description:
          'Trace key events and evidence chronology in the Epstein files timeline with linked source records.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein timeline', 'chronology', 'event sequence'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Epstein Timeline',
          description: 'Chronological view of archive events linked to documents and entities.',
          url: canonical,
        },
      };
    }

    if (location.pathname.startsWith('/flights')) {
      return {
        title: 'Epstein Flight Logs',
        description:
          'Analyze Epstein flight records, routes, and travel patterns with searchable evidence context.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein flight logs', 'flight records', 'travel routes'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Epstein Flight Logs',
          description: 'Structured flight records linked to entities and documents.',
          url: canonical,
          isAccessibleForFree: true,
        },
      };
    }

    if (location.pathname === '/the-epstein-files' || location.pathname.startsWith('/epstein-')) {
      return {
        title: 'The Epstein Files',
        description:
          'Primary archive landing page for searching the Epstein files across documents, media, entities, flights, and timelines.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'the epstein files', 'epstein files archive', 'epstein data'],
        schema: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'The Epstein Files',
            description:
              'Public-facing archive for browsing documents, entities, and evidence linked to the Epstein files.',
            url: canonical,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Epstein Files Archive Dataset',
            description:
              'Searchable structured archive of records, OCR text, media, and entities tied to the Epstein files.',
            url: canonical,
            isAccessibleForFree: true,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: 'The Epstein Files Archive: public search access',
            dateModified: new Date().toISOString(),
            mainEntityOfPage: canonical,
            publisher: {
              '@type': 'Organization',
              name: 'Glass Academy',
              url: 'https://epstein.academy',
            },
          },
        ],
      };
    }

    if (location.pathname.startsWith('/about')) {
      return {
        title: 'About the Epstein Files Archive',
        description:
          'Methodology, source provenance, and ingestion status for the Epstein Files Archive.',
        url: canonical,
        canonical,
        type: 'article',
        keywords: [...commonKeywords, 'methodology', 'archive status', 'data provenance'],
      };
    }

    return {
      title: 'Epstein Files Archive',
      description:
        'Search and analyze the Epstein Files archive: documents, emails, media, entities, timelines, and flights.',
      url: canonical,
      canonical,
      type: 'website',
      keywords: commonKeywords,
    };
  }, [location.pathname, location.search]);

  // people state removed - PeoplePage handles its own data fetching

  // UNUSED STATE REMOVED:  const [people, setPeople] = useState<Person[]>([]);
  // filteredPeople removed - unused
  const [sortBy, setSortBy] = useState<'name' | 'mentions' | 'red_flag' | 'risk'>('red_flag');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [entityType, setEntityType] = useState<string>('all');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW' | null>(
    null,
  );

  // Modal State
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [previousPath, setPreviousPath] = useState<string>('/people');

  // Document Viewing
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocumentSearchTerm, setSelectedDocumentSearchTerm] = useState<string>('');
  const [documentModalId, setDocumentModalId] = useState<string | null>(null);
  const [documentModalInitial, setDocumentModalInitial] = useState<any>(null);

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

  type SearchSuggestion = Person & {
    canonicalName?: string;
    matchedAlias?: string | null;
  };

  // Search suggestions from API (not limited to current page)
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
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
        const normalized: SearchSuggestion[] = entities.map((e: any) => ({
          id: e.id,
          name: e.fullName || e.name,
          fullName: e.fullName || e.name,
          canonicalName: e.canonicalName || e.fullName || e.name,
          matchedAlias: e.matchedAlias || null,
          role: e.primaryRole || e.role || 'Unknown',
          mentions: e.mention_count || e.mentions || 0,
          redFlagRating: e.redFlagRating ?? 0,
          files: e.document_count || e.files || 0,
          contexts: [],
          evidenceTypes: [],
          significantPassages: [],
          fileReferences: [],
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

  // First  // Onboarding
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
    // Only fetch if we don't have the person OR if the ID doesn't match
    if (entityMatch) {
      const entityId = parseInt(entityMatch[1], 10);
      if (!selectedPerson || selectedPerson.id !== entityId) {
        // Clear conflicting modals
        setDocumentModalId('');
        setDocumentModalInitial(null);

        fetch(`/api/entities/${entityId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.id) {
              const person: Person = {
                id: data.id,
                name: data.fullName || 'Unknown',
                fullName: data.fullName || 'Unknown',
                role: data.primaryRole || 'Unknown',
                mentions: data.mentions || data.mention_count || 0,
                redFlagRating: data.redFlagRating ?? 0,
                files: data.documentCount || data.document_count || 0,
                contexts: [],
                evidenceTypes: data.evidenceTypes || [],
                significantPassages: [],
                likelihoodScore: data.likelihoodLevel || 'MEDIUM',
                fileReferences: [],
                bio: data.bio || data.description,
                birthDate: data.birthDate,
                deathDate: data.deathDate,
                photos: data.photos,
                blackBookEntries: data.blackBookEntry,
                entityType: data.entityType || (data as any).type,
                redFlagDescription: data.redFlagDescription,
              };
              setSelectedPerson(person);
            }
          })
          .catch((err) => console.error('Error loading entity from URL:', err));
      }
    } else if (selectedPerson && !location.pathname.startsWith('/blackbook')) {
      // Clear selected person if we are not on an entity route anymore
      // Exception for blackbook which might open a modal in-situ (though we're changing that)
      setSelectedPerson(null);
    }
  }, [location.pathname, selectedPerson, setDocumentModalId, setDocumentModalInitial]); // Added setters to dependencies

  // Handle global entity click events (e.g. from DocumentMetadataPanel or MediaViewerModal)
  useEffect(() => {
    const handleEntityClick = (event: CustomEvent) => {
      const { id, name } = event.detail;
      if (id) {
        // We create a partial person object, EvidenceModal will self-enrich
        const partialPerson: any = {
          id: Number(id),
          name: name || 'Unknown Entity',
        };
        setSelectedPerson(partialPerson);
      }
    };

    window.addEventListener('entityClick', handleEntityClick as EventListener);
    return () => {
      window.removeEventListener('entityClick', handleEntityClick as EventListener);
    };
  }, []);

  // Load document from URL on page load (for shareable links)
  useEffect(() => {
    const pathMatch = location.pathname.match(/^\/documents\/([^/?#]+)/);
    const params = new URLSearchParams(location.search);
    const queryDocId = params.get('id') || params.get('docId') || params.get('documentId');
    const docId = pathMatch?.[1] || queryDocId;

    if (docId) {
      if (documentModalId !== docId) {
        // Clear conflicting modals
        setSelectedPerson(null);

        setDocumentModalId(docId);
        setSelectedDocumentId(docId);
      }
    } else if (documentModalId) {
      // Clear document modal if we are no longer on a document route
      setDocumentModalId('');
      setDocumentModalInitial(null);
    }
  }, [
    location.pathname,
    location.search,
    documentModalId,
    setSelectedPerson,
    setSelectedDocumentId,
  ]);

  // Safety net for legacy justice.gov path swaps when edge proxy serves SPA shell.
  // Example: /epstein/files/DataSet%209/EFTA01188336.pdf
  useEffect(() => {
    if (!location.pathname.startsWith('/epstein/files/')) return;
    const suffix = location.pathname.replace(/^\/epstein\/files\//, '');
    if (!suffix) return;

    let cancelled = false;
    const resolveAndNavigate = async () => {
      try {
        const response = await fetch(
          `/api/resolve/epstein-file?path=${encodeURIComponent(suffix)}`,
          {
            credentials: 'include',
          },
        );
        if (!response.ok) return;

        const payload = (await response.json()) as { redirectTo?: string; documentId?: string };
        if (cancelled) return;

        if (payload.redirectTo) {
          navigate(payload.redirectTo, { replace: true });
          return;
        }
        if (payload.documentId) {
          navigate(`/documents/${payload.documentId}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to resolve legacy epstein path:', error);
      }
    };

    void resolveAndNavigate();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

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
  }, [
    navigate,
    selectedPerson,
    documentModalId,
    showReleaseNotes,
    showKeyboardShortcuts,
    activeTab,
    location.pathname,
    previousPath,
  ]);
  const [dataStats, setDataStats] = useState(() => {
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [, setLoadingProgressValue] = useState<number>(0);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { addToast } = useToasts();
  useEffect(() => {
    // Initialize optimized data service
    const initializeDataService = async () => {
      try {
        setIsInitializing(true);
        setLoadingProgress('Connecting to database...');
        setLoadingProgressValue(10);
        setLoadingProgress('Loading subjects...');
        setLoadingProgressValue(30);

        // Load first page of data
        console.log('About to load first page...');
        const result = await apiClient.getEntities({}, 1); // Use apiClient instead of OptimizedDataService
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
          redFlagRating: p.redFlagRating ?? 0,
          name: p.name ?? p.fullName,
          files: p.files ?? p.documentCount ?? 0,
          likelihoodScore:
            p.likelihoodScore ??
            p.likelihoodLevel ??
            ((p.redFlagRating ?? 0) >= 4 ? 'HIGH' : (p.redFlagRating ?? 0) >= 2 ? 'MEDIUM' : 'LOW'),
        }));
        // Cache first page for next load
        try {
          sessionStorage.setItem(
            'epstein_archive_people_page1_v13_14_1',
            JSON.stringify(normalized),
          );
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
        setIsInitializing(false);
      }
    };

    initializeDataService();

    // Fetch global stats
    const fetchGlobalStats = async () => {
      try {
        setLoadingProgress('Loading statistics...');
        setLoadingProgressValue(80);
        setLoadingProgress('Loading statistics...');
        setLoadingProgressValue(80);
        const stats = await apiClient.getStats();
        console.log('Global stats loaded:', stats);
        setLoadingProgress('Finalizing...');
        setLoadingProgressValue(90);

        const highRisk =
          stats.likelihoodDistribution?.find((d: any) => d.level === 'HIGH')?.count || 0;
        const mediumRisk =
          stats.likelihoodDistribution?.find((d: any) => d.level === 'MEDIUM')?.count || 0;
        const lowRisk =
          stats.likelihoodDistribution?.find((d: any) => d.level === 'LOW')?.count || 0;

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
            sessionStorage.setItem('epstein_archive_stats_v13_14_1', JSON.stringify(newStats));
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

  // Handler for risk level click clicks
  const handleRiskLevelClick = useCallback((level: 'HIGH' | 'MEDIUM' | 'LOW') => {
    // Toggle: if clicking the same level, deselect it
    setSelectedRiskLevel((prev) => (prev === level ? null : level));
  }, []);

  // Handler to reset all filters
  const handleResetFilters = useCallback(() => {
    setSelectedRiskLevel(null);
    setEntityType('all');
    setSearchTerm('');
    setSortBy('red_flag');
    setSortOrder('desc');
  }, [setSelectedRiskLevel, setEntityType, setSearchTerm, setSortBy, setSortOrder]);

  useEffect(() => {
    // No-op
  }, []);

  useEffect(() => {
    let cancelled = false;
    const currentEntry = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
    const currentSrc = currentEntry?.src || '';
    const currentHash = (currentSrc.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null;
    if (!currentHash) return;

    const pollForNewBuild = async () => {
      try {
        const res = await fetch(`/?build_check=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const html = await res.text();
        const latestHash = (html.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null;
        if (!cancelled && latestHash && latestHash !== currentHash) {
          window.location.reload();
        }
      } catch {
        // Ignore transient network/cache probe failures
      }
    };

    pollForNewBuild();
    const interval = window.setInterval(pollForNewBuild, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      console.log('Fetching analytics data with filters:', filters);
      // Get statistics from apiClient with filters
      const stats = await apiClient.getStats(filters);
      console.log('Analytics stats:', stats);

      setAnalyticsData(stats);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [filters]);

  // Effect for fetching analytics data when tab changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    }
  }, [activeTab, fetchAnalyticsData]);

  // Effect to prefetch next page when current page loads
  // Prefetch effect removed

  const handlePersonClick = useCallback(
    (person: Person) => {
      console.log('Person clicked:', person.name);

      // Save current path before opening modal so we can restore it on close
      setPreviousPath(location.pathname + location.search);

      setSelectedPerson(person);

      // Update URL via router so UI/state stays synchronized
      if (person.id) {
        navigate(`/entity/${person.id}`);
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
    [location.pathname, location.search, navigate],
  );

  const navSegmentBaseClass = `flex h-full w-full min-w-0 items-center justify-center ${
    navLayoutMode === 'icons'
      ? 'gap-0 px-2'
      : navLayoutMode === 'compact'
        ? 'gap-1.5 px-2.5'
        : 'gap-1.5 px-3 lg:px-4'
  } rounded-none transition-all duration-200 whitespace-nowrap border-0 bg-transparent ${
    navLayoutMode === 'icons' ? 'max-w-11' : ''
  }`;
  const getNavSegmentClass = (isActive: boolean, activeClass: string, extraClass: string = '') =>
    `${navSegmentBaseClass} ${
      isActive
        ? `${activeClass} text-white`
        : 'text-slate-300 hover:text-white hover:bg-slate-800/55'
    } ${extraClass}`.trim();
  const navItemClass = 'flex-1 min-w-0 h-full';
  const navLabelClass = navLayoutMode === 'icons' ? 'hidden' : 'inline truncate';
  const navPillClass =
    navLayoutMode === 'normal'
      ? 'flex w-full h-11 items-stretch rounded-full border overflow-hidden divide-x divide-slate-700/80'
      : navLayoutMode === 'compact'
        ? 'flex w-full h-10 items-stretch rounded-full border overflow-hidden divide-x divide-slate-700/80'
        : 'flex w-full h-11 items-stretch rounded-full border overflow-hidden divide-x divide-slate-700/80';

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
    <ToastProvider>
      <UndoProvider>
        <InvestigationsProvider>
          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black relative overflow-x-hidden overflow-y-auto flex flex-col">
            <SEO {...seoConfig} />
            {shouldShowOnboarding && (
              <FirstRunOnboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />
            )}

            {/* Skip links for accessibility */}
            <div className="sr-only">
              <a className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-slate-900 focus:text-white z-50">
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
            <header className="app-header-glass transition-all duration-300">
              <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between py-2.5 min-h-[68px] gap-4">
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
                        className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
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
                        className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
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
                          className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
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
                        className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
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
                          className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
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
                    <div className="relative flex-1 md:flex-none max-w-md">
                      <div className="header-search-pill">
                        <div className="relative flex-1 min-w-0 pl-2">
                          <Icon
                            name="Search"
                            size="sm"
                            color="gray"
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                          />
                          <input
                            type="text"
                            placeholder="Search evidence..."
                            className="w-full h-11 pl-9 pr-9 bg-transparent text-white placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && searchTerm.trim()) {
                                navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                              }
                            }}
                          />
                          {searchTerm.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              aria-label="Clear search"
                              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/70"
                            >
                              <Icon name="X" size="xs" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (searchTerm.trim()) {
                              navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                            } else {
                              navigate('/search');
                            }
                          }}
                          aria-label="Run search"
                          className="header-search-button shrink-0"
                        >
                          <Icon name="Search" size="sm" />
                        </button>
                      </div>
                      {searchTerm.trim().length >= 2 && (
                        <div className="absolute top-full right-0 mt-2 w-full md:w-96 dropdown-surface z-50 max-h-96 overflow-y-auto">
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
                                onClick={() => handlePersonClick(p)}
                              >
                                <Icon name="User" size="sm" color="gray" />
                                <span className="truncate flex-1">
                                  {p.canonicalName || p.name}
                                  {p.matchedAlias && (
                                    <span className="ml-1 text-[11px] text-slate-400">
                                      ({p.matchedAlias})
                                    </span>
                                  )}
                                </span>
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

                    {/* Global Date Range Filter */}
                    <div ref={dateRangePickerRef} className="hidden md:flex items-center relative">
                      <button
                        onClick={() => setShowDateRangePicker((v) => !v)}
                        aria-expanded={showDateRangePicker}
                        aria-haspopup="dialog"
                        className={`group control flex items-center rounded-full h-11 px-3 gap-2 transition-all duration-300${filters.timeRange[0] || filters.timeRange[1] ? ' text-amber-300' : ''}`}
                        title="Global date range filter"
                      >
                        <Icon
                          name="Calendar"
                          size="sm"
                          color={filters.timeRange[0] || filters.timeRange[1] ? 'warning' : 'gray'}
                        />
                        {(filters.timeRange[0] || filters.timeRange[1]) && (
                          <span className="text-xs text-amber-300 whitespace-nowrap max-w-[120px] truncate">
                            {filters.timeRange[0] ?? '…'} – {filters.timeRange[1] ?? '…'}
                          </span>
                        )}
                      </button>
                      {showDateRangePicker && (
                        <div
                          className="absolute top-full right-0 mt-2 z-50 dropdown-surface p-4 w-72"
                          role="dialog"
                          aria-label="Global date range filter"
                        >
                          <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                            Global Date Filter
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label
                                htmlFor="global-date-from"
                                className="block text-xs text-slate-500 mb-1"
                              >
                                From
                              </label>
                              <input
                                id="global-date-from"
                                type="date"
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-600"
                                value={filters.timeRange[0] ?? ''}
                                onChange={(e) =>
                                  setFilters({
                                    timeRange: [e.target.value || null, filters.timeRange[1]],
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="global-date-to"
                                className="block text-xs text-slate-500 mb-1"
                              >
                                To
                              </label>
                              <input
                                id="global-date-to"
                                type="date"
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-600"
                                value={filters.timeRange[1] ?? ''}
                                onChange={(e) =>
                                  setFilters({
                                    timeRange: [filters.timeRange[0], e.target.value || null],
                                  })
                                }
                              />
                            </div>
                            {(filters.timeRange[0] || filters.timeRange[1]) && (
                              <button
                                onClick={() => {
                                  setFilters({ timeRange: [null, null] });
                                  setShowDateRangePicker(false);
                                }}
                                className="w-full text-xs text-slate-400 hover:text-white border border-slate-700 rounded-md py-2 transition-colors"
                              >
                                Clear date filter
                              </button>
                            )}
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

            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative z-10 flex-grow">
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
                isLoading={isInitializing || analyticsLoading}
                label={isInitializing ? loadingProgress : undefined}
              />
              {/* Navigation Tabs - segmented pill with responsive horizontal track */}
              <div id="navigation" className="hidden md:block mb-6 text-sm font-medium">
                <div className="relative">
                  <div ref={navTrackRef} className="main-nav-track">
                    <div className={`main-nav-pill ${navPillClass}`}>
                      <div className={`relative group ${navItemClass}`}>
                        <button
                          onClick={() => navigate('/people')}
                          className={getNavSegmentClass(
                            activeTab === 'people',
                            'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20',
                          )}
                        >
                          <Icon name="Users" size="sm" />
                          <span className={navLabelClass}>Subjects</span>
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
                                <strong className="text-cyan-400">Red Flag Index (RFI)</strong>:
                                Risk rating from 1-5 based on mention context
                              </li>
                              <li>
                                <strong className="text-cyan-400">Mentions</strong>: Number of
                                document references
                              </li>
                              <li>
                                <strong className="text-cyan-400">Evidence Types</strong>:
                                Categories of supporting documents
                              </li>
                            </ul>
                            <p className="text-slate-500 pt-1 border-t border-slate-700 mt-2">
                              Click any subject card to view their full profile and connected
                              evidence.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/documents')}
                          className={getNavSegmentClass(
                            activeTab === 'documents',
                            'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-sm shadow-red-500/20',
                          )}
                        >
                          <Icon name="FileText" size="sm" />
                          <span className={navLabelClass}>Docs</span>
                        </button>
                      </div>
                      <div className={`relative ${navItemClass}`}>
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
                          className={getNavSegmentClass(
                            activeTab === 'investigations',
                            'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-sm shadow-pink-500/20',
                            investigateAttract && activeTab !== 'investigations'
                              ? 'ring-2 ring-pink-500 shadow-lg shadow-pink-500/30 animate-pulse'
                              : '',
                          )}
                          aria-haspopup="dialog"
                          aria-expanded={investigatePopoverOpen}
                          ref={investigateBtnRef}
                          data-investigation-nav-top
                        >
                          <Icon name="Target" size="sm" />
                          <span className={navLabelClass}>Investigate</span>
                        </button>
                        {investigatePopoverOpen &&
                          activeTab !== 'investigations' &&
                          investigatePopoverPos.x !== 0 &&
                          createPortal(
                            <div
                              className="fixed w-[320px] bg-slate-900 border border-pink-500/40 rounded-xl shadow-xl p-4 pointer-events-auto"
                              style={{
                                left: investigatePopoverPos.x,
                                top: investigatePopoverPos.y,
                                zIndex: 50,
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
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/timeline')}
                          onMouseEnter={() => preloader.prefetchJson('/api/timeline')}
                          className={getNavSegmentClass(
                            activeTab === 'timeline',
                            'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-sm shadow-orange-500/20',
                          )}
                        >
                          <Icon name="Clock" size="sm" />
                          <span className={navLabelClass}>Timeline</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/flights')}
                          onMouseEnter={() => preloader.prefetchJson('/api/flights')}
                          className={getNavSegmentClass(
                            activeTab === 'flights',
                            'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20',
                          )}
                        >
                          <Icon name="Navigation" size="sm" />
                          <span className={navLabelClass}>Flights</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/properties')}
                          onMouseEnter={() => preloader.prefetchJson('/api/properties/stats')}
                          className={getNavSegmentClass(
                            activeTab === 'properties',
                            'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-500/20',
                          )}
                        >
                          <Icon name="Building" size="sm" />
                          <span className={navLabelClass}>Property</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/media')}
                          onMouseEnter={() => {
                            preloader.prefetchJson('/api/media/albums');
                            preloader.prefetchJson('/api/media/images?limit=24');
                          }}
                          className={getNavSegmentClass(
                            activeTab === 'media',
                            'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-500/20',
                          )}
                        >
                          <Icon name="Newspaper" size="sm" />
                          <span className={navLabelClass}>Media</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/emails')}
                          onMouseEnter={() => preloader.prefetchJson('/api/emails')}
                          className={getNavSegmentClass(
                            activeTab === 'emails',
                            'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm shadow-blue-500/20',
                          )}
                        >
                          <Icon name="Mail" size="sm" />
                          <span className={navLabelClass}>Emails</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/blackbook')}
                          onMouseEnter={() => preloader.prefetchJson('/api/media/albums')}
                          className={getNavSegmentClass(
                            activeTab === 'blackbook',
                            'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-sm shadow-amber-500/20',
                          )}
                        >
                          <Icon name="BookOpen" size="sm" />
                          <span className={navLabelClass}>Black Book</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/analytics')}
                          className={getNavSegmentClass(
                            activeTab === 'analytics',
                            'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/20',
                          )}
                        >
                          <Icon name="BarChart3" size="sm" />
                          <span className={navLabelClass}>Stats</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/about')}
                          className={getNavSegmentClass(
                            activeTab === 'about',
                            'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-sm shadow-cyan-500/20',
                          )}
                        >
                          <Icon name="Shield" size="sm" />
                          <span className={navLabelClass}>About</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {navEdgeFade.left && (
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-transparent" />
                  )}
                  {navEdgeFade.right && (
                    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-slate-900/95 via-slate-900/70 to-transparent" />
                  )}
                </div>
              </div>
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

              {/* Tab Content */}
              <div id="main-content" className="flex-grow">
                {/* Breadcrumb navigation */}
                <div className="mb-4 px-4 md:px-0">
                  <Breadcrumb
                    items={[
                      { label: 'Home', href: '/' },
                      {
                        label:
                          activeTab === 'landing'
                            ? 'The Epstein Files'
                            : activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
                      },
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
                      <PeoplePage
                        dataStats={dataStats}
                        selectedRiskLevel={selectedRiskLevel}
                        onRiskLevelClick={handleRiskLevelClick}
                        onResetFilters={handleResetFilters}
                        isAdmin={isAdmin}
                        onAddSubject={() => setShowCreateEntityModal(true)}
                        entityType={entityType}
                        onEntityTypeChange={setEntityType}
                        sortBy={sortBy}
                        onSortByChange={(val) => setSortBy(val as any)}
                        sortOrder={sortOrder}
                        onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        searchTerm={searchTerm}
                        onPersonClick={handlePersonClick}
                      />
                    )}

                    {activeTab === 'analytics' && (
                      <AnalyticsPage
                        analyticsData={analyticsData}
                        loading={analyticsLoading}
                        error={analyticsError}
                        onRetry={fetchAnalyticsData}
                        onPersonSelect={handlePersonClick}
                      />
                    )}

                    {activeTab === 'search' && <EvidenceSearch onPersonClick={handlePersonClick} />}

                    {activeTab === 'documents' && (
                      <DocumentsPage
                        searchTerm={selectedDocumentSearchTerm}
                        onSearchTermChange={setSelectedDocumentSearchTerm}
                        selectedDocumentId={selectedDocumentId || ''}
                        onDocumentClose={() => {
                          setSelectedDocumentId('');
                          setSelectedDocumentSearchTerm('');
                        }}
                      />
                    )}
                    {activeTab === 'timeline' && <TimelinePage />}
                    {activeTab === 'flights' && <FlightsPage />}

                    {activeTab === 'properties' && <PropertyPage />}

                    {activeTab === 'emails' && <EmailPage />}
                    {activeTab === 'media' && <MediaPage />}

                    {activeTab === 'about' && <AboutPage />}
                    {activeTab === 'faq' && <FAQPage />}
                    {activeTab === 'landing' && <TheEpsteinFilesPage variant={landingVariant} />}

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
                        // Extract investigation ID from URL path
                        // Supported:
                        // - /investigations/:id
                        // - /investigate/case/:id
                        // - /investigate/case/:id/evidence/:evidenceId
                        const pathParts = location.pathname.split('/');
                        let investigationIdFromUrl: string | undefined;
                        if (
                          pathParts.length > 2 &&
                          pathParts[1] === 'investigations' &&
                          pathParts[2]
                        ) {
                          investigationIdFromUrl = pathParts[2];
                        } else if (
                          pathParts.length > 3 &&
                          pathParts[1] === 'investigate' &&
                          pathParts[2] === 'case' &&
                          pathParts[3]
                        ) {
                          investigationIdFromUrl = pathParts[3];
                        }
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
                    entityId={selectedPerson.id.toString()}
                    isOpen={!!selectedPerson}
                    onClose={() => {
                      setSelectedPerson(null);
                      navigate(previousPath || '/people');
                    }}
                  />
                </ScopedErrorBoundary>
              )}
            </Suspense>
            {/* Inline Document Modal */}
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
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
              {/* ReleaseNotesPanel: intentionally no spinner — panel appears inline */}
              <ReleaseNotesPanel
                isOpen={showReleaseNotes}
                onClose={() => setShowReleaseNotes(false)}
                releaseNotes={parsedReleaseNotes}
              />
            </Suspense>

            <KeyboardShortcutsModal
              isOpen={showKeyboardShortcuts}
              onClose={() => setShowKeyboardShortcuts(false)}
            />

            {showCreateEntityModal && (
              <CreateEntityModal
                onClose={() => setShowCreateEntityModal(false)}
                onSuccess={() => {
                  window.location.reload();
                }}
              />
            )}

            <Footer onVersionClick={() => setShowReleaseNotes(true)} />
          </div>
        </InvestigationsProvider>
      </UndoProvider>
    </ToastProvider>
  );
}

export default App;
