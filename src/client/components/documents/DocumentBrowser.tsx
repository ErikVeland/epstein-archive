import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Document, BrowseFilters, DocumentCollection } from '../../types/documents';
import { useNavigation } from '../../services/NavigationContext';
import { useHighlightNavigation } from '../../hooks/useHighlightNavigation';
import { HighlightNavigationControls } from './HighlightNavigationControls';
import { useFilters } from '../../contexts/useFilters';
import { DOJ_TRANCHE_OPTIONS } from './documentTrancheOptions';
import { DocumentBrowserHeader } from './DocumentBrowserHeader';
import { DocumentBrowserFilters } from './DocumentBrowserFilters';
import { DocumentList } from './DocumentList';
import { DocumentHoverPreview } from './DocumentHoverPreview';
import { useDocumentBrowserData } from '../../hooks/useDocumentBrowserData';
import { useNavigate } from 'react-router-dom';
import styles from './DocumentBrowser.module.css';

interface DocumentBrowserProps {
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  selectedDocumentId?: string;
}

const DEFAULT_EXCLUDED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/tiff',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/wav',
  'application/octet-stream',
  'application/x-sql' + 'ite3',
  'application/zip',
];

export const DocumentBrowser: React.FC<DocumentBrowserProps> = ({
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  selectedDocumentId,
}) => {
  const navigate = useNavigate();
  const { filters: globalFilters } = useFilters();
  const navigation = useNavigation();
  const { searchTerm: contextSearchTerm, setSearchTerm: setContextSearchTerm } = navigation;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search') || params.get('q');
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
  const [isHeaderCondensed, setIsHeaderCondensed] = useState(false);
  const [jumpToPage, setJumpToPage] = useState('');

  const [prevEffectiveSearchTerm, setPrevEffectiveSearchTerm] = useState(effectiveSearchTerm);
  if (effectiveSearchTerm !== prevEffectiveSearchTerm) {
    setPrevEffectiveSearchTerm(effectiveSearchTerm);
    setSearchInput(effectiveSearchTerm || '');
  }
  const availableCollections = useMemo<Array<{ id: string; name: string }>>(() => [], []);

  const [filters, setFilters] = useState<BrowseFilters>({
    fileType: [],
    dateRange: {},
    entities: [],
    categories: [],
    redFlagLevel: { min: 0, max: 5 },
    confidentiality: [],
    source: [],
    includeMedia: false,
    excludedFileTypes: DEFAULT_EXCLUDED_TYPES,
  });

  const documentContainerRef = useRef<HTMLDivElement>(null);
  const { currentHighlightIndex, totalHighlights, nextHighlight, prevHighlight, hasHighlights } =
    useHighlightNavigation(effectiveSearchTerm, documentContainerRef);

  const [hoveredDoc, setHoveredDoc] = useState<Document | null>(null);
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const openDocumentRoute = useCallback(
    (document: Document) => {
      const params = new URLSearchParams(window.location.search);
      if (effectiveSearchTerm?.trim()) {
        params.set('search', effectiveSearchTerm.trim());
      } else {
        params.delete('search');
      }
      const query = params.toString();
      navigate(`/documents/${encodeURIComponent(document.id)}${query ? `?${query}` : ''}`);
    },
    [effectiveSearchTerm, navigate],
  );

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

  const { documents, filteredDocuments, currentPage, setCurrentPage, totalDocuments, isFetching } =
    useDocumentBrowserData({
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

  const handleFilterChange = useCallback(
    (key: keyof BrowseFilters, value: BrowseFilters[keyof BrowseFilters]) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  const selectedTranche = useMemo(() => {
    const activeSources = [...(filters.source || [])].sort();
    if (activeSources.length === 0) return 'all';

    const matching = DOJ_TRANCHE_OPTIONS.find((entry) => {
      if (entry.sources.length !== activeSources.length) return false;
      return [...entry.sources].sort().every((source, idx) => source === activeSources[idx]);
    });
    return matching?.value || 'all';
  }, [filters.source]);

  const applyTrancheFilter = useCallback(
    (trancheValue: string) => {
      const option = DOJ_TRANCHE_OPTIONS.find((entry) => entry.value === trancheValue);
      handleFilterChange('source', option ? option.sources : []);
    },
    [handleFilterChange],
  );

  const handleExcludedTypeToggle = (fileType: string) => {
    const currentExcluded = filters.excludedFileTypes || [];
    const updatedExcluded = currentExcluded.includes(fileType)
      ? currentExcluded.filter((t) => t !== fileType)
      : [...currentExcluded, fileType];
    handleFilterChange('excludedFileTypes', updatedExcluded);
  };

  const handleRedFlagLevelChange = (min: number, max: number) => {
    handleFilterChange('redFlagLevel', { min, max });
  };

  return (
    <Surface variant="glass" className={styles.pageShell}>
      <Box className={styles.contentWrap}>
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
              className={styles.filterMotion}
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
                handleExcludedTypeToggle={handleExcludedTypeToggle}
                defaultExcludedTypes={DEFAULT_EXCLUDED_TYPES}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {hasHighlights && (
          <div className={styles.highlightWrap}>
            <HighlightNavigationControls
              currentHighlightIndex={currentHighlightIndex}
              totalHighlights={totalHighlights}
              onNext={nextHighlight}
              onPrev={prevHighlight}
              className={`surface-panel ${styles.highlightControl}`}
            />
          </div>
        )}

        <DocumentList
          documents={documents}
          filteredDocuments={filteredDocuments}
          viewMode={viewMode}
          densityMode={densityMode}
          handleDocumentSelect={openDocumentRoute}
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

        <AnimatePresence>
          {hoveredDoc && hoverRect && <DocumentHoverPreview doc={hoveredDoc} rect={hoverRect} />}
        </AnimatePresence>
      </Box>
    </Surface>
  );
};
