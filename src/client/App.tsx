import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { preloader } from './utils/ResourcePreloader';
import { runDevAffordanceAudit } from './utils/devAffordanceAudit';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, Link, Routes, Route, useMatch } from 'react-router-dom';
// Icons imported as needed via Icon component
import { Person } from './types';
import type {
  SeoConfig,
  GlobalStatsPayload,
  SearchResponsePayload,
  EntityByIdResponse,
} from './types/api';

import { useNavigation } from './services/NavigationContext';
import { apiClient } from './services/apiClient';
// SECURITY: Removed non-authoritative document import paths
import { useCountUp } from './hooks/useCountUp';
import MobileMenu from './components/layout/MobileMenu';
import UndoProvider from './components/UndoManager';
import ToastProvider from './components/common/ToastProvider';
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
const LegalPage = lazy(() =>
  import('./components/pages/LegalPage').then((module) => ({ default: module.LegalPage })),
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

interface ParsedReleaseNote {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

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
      .map((section): ParsedReleaseNote | null => {
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
      .filter((record): record is ParsedReleaseNote => record !== null)
      .filter((record) => record.notes.length > 0 || record.title !== 'Maintenance Update')
      .sort((a, b) => {
        // Sort by version (descending)
        const vA = a.version.replace('v', '').split('.').map(Number);
        const vB = b.version.replace('v', '').split('.').map(Number);
        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
          const numA = vA[i] || 0;
          const numB = vB[i] || 0;
          if (numA !== numB) return numB - numA;
        }
        return 0;
      });
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

  // Determine active tab from URL using React Router's useMatch hooks.
  // This replaces the brittle manual string-matching getTabFromPath function.
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
  const matchPeople = useMatch({ path: '/people', end: false });
  const matchEntity = useMatch({ path: '/entity/:id', end: false });
  const matchSearch = useMatch({ path: '/search', end: false });
  const matchDocuments = useMatch({ path: '/documents', end: false });
  const matchMedia = useMatch({ path: '/media', end: false });
  const matchTimeline = useMatch({ path: '/timeline', end: false });
  const matchFlights = useMatch({ path: '/flights', end: false });
  const matchProperties = useMatch({ path: '/properties', end: false });
  const matchInvestigations1 = useMatch({ path: '/investigations', end: false });
  const matchInvestigations2 = useMatch({ path: '/investigate', end: false });
  const matchInvestigations = matchInvestigations1 || matchInvestigations2;
  const matchAnalytics = useMatch({ path: '/analytics', end: false });
  const matchBlackbook = useMatch({ path: '/blackbook', end: false });
  const matchAbout1 = useMatch({ path: '/about', end: false });
  const matchAbout2 = useMatch({ path: '/privacy', end: false });
  const matchAbout3 = useMatch({ path: '/terms', end: false });
  const matchAbout = matchAbout1 || matchAbout2 || matchAbout3;
  const matchEmails = useMatch({ path: '/emails', end: false });
  const matchLogin = useMatch({ path: '/login', end: false });
  const matchAdmin = useMatch({ path: '/admin', end: false });
  const matchReview = useMatch({ path: '/review', end: false });
  const matchEvidence = useMatch({ path: '/evidence/:id', end: false });
  const matchFaq = useMatch({ path: '/faq', end: false });
  const matchLanding1 = useMatch({ path: '/the-epstein-files', end: false });
  const matchLanding2 = useMatch({ path: '/epstein-documents', end: false });
  const matchLanding3 = useMatch({ path: '/epstein-people', end: false });
  const matchLanding4 = useMatch({ path: '/epstein-media', end: false });
  const matchLanding5 = useMatch({ path: '/epstein-timeline', end: false });
  const matchLanding6 = useMatch({ path: '/epstein-flights', end: false });
  const matchLanding =
    matchLanding1 ||
    matchLanding2 ||
    matchLanding3 ||
    matchLanding4 ||
    matchLanding5 ||
    matchLanding6;

  const activeTab: Tab = (() => {
    if (matchSearch) return 'search';
    if (matchDocuments) return 'documents';
    if (matchMedia) return 'media';
    if (matchTimeline) return 'timeline';
    if (matchFlights) return 'flights';
    if (matchProperties) return 'properties';
    if (matchInvestigations) return 'investigations';
    if (matchAnalytics) return 'analytics';
    if (matchBlackbook) return 'blackbook';
    if (matchAbout) return 'about';
    if (matchEmails) return 'emails';
    if (matchLogin) return 'login';
    if (matchAdmin) return 'admin';
    if (matchReview) return 'review';
    if (matchEvidence) return 'evidence';
    if (matchFaq) return 'faq';
    if (matchLanding) return 'landing';
    if (matchEntity || matchPeople || location.pathname === '/') return 'people';
    return 'people';
  })();
  const tabLabels: Record<Tab, string> = {
    people: 'People',
    search: 'Search',
    documents: 'Documents',
    media: 'Media',
    timeline: 'Timeline',
    flights: 'Flights',
    properties: 'Properties',
    investigations: 'Investigations',
    analytics: 'Analytics',
    blackbook: 'Black Book',
    about: 'About',
    emails: 'Emails',
    login: 'Login',
    evidence: 'Evidence',
    faq: 'FAQ',
    review: 'Review',
    admin: 'Admin',
    landing: 'The Epstein Files',
  };
  const seoConfig = useMemo<SeoConfig>(() => {
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

    if (location.pathname.startsWith('/emails')) {
      return {
        title: 'Epstein Email Archive',
        description:
          'Search and analyze mailbox threads, participants, and linked evidence across the Epstein files email archive.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein emails', 'email threads', 'mailbox archive'],
      };
    }

    if (location.pathname.startsWith('/analytics')) {
      return {
        title: 'Epstein Analytics',
        description:
          'Explore risk distributions, entity signals, and investigative trends across the Epstein files dataset.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein analytics', 'risk analysis', 'entity insights'],
      };
    }

    if (location.pathname.startsWith('/blackbook')) {
      return {
        title: 'Epstein Black Book',
        description:
          'Browse contact entries, phone numbers, and linked entities from Epstein black book records.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'black book', 'contact records', 'address book'],
      };
    }

    if (location.pathname.startsWith('/properties')) {
      return {
        title: 'Epstein Property Records',
        description:
          'Review properties, ownership relationships, and location-linked evidence in the archive.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'properties', 'ownership', 'locations'],
      };
    }

    if (
      location.pathname.startsWith('/investigations') ||
      location.pathname.startsWith('/investigate')
    ) {
      return {
        title: 'Epstein Investigations Workspace',
        description:
          'Create investigations, chain evidence, test hypotheses, and track investigative findings.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'investigations', 'evidence chaining', 'case workspace'],
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
  const [documentModalInitial, setDocumentModalInitial] = useState<Record<string, unknown> | null>(
    null,
  );

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

  // Debounced search term for suggestions query key
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: searchSuggestions = [], isFetching: searchSuggestionsLoading } = useQuery<
    SearchSuggestion[]
  >({
    queryKey: ['searchSuggestions', debouncedSearchTerm],
    queryFn: async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedSearchTerm)}&limit=10`,
      );
      const data = (await response.json()) as SearchResponsePayload;
      const entities = Array.isArray(data.entities) ? data.entities : [];
      return entities.map((entity) => ({
        id: entity.id,
        name: entity.fullName || entity.name || 'Unknown',
        fullName: entity.fullName || entity.name || 'Unknown',
        canonicalName: entity.canonicalName || entity.fullName || entity.name || 'Unknown',
        matchedAlias: entity.matchedAlias || null,
        role: entity.primaryRole || entity.role || 'Unknown',
        mentions: entity.mention_count || entity.mentions || 0,
        redFlagRating: entity.redFlagRating ?? 0,
        files: entity.document_count || entity.files || 0,
        contexts: [],
        evidenceTypes: [],
        significantPassages: [],
        fileReferences: [],
      }));
    },
    enabled: debouncedSearchTerm.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  // First  // Onboarding
  const { shouldShowOnboarding, completeOnboarding, skipOnboarding } = useFirstRunOnboarding();

  // Clear selected document when switching tabs
  useEffect(() => {
    if (activeTab !== 'documents') {
      setSelectedDocumentId('');
    }
  }, [activeTab]);

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
    enabled: needsEntityFetch,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!urlEntityData || !urlEntityData.id) return;
    setDocumentModalId('');
    setDocumentModalInitial(null);
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
      photos: urlEntityData.photos,
      blackBookEntries: urlEntityData.blackBookEntry,
      entityType: urlEntityData.entityType || urlEntityData.type,
      redFlagDescription: urlEntityData.redFlagDescription,
    };
    setSelectedPerson(person);
  }, [urlEntityData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!urlEntityId && selectedPerson && !location.pathname.startsWith('/blackbook')) {
      // Clear selected person if we are not on an entity route anymore
      setSelectedPerson(null);
    }
  }, [location.pathname, selectedPerson, urlEntityId]);

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
    enabled: !!legacyFileSuffix,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!legacyFilePayload) return;
    if (legacyFilePayload.redirectTo) {
      navigate(legacyFilePayload.redirectTo, { replace: true });
    } else if (legacyFilePayload.documentId) {
      navigate(`/documents/${legacyFilePayload.documentId}`, { replace: true });
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize optimized data service (caches first page to sessionStorage)
  const { isLoading: isInitializing } = useQuery<void>({
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
      } catch (e) {
        console.error('Error caching people data:', e);
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  // Fetch global stats for header counters
  const { data: globalStatsData } = useQuery<GlobalStatsPayload>({
    queryKey: ['globalStats'],
    queryFn: async () => (await apiClient.getStats()) as GlobalStatsPayload,
    staleTime: 5 * 60_000,
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
    const highRisk = likelihoodDistribution.find((bucket) => bucket.level === 'HIGH')?.count || 0;
    const mediumRisk =
      likelihoodDistribution.find((bucket) => bucket.level === 'MEDIUM')?.count || 0;
    const lowRisk = likelihoodDistribution.find((bucket) => bucket.level === 'LOW')?.count || 0;
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

  // Animate header stats
  const headerTotalPeople = useCountUp(dataStats.totalPeople, 1000);
  const headerTotalMentions = useCountUp(dataStats.totalMentions, 1200);
  const headerTotalFiles = useCountUp(dataStats.totalFiles, 1100);

  const loadingProgress = isInitializing ? 'Loading subjects...' : 'Ready';

  useEffect(() => {
    try {
      const shown = localStorage.getItem('investigate_attract_shown') === 'true';
      const hasSeenInvestigationOnboarding =
        localStorage.getItem('hasSeenInvestigationOnboarding') === 'true';
      const hasSeenBoardOnboarding = localStorage.getItem('board_onboarding_seen') === 'true';
      const canShowAttract =
        !shown && !shouldShowOnboarding && hasSeenInvestigationOnboarding && hasSeenBoardOnboarding;
      setInvestigateAttract(canShowAttract);
      const t = setTimeout(() => setInvestigateAttract(false), 8000);
      return () => clearTimeout(t);
    } catch (e) {
      void e;
    }
  }, [shouldShowOnboarding]);

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
    enabled: activeTab === 'analytics',
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

  const navSegmentBaseClass = `main-nav-segment flex h-full w-full min-w-0 items-center justify-center ${
    navLayoutMode === 'icons'
      ? 'gap-0 px-2'
      : navLayoutMode === 'compact'
        ? 'gap-1.5 px-2.5'
        : 'gap-1.5 px-3 lg:px-4'
  } rounded-none whitespace-nowrap border-0 bg-transparent`;
  const navThemeClassByTab: Record<string, string> = {
    people: 'main-nav-segment-people',
    documents: 'main-nav-segment-documents',
    investigations: 'main-nav-segment-investigations',
    timeline: 'main-nav-segment-timeline',
    flights: 'main-nav-segment-flights',
    properties: 'main-nav-segment-properties',
    media: 'main-nav-segment-media',
    emails: 'main-nav-segment-emails',
    blackbook: 'main-nav-segment-blackbook',
    analytics: 'main-nav-segment-analytics',
    about: 'main-nav-segment-about',
  };
  const getNavSegmentClass = (
    tab: keyof typeof navThemeClassByTab,
    isActive: boolean,
    extraClass: string = '',
  ) =>
    `${navSegmentBaseClass} ${navThemeClassByTab[tab]} ${isActive ? 'main-nav-segment-active' : ''} ${extraClass}`.trim();
  const navItemClass = 'flex h-full min-w-0 flex-1';
  const navLabelClass = navLayoutMode === 'icons' ? 'hidden' : 'inline';
  const navPillClass =
    navLayoutMode === 'normal'
      ? 'flex h-11 w-full items-stretch rounded-full overflow-hidden transition-colors'
      : navLayoutMode === 'compact'
        ? 'flex h-10 w-full items-stretch rounded-full overflow-hidden transition-colors'
        : 'flex h-11 w-full items-stretch rounded-full overflow-hidden transition-colors';

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
          <div className="min-h-screen app-backdrop relative overflow-x-hidden overflow-y-auto flex flex-col">
            <SEO {...seoConfig} />
            {shouldShowOnboarding && (
              <FirstRunOnboarding onComplete={completeOnboarding} onSkip={skipOnboarding} />
            )}

            {/* Skip links for accessibility */}
            <div className="sr-only">
              <a className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-[var(--glass-bg-strong)] focus:text-[var(--text-primary)] z-50">
                Skip to main content
              </a>
              <a
                href="#navigation"
                className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-[var(--glass-bg-strong)] focus:text-[var(--text-primary)] z-50 mt-10"
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
              <div className="content-shell">
                <div className="flex flex-col md:flex-row items-center justify-between py-1.5 min-h-[52px] gap-3">
                  {/* LEFT: Logo and Stats */}
                  <div className="flex items-center gap-6">
                    {/* Logo */}
                    <Link
                      to="/"
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <RedactedLogo text="THE EPSTEIN FILES" />
                    </Link>

                    {/* Stats - Desktop only, single-line */}
                    <div className="hidden lg:flex items-center gap-5 ml-6 pl-6 border-l border-[var(--glass-border)]">
                      <span
                        className="text-sm font-mono font-light tracking-tight text-[var(--accent)]"
                        title="Subjects"
                      >
                        {headerTotalPeople.toLocaleString()}
                      </span>
                      <span
                        className="text-sm font-mono font-light tracking-tight text-[var(--accent-info)]"
                        title="Mentions"
                      >
                        {headerTotalMentions.toLocaleString()}
                      </span>
                      <span
                        className="text-sm font-mono font-light tracking-tight text-[var(--accent-docs)]"
                        title="Files"
                      >
                        {headerTotalFiles.toLocaleString()}
                      </span>
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
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-[var(--text-primary)] ml-0 group-hover:ml-2">
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
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-[var(--text-primary)] ml-0 group-hover:ml-2">
                          Shortcuts
                        </span>
                      </button>

                      {/* Sources */}
                      <button
                        onClick={() => navigate('/about')}
                        className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                        title="Verified Sources"
                      >
                        <Icon name="Shield" size="sm" color="success" />
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-[var(--text-primary)] ml-0 group-hover:ml-2">
                          Sources
                        </span>
                      </button>

                      {/* What's New */}
                      <button
                        onClick={() => setShowReleaseNotes(true)}
                        className="group control flex items-center rounded-full h-11 pl-2.5 pr-2.5 hover:pr-4 transition-all duration-300"
                        title="What's New"
                      >
                        <Icon name="Book" size="sm" color="info" />
                        <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-[var(--text-primary)] ml-0 group-hover:ml-2">
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
                          <Icon name="Shield" size="sm" className="text-[var(--accent-info)]" />
                          <span className="max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-300 opacity-0 group-hover:opacity-100 whitespace-nowrap text-sm text-[var(--text-default)] ml-0 group-hover:ml-2">
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
                            className="w-full h-11 pl-9 pr-9 bg-transparent text-[var(--text-strong)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-0 focus:border-none text-sm"
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
                              className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-7 w-7 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-strong)] hover:bg-[var(--glass-bg-strong)]"
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
                        <div className="absolute top-full right-0 mt-2 w-full md:w-96 glass-panel z-50 max-h-96 overflow-y-auto">
                          <div className="p-2 text-xs text-[var(--text-secondary)] border-b border-[var(--glass-border)]">
                            Search results for "{searchTerm}"
                          </div>
                          {searchSuggestionsLoading ? (
                            <div className="px-3 py-4 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)]"></div>
                              Searching...
                            </div>
                          ) : searchSuggestions.length > 0 ? (
                            searchSuggestions.slice(0, 8).map((p, i) => (
                              <button
                                key={`sugg-${p.id}-${i}`}
                                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] flex items-center gap-2"
                                onClick={() => handlePersonClick(p)}
                              >
                                <Icon name="User" size="sm" color="gray" />
                                <span className="truncate flex-1">
                                  {p.canonicalName || p.name}
                                  {p.matchedAlias && (
                                    <span className="ml-1 text-[11px] text-[var(--text-muted)]">
                                      ({p.matchedAlias})
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {p.role !== 'Unknown' ? p.role : 'Subject'}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              No subjects found
                            </div>
                          )}
                          <div className="border-t border-[var(--glass-border)] mt-1 pt-1">
                            <button
                              className="w-full text-left px-3 py-2 text-sm text-[var(--accent)] hover:bg-[var(--glass-bg-strong)] flex items-center gap-2"
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
                        className={`group control flex items-center rounded-full h-11 px-3 gap-2 transition-all duration-300${filters.timeRange[0] || filters.timeRange[1] ? ' text-[var(--accent-warning)]' : ''}`}
                        title="Global date range filter"
                      >
                        <Icon
                          name="Calendar"
                          size="sm"
                          color={filters.timeRange[0] || filters.timeRange[1] ? 'warning' : 'gray'}
                        />
                        {(filters.timeRange[0] || filters.timeRange[1]) && (
                          <span className="text-xs text-[var(--accent-warning)] whitespace-nowrap max-w-[120px] truncate">
                            {filters.timeRange[0] ?? '…'} – {filters.timeRange[1] ?? '…'}
                          </span>
                        )}
                      </button>
                      {showDateRangePicker && (
                        <div
                          className="absolute top-full right-0 mt-2 z-50 glass-panel p-4 w-72"
                          role="dialog"
                          aria-label="Global date range filter"
                        >
                          <div className="text-xs font-semibold text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
                            Global Date Filter
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label
                                htmlFor="global-date-from"
                                className="block text-xs text-[var(--text-muted)] mb-1"
                              >
                                From
                              </label>
                              <input
                                id="global-date-from"
                                type="date"
                                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                                className="block text-xs text-[var(--text-muted)] mb-1"
                              >
                                To
                              </label>
                              <input
                                id="global-date-to"
                                type="date"
                                className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                                className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] rounded-md py-2 transition-colors"
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
                      className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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

            <div className="content-shell flex-grow">
              {/* Mobile Stats Row */}
              <div className="md:hidden grid grid-cols-3 gap-2 mb-6 text-center">
                <button
                  onClick={() => navigate('/search')}
                  className="surface-glass-card rounded-lg p-2 hover:bg-[var(--glass-bg-strong)] transition-colors cursor-pointer"
                >
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    People
                  </div>
                  <div className="text-lg font-bold text-[var(--accent)]">
                    {headerTotalPeople.toLocaleString()}
                  </div>
                </button>
                <button
                  onClick={() => navigate('/search')}
                  className="surface-glass-card rounded-lg p-2 hover:bg-[var(--glass-bg-strong)] transition-colors cursor-pointer"
                >
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    Mentions
                  </div>
                  <div className="text-lg font-bold text-[var(--accent-info)]">
                    {headerTotalMentions.toLocaleString()}
                  </div>
                </button>
                <button
                  onClick={() => navigate('/documents')}
                  className="surface-glass-card rounded-lg p-2 hover:bg-[var(--glass-bg-strong)] transition-colors cursor-pointer"
                >
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    Files
                  </div>
                  <div className="text-lg font-bold text-[var(--accent-docs)]">
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
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/people')}
                          className={getNavSegmentClass('people', activeTab === 'people')}
                        >
                          <Icon name="Users" size="sm" />
                          <span className={navLabelClass}>People</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/documents')}
                          className={getNavSegmentClass('documents', activeTab === 'documents')}
                        >
                          <Icon name="FileText" size="sm" />
                          <span className={navLabelClass}>Documents</span>
                        </button>
                      </div>
                      <div className={`relative ${navItemClass}`}>
                        <button
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
                          className={getNavSegmentClass(
                            'investigations',
                            activeTab === 'investigations',
                            investigateAttract && activeTab !== 'investigations'
                              ? 'ring-2 ring-[var(--accent-danger)] shadow-lg shadow-[var(--accent-danger)]/30 animate-pulse'
                              : '',
                          )}
                          aria-haspopup="dialog"
                          aria-expanded={investigatePopoverOpen}
                          ref={investigateBtnRef}
                          data-investigation-nav-top
                        >
                          <Icon name="Target" size="sm" />
                          <span className={navLabelClass}>Investigations</span>
                        </button>
                        {investigatePopoverOpen &&
                          activeTab !== 'investigations' &&
                          investigatePopoverPos.x !== 0 &&
                          createPortal(
                            <div
                              className="fixed w-[320px] bg-[var(--glass-bg-strong)] border border-[var(--glass-border-highlight)] rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] backdrop-blur-md p-4 pointer-events-auto"
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
                                <div className="w-4 h-4 bg-[var(--bg-dark)] border border-[var(--glass-border-highlight)] rotate-45"></div>
                              </div>
                              <div className="text-[var(--text-primary)] font-semibold mb-1">
                                Investigations
                              </div>
                              <div className="text-[var(--text-secondary)] text-sm mb-3">
                                Create and manage deep-dive investigations, link evidence, and track
                                findings.
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
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
                                </button>
                                <button
                                  className="px-3 py-2 bg-[var(--accent)] hover:brightness-110 text-[var(--text-strong)] rounded-[var(--radius-md)] transition-all"
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
                          className={getNavSegmentClass('timeline', activeTab === 'timeline')}
                        >
                          <Icon name="Clock" size="sm" />
                          <span className={navLabelClass}>Timeline</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/flights')}
                          onMouseEnter={() => preloader.prefetchJson('/api/flights')}
                          className={getNavSegmentClass('flights', activeTab === 'flights')}
                        >
                          <Icon name="Navigation" size="sm" />
                          <span className={navLabelClass}>Flights</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/properties')}
                          onMouseEnter={() => preloader.prefetchJson('/api/properties/stats')}
                          className={getNavSegmentClass('properties', activeTab === 'properties')}
                        >
                          <Icon name="Building" size="sm" />
                          <span className={navLabelClass}>Properties</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/media')}
                          onMouseEnter={() => {
                            preloader.prefetchJson('/api/media/albums');
                            preloader.prefetchJson('/api/media/images?limit=24');
                          }}
                          className={getNavSegmentClass('media', activeTab === 'media')}
                        >
                          <Icon name="Newspaper" size="sm" />
                          <span className={navLabelClass}>Media</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/emails')}
                          onMouseEnter={() => preloader.prefetchJson('/api/emails')}
                          className={getNavSegmentClass('emails', activeTab === 'emails')}
                        >
                          <Icon name="Mail" size="sm" />
                          <span className={navLabelClass}>Emails</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/blackbook')}
                          onMouseEnter={() => preloader.prefetchJson('/api/media/albums')}
                          className={getNavSegmentClass('blackbook', activeTab === 'blackbook')}
                        >
                          <Icon name="BookOpen" size="sm" />
                          <span className={navLabelClass}>Black Book</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/analytics')}
                          className={getNavSegmentClass('analytics', activeTab === 'analytics')}
                        >
                          <Icon name="BarChart3" size="sm" />
                          <span className={navLabelClass}>Analytics</span>
                        </button>
                      </div>
                      <div className={navItemClass}>
                        <button
                          onClick={() => navigate('/about')}
                          className={getNavSegmentClass('about', activeTab === 'about')}
                        >
                          <Icon name="Shield" size="sm" />
                          <span className={navLabelClass}>About</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {navEdgeFade.left && (
                    <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[var(--bg-dark)] via-[var(--bg-dark)]/70 to-transparent" />
                  )}
                  {navEdgeFade.right && (
                    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--bg-dark)] via-[var(--bg-dark)]/70 to-transparent" />
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
                        label: tabLabels[activeTab],
                      },
                    ]}
                  />
                </div>
                <div className="view-transition-enter view-transition-enter-active">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
                      </div>
                    }
                  >
                    <Routes>
                      <Route
                        path="/"
                        element={
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
                            onSortOrderToggle={() =>
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }
                            searchTerm={searchTerm}
                            onPersonClick={handlePersonClick}
                          />
                        }
                      />
                      <Route
                        path="/people"
                        element={
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
                            onSortOrderToggle={() =>
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }
                            searchTerm={searchTerm}
                            onPersonClick={handlePersonClick}
                          />
                        }
                      />
                      {/* Entity deep-link — modal is handled separately; render people tab underneath */}
                      <Route
                        path="/entity/:id"
                        element={
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
                            onSortOrderToggle={() =>
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }
                            searchTerm={searchTerm}
                            onPersonClick={handlePersonClick}
                          />
                        }
                      />
                      <Route
                        path="/analytics"
                        element={
                          <AnalyticsPage
                            analyticsData={analyticsData ?? undefined}
                            loading={analyticsLoading}
                            error={analyticsError}
                            onRetry={refetchAnalytics}
                            onPersonSelect={handlePersonClick}
                          />
                        }
                      />
                      <Route
                        path="/search"
                        element={<EvidenceSearch onPersonClick={handlePersonClick} />}
                      />
                      <Route
                        path="/documents/*"
                        element={
                          <DocumentsPage
                            searchTerm={selectedDocumentSearchTerm}
                            onSearchTermChange={setSelectedDocumentSearchTerm}
                            selectedDocumentId={selectedDocumentId || ''}
                            onDocumentClose={() => {
                              setSelectedDocumentId('');
                              setSelectedDocumentSearchTerm('');
                            }}
                          />
                        }
                      />
                      <Route path="/timeline/*" element={<TimelinePage />} />
                      <Route path="/flights/*" element={<FlightsPage />} />
                      <Route path="/properties/*" element={<PropertyPage />} />
                      <Route path="/emails/*" element={<EmailPage />} />
                      <Route path="/media/*" element={<MediaPage />} />
                      <Route path="/about/*" element={<AboutPage />} />
                      <Route path="/privacy" element={<LegalPage mode="privacy" />} />
                      <Route path="/terms" element={<LegalPage mode="terms" />} />
                      <Route path="/faq" element={<FAQPage />} />
                      <Route
                        path="/the-epstein-files"
                        element={<TheEpsteinFilesPage variant="overview" />}
                      />
                      <Route
                        path="/epstein-documents"
                        element={<TheEpsteinFilesPage variant="documents" />}
                      />
                      <Route
                        path="/epstein-people"
                        element={<TheEpsteinFilesPage variant="people" />}
                      />
                      <Route
                        path="/epstein-media"
                        element={<TheEpsteinFilesPage variant="media" />}
                      />
                      <Route
                        path="/epstein-timeline"
                        element={<TheEpsteinFilesPage variant="timeline" />}
                      />
                      <Route
                        path="/epstein-flights"
                        element={<TheEpsteinFilesPage variant="flights" />}
                      />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/admin/*" element={<AdminDashboard />} />
                      <Route path="/evidence/:id" element={<EvidenceDetail />} />
                      <Route
                        path="/review/*"
                        element={
                          <Suspense
                            fallback={
                              <LoadingIndicator
                                isLoading={true}
                                label="Loading Review Dashboard..."
                              />
                            }
                          >
                            <ReviewDashboard />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/investigations/*"
                        element={
                          <InvestigationWorkspace
                            investigationId={(() => {
                              const parts = location.pathname.split('/');
                              return parts[1] === 'investigations' && parts[2]
                                ? parts[2]
                                : undefined;
                            })()}
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
                        }
                      />
                      <Route
                        path="/investigate/case/:id/*"
                        element={
                          <InvestigationWorkspace
                            investigationId={location.pathname.split('/')[3]}
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
                        }
                      />
                      <Route
                        path="/blackbook/*"
                        element={
                          <div className="mt-6">
                            <Suspense
                              fallback={
                                <div className="flex items-center justify-center h-64">
                                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
                                </div>
                              }
                            >
                              <BlackBookViewer />
                            </Suspense>
                          </div>
                        }
                      />
                      {/* Fallback — default to people */}
                      <Route
                        path="*"
                        element={
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
                            onSortOrderToggle={() =>
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }
                            searchTerm={searchTerm}
                            onPersonClick={handlePersonClick}
                          />
                        }
                      />
                    </Routes>
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Evidence Modal */}
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-[var(--glass-bg-strong)] backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
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
                <div className="fixed inset-0 bg-[var(--glass-bg-strong)] flex items-center justify-center z-50">
                  <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              {documentModalId && (
                <DocumentModal
                  id={documentModalId}
                  searchTerm={selectedDocumentSearchTerm}
                  initialDoc={
                    (documentModalInitial as unknown as { [key: string]: unknown } | undefined) ??
                    undefined
                  }
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
