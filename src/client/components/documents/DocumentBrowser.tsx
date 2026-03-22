import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Document, BrowseFilters, DocumentCollection } from '../../types/documents';
import { useNavigation } from '../../services/NavigationContext';
import { DocumentModal } from './DocumentModal';
import { useHighlightNavigation } from '../../hooks/useHighlightNavigation';
import { HighlightNavigationControls } from './HighlightNavigationControls';
import { useFilters } from '../../contexts/useFilters';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';
import { DocumentBrowserHeader } from './DocumentBrowserHeader';
import { DocumentBrowserFilters } from './DocumentBrowserFilters';
import { DocumentList } from './DocumentList';
import { DocumentHoverPreview } from './DocumentHoverPreview';
import { useDocumentBrowserData } from '../../hooks/useDocumentBrowserData';

interface DocumentBrowserProps {
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  selectedDocumentId?: string;
  onDocumentClose?: () => void;
}

export const DocumentBrowser: React.FC<DocumentBrowserProps> = ({
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

  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'red_flag' | 'fileType' | 'size'>(
    'red_flag',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [collection, _setCollection] = useState<DocumentCollection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hideLowCredibility, setHideLowCredibility] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [densityMode, setDensityMode] = useState<'compact' | 'comfortable'>(() => {
    if (typeof window === 'undefined') return 'compact';
    const saved = window.localStorage.getItem('document-browser-density');
    return saved === 'comfortable' ? 'comfortable' : 'compact';
  });
  const [searchInput, setSearchInput] = useState(effectiveSearchTerm || '');
  const [selectedTranche, setSelectedTranche] = useState<string>('all');
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [jumpToPage, setJumpToPage] = useState('');
  const availableCollections = useMemo<any[]>(() => [], []);

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

  const {
    documents,
    filteredDocuments,
    selectedDocument,
    setSelectedDocument,
    handleDocumentSelect,
    currentPage,
    setCurrentPage,
    totalDocuments,
    isFetching,
  } = useDocumentBrowserData({
    effectiveSearchTerm,
    globalTimeRange: globalFilters.timeRange,
    sortBy,
    sortOrder,
    filters,
    itemsPerPage,
    hideLowCredibility,
    selectedDocumentId,
  });

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
    <div className="min-h-screen text-[var(--text-primary)] overflow-x-hidden">
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
              className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 shrink-0"
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
