import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Document, BrowseFilters, DocumentCollection } from '../../types/documents';
import { DocumentProcessor } from '../../services/documentProcessor';
import {
  Search,
  Filter,
  FileText,
  Flag,
  Folder,
  Image as ImageIcon,
  Landmark,
  Mail,
  Scale,
  ScrollText,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  X,
  HelpCircle,
  LayoutGrid,
  List as ListIcon,
  GalleryVertical,
} from 'lucide-react';
import { useNavigation } from '../../services/NavigationContext';
import { apiClient } from '../../services/apiClient';
import DocumentSkeleton from './DocumentSkeleton';
// TODO: Apply OCR prettification - see UNUSED_VARIABLES_RECOMMENDATIONS.md
// import { prettifyOCRText } from '../../utils/prettifyOCR';
import { DocumentModal } from './DocumentModal';
import { useHighlightNavigation } from '../../hooks/useHighlightNavigation';
import { HighlightNavigationControls } from './HighlightNavigationControls';
import { DocumentCard } from './DocumentCard';
import { getSafePreviewText, getSourceLabel, formatDate } from '../../utils/documentUtils';
import { useFilters } from '../../contexts/useFilters';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';
import { FixedSizeList } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

// Helper to highlight search terms
// centralizing tranches

const mapApiDocumentToDocument = (doc: any): Document => ({
  id: String(doc.id?.toString() || doc.fileName || ''),
  title: doc.title || doc.fileName,
  filename: doc.fileName,
  fileType: doc.fileType || 'unknown',
  fileSize: doc.fileSize || 0,
  dateCreated: doc.dateCreated,
  dateModified: doc.dateModified,
  content: doc.content || doc.previewText || doc.preview_text || doc.contentPreview || '',
  previewText: doc.previewText || doc.preview_text || '',
  previewKind: doc.previewKind || doc.preview_kind || 'fallback',
  keyEntities: Array.isArray(doc.keyEntities)
    ? doc.keyEntities
    : Array.isArray(doc.key_entities)
      ? doc.key_entities
      : [],
  entitiesCount: Number(doc.entitiesCount || doc.entities_count || 0),
  sourceType: doc.sourceType || doc.source_type || '',
  whyFlagged: doc.whyFlagged || doc.why_flagged || '',
  metadata: {
    source: doc.sourceCollection || doc.sourceType || 'Epstein Files',
    confidentiality: 'Public',
    categories: [],
    ...doc.metadata,
    emailHeaders: doc.metadata?.emailHeaders,
  },
  entities: Array.isArray(doc.entities) ? doc.entities : [],
  passages: Array.isArray(doc.passages) ? doc.passages : [],
  redFlagScore: doc.redFlagRating || 0,
  redFlagRating: doc.redFlagRating || 1,
  redFlagPeppers: '',
  redFlagDescription: `Red Flag Index ${doc.redFlagRating || 1}`,
  evidenceType: doc.evidenceType || doc.evidence_type || 'document',
  parentId: doc.parentId || doc.parent_id || doc.original_file_id,
  startOffset: Number(doc.startOffset || doc.start_offset || 0),
  endOffset: Number(doc.endOffset || doc.end_offset || 0),
  childDocuments: Array.isArray(doc.childDocuments) ? doc.childDocuments : [],
  threadId: doc.threadId || doc.thread_id,
  threadPosition: doc.threadPosition || doc.thread_position,
});

