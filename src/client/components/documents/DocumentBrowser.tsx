import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Document, BrowseFilters, DocumentCollection } from '../../types/documents';
import { DocumentProcessor } from '../../services/documentProcessor';
import { useNavigation } from '../../services/NavigationContext';
import { apiClient } from '../../services/apiClient';
import { DocumentModal } from './DocumentModal';
import { useHighlightNavigation } from '../../hooks/useHighlightNavigation';
import { HighlightNavigationControls } from './HighlightNavigationControls';
import { useFilters } from '../../contexts/useFilters';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';
import { DocumentBrowserHeader } from './DocumentBrowserHeader';
import { DocumentBrowserFilters } from './DocumentBrowserFilters';
import { DocumentList } from './DocumentList';
import { DocumentHoverPreview } from './DocumentHoverPreview';

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
  const { filters: globalFilters } = useFilters();
  const navigation = useNavigation();
  const { searchTerm: contextSearchTerm, setSearchTerm: setContextSearchTerm } = navigation;

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

  const documentContainerRef = useRef<HTMLDivElement>(null);
  const { currentHighlightIndex, totalHighlights, nextHighlight, prevHighlight, hasHighlights } =
    useHighlightNavigation(effectiveSearchTerm, documentContainerRef);

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
  const [fetchBlockedUntil] = useState<number>(0);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  useEffect(() => {
    if (effectiveSearchTerm !== searchInput) {
      setSearchInput(effectiveSearchTerm || '');
    }
  }, [effectiveSearchTerm, searchInput]);

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

  useEffect(() => {
    const fetchDocuments = async () => {
      if (isFetchingRef.current || (currentPage > 1 && !hasMoreRef.current)) return;
      if (fetchBlockedUntil > Date.now()) return;

      try {
        isFetchingRef.current = true;
        setIsFetching(true);

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

        const newDocs: Document[] = (result.data || []).map((doc: any) =>
          mapApiDocumentToDocument(doc),
        );
        setDocuments(newDocs);

        if (result.total !== undefined) {
          setTotalDocuments(result.total);
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

  useEffect(() => {
    let results = documents;
    if (hideLowCredibility) {
      results = results.filter((d) => (d.metadata?.credibility_score ?? 1) >= 0.6);
    }
    setFilteredDocuments(results);
  }, [documents, hideLowCredibility]);

  const handleDocumentSelect = useCallback(async (document: Document) => {
    setSelectedDocument(document);
    try {
      const fullDoc = await apiClient.getDocument(document.id);
      if (fullDoc) {
        setSelectedDocument((prev) => (prev?.id === document.id ? { ...prev, ...fullDoc } : prev));
      }
    } catch (error) {
      console.error('Error fetching full document content:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedDocumentId) {
      if (selectedDocument?.id === selectedDocumentId) return;
      if (documents.length > 0) {
        const doc = documents.find((d) => d.id === selectedDocumentId);
        if (doc) {
          handleDocumentSelect(doc);
          return;
        }
      }
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

  const fileTypeOptions = useMemo(() => {
    if (!collection) return [];
    return Array.from(collection.fileTypes.entries()).map(([type, count]) => ({
      value: type,
      label: `${type} (${count})`,
    }));
  }, [collection]);

  const sourceOptions = useMemo(() => {
    const sources = [...new Set(documents.map((doc) => doc.metadata?.source || 'Unknown'))];
    return sources.map((source) => ({
      value: source,
      label: source,
    }));
  }, [documents]);

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
        <DocumentBrowserHeader
          isHeaderCondensed={isHeaderCondensed}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          selectedTranche={selectedTranche}
          applyTrancheFilter={applyTrancheFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          setCurrentPage={setCurrentPage}
          densityMode={densityMode}
          setDensityMode={setDensityMode}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          isFetching={isFetching}
          filteredCount={filteredDocuments.length}
          totalDocuments={totalDocuments}
        />

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <DocumentBrowserFilters
                localFilters={filters}
                handleFilterChange={handleFilterChange}
                handleRedFlagLevelChange={handleRedFlagLevelChange}
                selectedTranche={selectedTranche}
                fileTypeOptions={fileTypeOptions}
                sourceOptions={sourceOptions}
                availableCollections={availableCollections}
                hideLowCredibility={hideLowCredibility}
                setHideLowCredibility={setHideLowCredibility}
                handleFileTypeToggle={handleFileTypeToggle}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {hasHighlights && (
          <div className="mb-4">
            <HighlightNavigationControls
              currentHighlightIndex={currentHighlightIndex}
              totalHighlights={totalHighlights}
              onNext={nextHighlight}
              onPrev={prevHighlight}
              className="bg-gray-800 border border-gray-700 rounded-[var(--radius-md)] px-3 py-2 shrink-0"
            />
          </div>
        )}

        <DocumentList
          documents={documents}
          filteredDocuments={filteredDocuments}
          viewMode={viewMode}
          densityMode={densityMode}
          handleDocumentSelect={handleDocumentSelect}
          handleHoverStart={handleHoverStart}
          handleHoverEnd={handleHoverEnd}
          isFetching={isFetching}
          currentPage={currentPage}
          totalDocuments={totalDocuments}
          itemsPerPage={itemsPerPage}
          setCurrentPage={setCurrentPage}
          searchTerm={searchInput}
          documentContainerRef={documentContainerRef}
          jumpToPage={jumpToPage}
          setJumpToPage={setJumpToPage}
        />

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

        <AnimatePresence>
          {hoveredDoc && hoverRect && <DocumentHoverPreview doc={hoveredDoc} rect={hoverRect} />}
        </AnimatePresence>
      </div>
    </div>
  );
};