const HoverPreview = ({ doc, rect }: { doc: Document; rect: DOMRect }) => {
  const displayTitle = doc.title || doc.filename || 'Untitled document';
  const previewText = getSafePreviewText(doc);

  // Calculate position
  const x = rect.right + 20 + 420 > window.innerWidth ? rect.left - 420 - 20 : rect.right + 20;
  // Center vertically relative to the card if possible
  const y = Math.max(20, Math.min(window.innerHeight - 500, rect.top + rect.height / 2 - 200));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: x < rect.left ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: x < rect.left ? 10 : -10 }}
      style={{ left: x, top: y }}
      className="hover-preview-overlay"
    >
      <div className="preview-glow" />
      <div className="preview-content">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/80">
            Document Preview
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-3 leading-tight">{displayTitle}</h3>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="semantic-chip border-slate-700 bg-slate-800/50 text-slate-300">
            {doc.evidenceType || doc.fileType}
          </span>
          <span className="semantic-chip border-slate-700 bg-slate-800/50 text-slate-300">
            {formatDate(doc.dateCreated)}
          </span>
          <span className="semantic-chip border-slate-700 bg-slate-800/50 text-slate-300">
            {getSourceLabel(doc)}
          </span>
        </div>

        <div className="preview-ocr-snippet">{previewText}</div>

        {doc.keyEntities && doc.keyEntities.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] font-bold uppercase text-slate-500 mb-2 tracking-widest">
              Key Detected Entities
            </div>
            <div className="flex flex-wrap gap-2">
              {doc.keyEntities.slice(0, 8).map((entity, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[11px] text-cyan-300"
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface DocumentBrowserProps {
  processor: DocumentProcessor;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  selectedDocumentId?: string;
  onDocumentClose?: () => void;
}

export const DocumentBrowser: React.FC<DocumentBrowserProps> = ({
  processor: _processor,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  selectedDocumentId,
  onDocumentClose,
}) => {
  // Consume global date range from FilterContext
  const { filters: globalFilters } = useFilters();

  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm: contextSearchTerm, setSearchTerm: setContextSearchTerm } = navigation;

  // Initialize search from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam && searchParam !== contextSearchTerm) {
      if (onSearchTermChange) {
        onSearchTermChange(searchParam);
      } else {
        setContextSearchTerm(searchParam);
      }
    }
  }, [contextSearchTerm, onSearchTermChange, setContextSearchTerm]);

  // Use either external searchTerm or context searchTerm
  const effectiveSearchTerm =
    externalSearchTerm !== undefined ? externalSearchTerm : contextSearchTerm;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'red_flag' | 'fileType' | 'size'>(
    'red_flag',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // TODO: Implement document collections - see UNUSED_VARIABLES_RECOMMENDATIONS.md
  const [collection, _setCollection] = useState<DocumentCollection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [hideLowCredibility, setHideLowCredibility] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [densityMode, setDensityMode] = useState<'compact' | 'comfortable'>(() => {
    if (typeof window === 'undefined') return 'compact';
    const saved = window.localStorage.getItem('document-browser-density');
    return saved === 'comfortable' ? 'comfortable' : 'compact';
  });
  const [searchInput, setSearchInput] = useState(effectiveSearchTerm || '');
  const [selectedTranche, setSelectedTranche] = useState<string>('all');
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [jumpToPage, setJumpToPage] = useState('');
  const [availableCollections, setAvailableCollections] = useState<any[]>([]);

  // Collections endpoint is optional in current deployments; fail-open with no groupings.
  useEffect(() => {
    setAvailableCollections([]);
  }, []);

  const [filters, setFilters] = useState<BrowseFilters>({
    fileType: [],
    dateRange: {},
    entities: [],
    categories: [],
    redFlagLevel: { min: 0, max: 5 },
    confidentiality: [],
    source: [],
  });

  // Ref for highlight navigation
  const documentContainerRef = useRef<HTMLDivElement>(null);

  // Use highlight navigation hook
  const { currentHighlightIndex, totalHighlights, nextHighlight, prevHighlight, hasHighlights } =
    useHighlightNavigation(effectiveSearchTerm, documentContainerRef);

  // hover triage state
  const [hoveredDoc, setHoveredDoc] = useState<Document | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleHoverStart = useCallback((doc: Document, rect: DOMRect) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredDoc(doc);
      setHoverRect(rect);
    }, 250);
  }, []);

  const handleHoverEnd = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredDoc(null);
    setHoverRect(null);
  }, []);

  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchBlockedUntil, setFetchBlockedUntil] = useState<number>(0);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  useEffect(() => {
    if (!fetchBlockedUntil) return;
    const remaining = fetchBlockedUntil - Date.now();
    if (remaining <= 0) {
      setFetchBlockedUntil(0);
      return;
    }
    const timer = window.setTimeout(() => setFetchBlockedUntil(0), remaining);
    return () => window.clearTimeout(timer);
  }, [fetchBlockedUntil]);

  useEffect(() => {
    if (effectiveSearchTerm !== searchInput) {
      setSearchInput(effectiveSearchTerm || '');
    }
  }, [effectiveSearchTerm, searchInput]); // keep input in sync on URL/nav changes

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput === effectiveSearchTerm) return;
      if (onSearchTermChange) {
        onSearchTermChange(searchInput);
      } else {
        setContextSearchTerm(searchInput);
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [effectiveSearchTerm, onSearchTermChange, searchInput, setContextSearchTerm]);

  useEffect(() => {
    window.localStorage.setItem('document-browser-density', densityMode);
  }, [densityMode]);

  useEffect(() => {
    const onScroll = () => setIsHeaderCondensed(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fetch documents from API with pagination
  useEffect(() => {
    const fetchDocuments = async () => {
      // Prevent duplicate fetches or fetching when no more data
      if (isFetchingRef.current || (currentPage > 1 && !hasMoreRef.current)) return;
      if (fetchBlockedUntil > Date.now()) return;

      try {
        isFetchingRef.current = true;
        setIsFetching(true);

        // Global timeRange takes precedence over local dateRange when set
        const effectiveStart = globalFilters.timeRange[0] ?? filters.dateRange?.start;
        const effectiveEnd = globalFilters.timeRange[1] ?? filters.dateRange?.end;

        const result = await apiClient.getDocuments(
          {
            search:
              effectiveSearchTerm && effectiveSearchTerm.trim() ? effectiveSearchTerm : undefined,
            sortBy: sortBy || undefined,
            sortOrder,
            evidenceType:
              filters.categories && filters.categories.length > 0
                ? filters.categories[0]
                : undefined,
            source: filters.source && filters.source.length > 0 ? filters.source : undefined,
            startDate: effectiveStart ?? undefined,
            endDate: effectiveEnd ?? undefined,
            redFlagLevel: filters.redFlagLevel,
            collectionId: filters.collectionId,
          },
          currentPage,
          itemsPerPage,
        );

        // Map API response to Document type
        const newDocs: Document[] = (result.data || []).map((doc: any) =>
          mapApiDocumentToDocument(doc),
        );

        // Always replace: each page is a fresh view; accumulation leads to unbounded DOM growth
        setDocuments(newDocs);

        // Update total count and hasMore
        if (result.total !== undefined) {
          setTotalDocuments(result.total);
          // If we received fewer items than requested, we've reached the end
          const nextHasMore = newDocs.length === itemsPerPage;
          hasMoreRef.current = nextHasMore;
          setHasMore(nextHasMore);
        }
      } catch (error) {
        console.error('DocumentBrowser: Error fetching documents:', error);
        hasMoreRef.current = false;
        setHasMore(false);
        if (currentPage === 1) {
          setDocuments([]);
          setFilteredDocuments([]);
        }
      } finally {
        isFetchingRef.current = false;
        setIsFetching(false);
      }
    };

    fetchDocuments();
  }, [
    currentPage,
    itemsPerPage,
    effectiveSearchTerm,
    sortBy,
    sortOrder,
    filters.categories,
    filters.source,
    filters.collectionId,
    filters.dateRange,
    filters.fileType,
    filters.redFlagLevel,
    fetchBlockedUntil,
    globalFilters.timeRange,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
  }, [
    itemsPerPage,
    effectiveSearchTerm,
    sortBy,
    sortOrder,
    filters.categories,
    filters.collectionId,
    filters.source,
    filters.dateRange,
    filters.fileType,
    filters.redFlagLevel,
    globalFilters.timeRange,
  ]);

  // Apply client-side filters (credibility only - other filters handled by API)
  useEffect(() => {
    let results = documents;

    // Apply credibility filter
    if (hideLowCredibility) {
      results = results.filter((d) => (d.metadata?.credibility_score ?? 1) >= 0.6);
    }

    setFilteredDocuments(results);
  }, [documents, hideLowCredibility]);

  const handleDocumentSelect = useCallback(async (document: Document) => {
    // Set initial document data immediately
    setSelectedDocument(document);

    try {
      // Fetch full content from API
      const fullDoc = await apiClient.getDocument(document.id);
      if (fullDoc) {
        setSelectedDocument((prev) => (prev?.id === document.id ? { ...prev, ...fullDoc } : prev));
      }
    } catch (error) {
      console.error('Error fetching full document content:', error);
    }
  }, []);

  // Auto-select document when selectedDocumentId changes
  useEffect(() => {
    if (selectedDocumentId) {
      // If already selected, don't do anything
      if (selectedDocument?.id === selectedDocumentId) return;

      if (documents.length > 0) {
        const doc = documents.find((d) => d.id === selectedDocumentId);
        if (doc) {
          handleDocumentSelect(doc);
          return;
        }
      }

      // If we get here, document was not found in the list or list is empty.
      apiClient
        .getDocument(selectedDocumentId)
        .then((docData) => {
          if (docData) {
            const newDoc: Document = mapApiDocumentToDocument(docData);
            handleDocumentSelect(newDoc);
          }
        })
        .catch((err) => console.error('Error fetching selected document:', err));
    }
  }, [selectedDocumentId, documents, selectedDocument, handleDocumentSelect]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- collection is stable for this memo
  const fileTypeOptions = useMemo(() => {
    if (!collection) return [];
    return Array.from(collection.fileTypes.entries()).map(([type, count]) => ({
      value: type,
      label: `${type} (${count})`,
    }));
  }, [collection]);

  const sourceOptions = useMemo(() => {
    if (!collection) return [];
    const sources = [...new Set(documents.map((doc) => doc.metadata?.source || 'Unknown'))];
    return sources.map((source) => ({
      value: source,
      label: source,
    }));
  }, [collection, documents]);

  const handleFilterChange = useCallback((key: keyof BrowseFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const applyTrancheFilter = useCallback(
    (trancheValue: string) => {
      const option = DOJ_TRANCHE_OPTIONS.find((entry) => entry.value === trancheValue);
      setSelectedTranche(trancheValue);
      handleFilterChange('source', option ? option.sources : []);
    },
    [handleFilterChange],
  );

  useEffect(() => {
    const activeSources = [...(filters.source || [])].sort();
    if (activeSources.length === 0) {
      if (selectedTranche !== 'all') setSelectedTranche('all');
      return;
    }
    const matching = DOJ_TRANCHE_OPTIONS.find((entry) => {
      if (entry.sources.length !== activeSources.length) return false;
      return [...entry.sources].sort().every((source, idx) => source === activeSources[idx]);
    });
    const next = matching?.value || 'all';
    if (next !== selectedTranche) setSelectedTranche(next);
  }, [filters.source, selectedTranche]);

  const handleFileTypeToggle = (fileType: string) => {
    const current = filters.fileType || [];
    const updated = current.includes(fileType)
      ? current.filter((t) => t !== fileType)
      : [...current, fileType];
    handleFilterChange('fileType', updated);
  };

  const handleRedFlagLevelChange = (min: number, max: number) => {
    handleFilterChange('redFlagLevel', { min, max });
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <div className="w-full py-4 md:py-6">
        <div
          className={`sticky top-0 z-30 transition-all ${
            isHeaderCondensed ? 'py-2 mb-3' : 'py-3 mb-4'
          }`}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h1
                className={`font-bold text-slate-100 ${isHeaderCondensed ? 'text-lg' : 'text-2xl'}`}
              >
                Document Browser
              </h1>
              {!isHeaderCondensed && (
                <p className="text-sm text-slate-400">
                  High-signal evidence previews, risk context, and fast navigation at scale
                </p>
              )}
            </div>
            <div className="text-xs text-slate-400 shrink-0">
              {isFetching ? 'Updating results: ' : ''}
              Showing {filteredDocuments.length} of {totalDocuments.toLocaleString()}
            </div>
          </div>

          {/* Unified control row */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-2 xl:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, document ID, phrase, or source…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="control w-full h-11 pl-10 pr-10 text-sm bg-slate-900 border-slate-700 focus:outline-none focus:border-blue-500"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-slate-800 text-gray-400 hover:text-white transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap xl:justify-end">
              <select
                value={selectedTranche}
                onChange={(e) => applyTrancheFilter(e.target.value)}
                className="control h-11 px-3 text-sm leading-none bg-slate-900 border border-slate-700 rounded-[var(--radius-md)]"
                aria-label="Filter by tranche"
                title="Filter documents by tranche/source collection"
              >
                {DOJ_TRANCHE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="relative group">
                <button
                  type="button"
                  aria-label="Tranche help"
                  className="control h-11 w-11 p-0 inline-flex items-center justify-center text-slate-300"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300 shadow-xl group-hover:block group-focus-within:block">
                  Tranche filter maps to `source_collection` labels used in the archive. Example:
                  “DOJ Data Set 9-11” includes Data Sets 9, 10, and 11.
                </div>
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="control h-11 px-3 text-sm leading-none bg-slate-900 border border-slate-700 rounded-[var(--radius-md)]"
                aria-label="Sort field"
              >
                <option value="red_flag">Risk</option>
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="size">Size</option>
              </select>
              <button
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="control h-11 px-3 text-sm inline-flex items-center justify-center"
              >
                {sortOrder === 'desc' ? 'Desc' : 'Asc'}
              </button>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="control h-11 px-3 text-sm leading-none bg-slate-900 border border-slate-700 rounded-[var(--radius-md)]"
                aria-label="Results per page"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                onClick={() =>
                  setDensityMode((prev) => (prev === 'compact' ? 'comfortable' : 'compact'))
                }
                className="control h-11 px-3 text-sm inline-flex items-center justify-center"
                aria-label="Toggle density mode"
              >
                {densityMode === 'compact' ? 'Compact' : 'Comfortable'}
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`control h-11 w-11 p-0 inline-flex items-center justify-center ${viewMode === 'grid' ? 'bg-blue-600/30 border-blue-500/60 text-blue-200' : ''}`}
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`control h-11 w-11 p-0 inline-flex items-center justify-center ${viewMode === 'list' ? 'bg-blue-600/30 border-blue-500/60 text-blue-200' : ''}`}
                aria-label="List view"
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="control h-11 px-3 text-sm inline-flex items-center gap-1.5"
              >
                <Filter className="w-4 h-4" />
                Filters
                {showFilters ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 space-y-3">
          {hasHighlights && (
            <HighlightNavigationControls
              currentHighlightIndex={currentHighlightIndex}
              totalHighlights={totalHighlights}
              onNext={nextHighlight}
              onPrev={prevHighlight}
              className="bg-gray-800 border border-gray-700 rounded-[var(--radius-md)] px-3 py-2 shrink-0"
            />
          )}

          {/* Category + significance chips on one row (desktop) */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="overflow-x-auto pb-1 min-w-0 flex-1">
              <div className="inline-flex min-w-max items-center rounded-full border border-slate-700/75 bg-slate-900/65 overflow-hidden divide-x divide-slate-700/80">
                {[
                  { type: 'all', label: 'All', icon: <Folder className="w-3.5 h-3.5" /> },
                  { type: 'legal', label: 'Legal', icon: <Scale className="w-3.5 h-3.5" /> },
                  { type: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
                  {
                    type: 'deposition',
                    label: 'Deposition',
                    icon: <ScrollText className="w-3.5 h-3.5" />,
                  },
                  { type: 'photo', label: 'Photo', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                  {
                    type: 'financial',
                    label: 'Financial',
                    icon: <Landmark className="w-3.5 h-3.5" />,
                  },
                ].map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (type === 'all') {
                        handleFilterChange('categories', []);
                      } else {
                        handleFilterChange('categories', [type]);
                      }
                    }}
                    className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                      (type === 'all' &&
                        (!filters.categories || filters.categories.length === 0)) ||
                      filters.categories?.includes(type)
                        ? 'bg-blue-600/95 text-white'
                        : 'text-gray-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
              {selectedTranche !== 'all' && (
                <span className="px-3 py-1.5 rounded-full text-sm bg-cyan-900/40 text-cyan-100 border border-cyan-600/40">
                  Tranche:{' '}
                  {DOJ_TRANCHE_OPTIONS.find((entry) => entry.value === selectedTranche)?.label}
                </span>
              )}
              <div className="inline-flex min-w-max items-center rounded-full border border-slate-700/75 bg-slate-900/65 overflow-hidden divide-x divide-slate-700/80">
                <button
                  onClick={() => {
                    const isActive =
                      filters.redFlagLevel?.min === 4 && filters.redFlagLevel?.max === 5;
                    handleRedFlagLevelChange(isActive ? 0 : 4, isActive ? 5 : 5);
                  }}
                  className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                    filters.redFlagLevel?.min === 4 && filters.redFlagLevel?.max === 5
                      ? 'bg-red-900/80 text-white'
                      : 'text-gray-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${filters.redFlagLevel?.min === 4 && filters.redFlagLevel?.max === 5 ? 'bg-red-400' : 'bg-red-600'}`}
                  ></div>
                  <span>High Significance</span>
                </button>
                <button
                  onClick={() => {
                    const isActive =
                      filters.redFlagLevel?.min === 2 && filters.redFlagLevel?.max === 3;
                    handleRedFlagLevelChange(isActive ? 0 : 2, isActive ? 5 : 3);
                  }}
                  className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                    filters.redFlagLevel?.min === 2 && filters.redFlagLevel?.max === 3
                      ? 'bg-amber-900/80 text-white'
                      : 'text-gray-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${filters.redFlagLevel?.min === 2 && filters.redFlagLevel?.max === 3 ? 'bg-amber-400' : 'bg-amber-600'}`}
                  ></div>
                  <span>Medium</span>
                </button>
                <button
                  onClick={() => {
                    const isActive =
                      filters.redFlagLevel?.min === 0 && filters.redFlagLevel?.max === 1;
                    handleRedFlagLevelChange(isActive ? 0 : 0, isActive ? 5 : 1);
                  }}
                  className={`inline-flex items-center gap-2 h-11 px-4 text-sm font-medium transition-colors shrink-0 ${
                    filters.redFlagLevel?.min === 0 && filters.redFlagLevel?.max === 1
                      ? 'bg-emerald-900/80 text-white'
                      : 'text-gray-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${filters.redFlagLevel?.min === 0 && filters.redFlagLevel?.max === 1 ? 'bg-emerald-400' : 'bg-emerald-600'}`}
                  ></div>
                  <span>Low</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop inline filters (hidden on mobile) */}
          {showFilters && (
            <div className="hidden md:block bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* File Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">File Type</label>
                  <div className="space-y-1">
                    {fileTypeOptions.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.fileType?.includes(option.value) || false}
                          onChange={() => handleFileTypeToggle(option.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Source</label>
                  <select
                    multiple
                    value={filters.source || []}
                    onChange={(e) =>
                      handleFilterChange(
                        'source',
                        Array.from(e.target.selectedOptions, (option) => option.value),
                      )
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm h-24"
                  >
                    {sourceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range */}
                <div>
                  <label className="block text-sm font-medium mb-2">Date range</label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.dateRange?.start || ''}
                      onChange={(e) =>
                        handleFilterChange('dateRange', {
                          ...(filters.dateRange || {}),
                          start: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="date"
                      value={filters.dateRange?.end || ''}
                      onChange={(e) =>
                        handleFilterChange('dateRange', {
                          ...(filters.dateRange || {}),
                          end: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Red Flag Index Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Red Flag Index</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Flag className="w-3 h-3 text-gray-400" />
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={filters.redFlagLevel?.min || 0}
                        onChange={(e) =>
                          handleRedFlagLevelChange(
                            parseInt(e.target.value),
                            filters.redFlagLevel?.max || 5,
                          )
                        }
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-400 inline-flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        <span>5</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">
                        Min: {filters.redFlagLevel?.min || 0}
                      </span>
                      <span className="text-xs text-gray-400">
                        Max: {filters.redFlagLevel?.max || 5}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm mb-2"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="red_flag">Red Flag Index</option>
                    <option value="fileType">File Type</option>
                    <option value="size">File Size</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                {/* Credibility Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Reliability</label>
                  <label
                    className="flex items-center text-sm"
                    title="Hide documents flagged as low credibility based on source and provenance"
                  >
                    <input
                      type="checkbox"
                      checked={hideLowCredibility}
                      onChange={(e) => setHideLowCredibility(e.target.checked)}
                      className="mr-2"
                    />
                    Hide low credibility material
                  </label>
                </div>

                {/* Logical Collections Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <GalleryVertical className="w-4 h-4 text-cyan-400" />
                    Logical Grouping
                  </label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200"
                    value={filters.collectionId || ''}
                    onChange={(e) =>
                      handleFilterChange('collectionId', e.target.value || undefined)
                    }
                  >
                    <option value="">All Documents</option>
                    {availableCollections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Filter Bottom Sheet */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-40 md:hidden"
                  onClick={() => setShowFilters(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl z-50 md:hidden max-h-[80vh] overflow-hidden"
                >
                  <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-slate-700 rounded-full" />
                  </div>
                  <div className="px-4 pb-2 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Filters</h2>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto pb-8 px-4 space-y-6 max-h-[calc(80vh-80px)]">
                    {/* Sort Options */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="date">Date</option>
                        <option value="red_flag">Red Flag Index</option>
                        <option value="fileType">File Type</option>
                        <option value="size">File Size</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Order</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSortOrder('desc')}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                            sortOrder === 'desc'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          Descending
                        </button>
                        <button
                          onClick={() => setSortOrder('asc')}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                            sortOrder === 'asc'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          Ascending
                        </button>
                      </div>
                    </div>

                    {/* Red Flag Index */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Red Flag Index
                      </label>
                      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <Flag className="w-7 h-7 text-rose-400" />
                          <span className="text-slate-300 text-sm">
                            {filters.redFlagLevel?.min || 0} - {filters.redFlagLevel?.max || 5}
                          </span>
                          <span className="inline-flex items-center gap-1 text-rose-300">
                            <Flag className="w-7 h-7" />
                            <span className="text-sm font-medium">5</span>
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          value={filters.redFlagLevel?.min || 0}
                          onChange={(e) =>
                            handleRedFlagLevelChange(
                              parseInt(e.target.value),
                              filters.redFlagLevel?.max || 5,
                            )
                          }
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Date range */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Date range
                      </label>
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={filters.dateRange?.start || ''}
                          onChange={(e) =>
                            handleFilterChange('dateRange', {
                              ...(filters.dateRange || {}),
                              start: e.target.value,
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white"
                        />
                        <input
                          type="date"
                          value={filters.dateRange?.end || ''}
                          onChange={(e) =>
                            handleFilterChange('dateRange', {
                              ...(filters.dateRange || {}),
                              end: e.target.value,
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white"
                        />
                      </div>
                    </div>

                    {/* Credibility Filter */}
                    <div>
                      <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <input
                          type="checkbox"
                          checked={hideLowCredibility}
                          onChange={(e) => setHideLowCredibility(e.target.checked)}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm text-slate-300">
                          Hide low credibility material
                        </span>
                      </label>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Results status row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 text-sm text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalDocuments)} of{' '}
              {totalDocuments.toLocaleString()}
            </span>
            {effectiveSearchTerm && (
              <span className="semantic-chip border-slate-700/60 bg-slate-900/70 text-slate-300">
                Query: "{effectiveSearchTerm}"
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center h-10 rounded-full border border-slate-700/75 bg-slate-900/65 overflow-hidden">
              <label className="text-xs text-slate-500 pl-3 pr-2 whitespace-nowrap">Jump to</label>
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.ceil(totalDocuments / itemsPerPage))}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                className="w-20 h-full px-2 bg-transparent border-0 text-slate-100 text-xs focus:outline-none"
              />
              <button
                onClick={() => {
                  const page = Number(jumpToPage);
                  const maxPage = Math.max(1, Math.ceil(totalDocuments / itemsPerPage));
                  if (!Number.isFinite(page)) return;
                  setCurrentPage(Math.min(maxPage, Math.max(1, page)));
                }}
                className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-white transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                title="Go to page"
                aria-label="Go to page"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.75]" />
              </button>
            </div>
          </div>
        </div>

        {/* Document Grid/List - Page flow (single scroll axis) */}
        {documents.length === 0 && filteredDocuments.length === 0 ? (
          <DocumentSkeleton count={12} />
        ) : filteredDocuments.length > 0 && viewMode === 'grid' ? (
          <div
            ref={documentContainerRef}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4"
          >
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                searchTerm={effectiveSearchTerm}
                dense={densityMode === 'compact'}
                onClick={handleDocumentSelect}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
              />
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div ref={documentContainerRef} style={{ height: '70vh' }}>
            <AutoSizer
              renderProp={({ height, width }) =>
                height && width ? (
                  <FixedSizeList
                    height={height}
                    width={width}
                    itemCount={filteredDocuments.length}
                    itemSize={densityMode === 'compact' ? 130 : 170}
                    overscanCount={5}
                  >
                    {({ index, style }) => (
                      <div style={{ ...style, paddingBottom: 12 }}>
                        <DocumentCard
                          document={filteredDocuments[index]}
                          searchTerm={effectiveSearchTerm}
                          dense={densityMode === 'compact'}
                          onClick={handleDocumentSelect}
                          onHoverStart={handleHoverStart}
                          onHoverEnd={handleHoverEnd}
                        />
                      </div>
                    )}
                  </FixedSizeList>
                ) : null
              }
            />
          </div>
        ) : null}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {effectiveSearchTerm
                ? `No documents match your search for "${effectiveSearchTerm}"`
                : 'Try adjusting your filters or search query'}
            </p>
            <div className="mt-4 text-xs text-slate-500 space-y-1">
              <p>Search tips: try full names, aliases, document IDs, or quoted phrases.</p>
              <p>Try removing strict filters or widening the date range.</p>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredDocuments.length > 0 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>

            <div className="text-sm text-gray-400 text-center">
              <div>
                Page {currentPage} of {Math.ceil(totalDocuments / itemsPerPage) || 1}
              </div>
              <div className="text-xs mt-1">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalDocuments)} of{' '}
                {totalDocuments.toLocaleString()} documents
              </div>
            </div>

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= Math.ceil(totalDocuments / itemsPerPage)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Document Viewer Modal */}
        {selectedDocument && (
          <DocumentModal
            id={String(selectedDocument.id)}
            searchTerm={effectiveSearchTerm}
            initialDoc={selectedDocument}
            onClose={() => {
              setSelectedDocument(null);
              onDocumentClose?.();
            }}
          />
        )}

        {/* Hover Preview Overlay */}
        <AnimatePresence>
          {hoveredDoc && hoverRect && <HoverPreview doc={hoveredDoc} rect={hoverRect} />}
        </AnimatePresence>
      </div>
    </div>
  );
};
