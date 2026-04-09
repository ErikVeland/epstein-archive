import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { optimizedDataService } from '../services/OptimizedDataService';
import type { SearchFilters } from '../services/optimizedDataLoader';
import { Person } from '../types';
import { useNavigation } from '../services/NavigationContext';
import { useUndo } from './useUndo';
import { EvidenceFilters } from './evidence/EvidenceFilters';
import { EvidenceResultCard } from './evidence/EvidenceResultCard';
import { EvidenceDocSnippets } from './evidence/EvidenceDocSnippets';
import { Surface } from '../design-system/components/surfaces/Surface';
import { Box } from '../design-system/components/layout/Box';
import { Flex } from '../design-system/components/layout/Flex';
import { Grid } from '../design-system/components/layout/Grid';
import { LqText } from '../design-system/components/typography/Text';
import type { SpaceValue } from '../design-system/lib/resolveSpace';
import styles from './EvidenceSearch.module.css';

interface EvidenceSearchProps {
  onPersonClick?: (person: Person, searchTerm: string) => void;
}

export const EvidenceSearch: React.FC<EvidenceSearchProps> = ({ onPersonClick }) => {
  const location = useLocation();
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('ALL');
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string>('ALL');
  const [showRedFlagOnly, setShowRedFlagOnly] = useState(false);
  const [minRedFlagRating, setMinRedFlagRating] = useState<number>(0);
  const [maxRedFlagRating, setMaxRedFlagRating] = useState<number>(5);
  const [sortBy, setSortBy] = useState<
    'relevance' | 'mentions' | 'redflag_asc' | 'redflag_desc' | 'name'
  >('relevance');
  const [showFilters, setShowFilters] = useState(false);

  const { addUndoAction } = useUndo();
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  const urlParams = new URLSearchParams(location.search);
  const queryParam = urlParams.get('q') || '';

  useEffect(() => {
    if (queryParam && queryParam !== searchTerm) {
      setSearchTerm(queryParam);
    }
  }, [queryParam, setSearchTerm, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: people = [],
    isLoading,
    isFetching,
  } = useQuery<Person[]>({
    queryKey: [
      'evidence-search-people',
      debouncedSearchTerm,
      selectedRiskLevel,
      selectedEvidenceType,
      minRedFlagRating,
      maxRedFlagRating,
      sortBy,
      showRedFlagOnly,
    ],
    queryFn: async () => {
      const dataService = optimizedDataService;
      await dataService.initialize();

      const filters: SearchFilters = {
        searchTerm: debouncedSearchTerm || undefined,
        minRedFlagIndex: showRedFlagOnly ? Math.max(1, minRedFlagRating) : minRedFlagRating,
        maxRedFlagIndex: maxRedFlagRating,
      };

      if (selectedRiskLevel !== 'ALL') {
        filters.likelihoodScore = [selectedRiskLevel as 'HIGH' | 'MEDIUM' | 'LOW'];
      }
      if (selectedEvidenceType !== 'ALL') {
        filters.evidenceTypes = [selectedEvidenceType];
      }
      if (sortBy === 'redflag_desc') {
        filters.sortBy = 'red_flag';
        filters.sortOrder = 'desc';
      } else if (sortBy === 'redflag_asc') {
        filters.sortBy = 'red_flag';
        filters.sortOrder = 'asc';
      } else if (sortBy === 'mentions') {
        filters.sortBy = 'mentions';
        filters.sortOrder = 'desc';
      } else if (sortBy === 'name') {
        filters.sortBy = 'name';
        filters.sortOrder = 'asc';
      }

      const result = await dataService.getPaginatedData(filters, 1);
      return result.data;
    },
    placeholderData: (previousData) => previousData,
  });
  const loading = isLoading || isFetching;
  const loadingProgress = loading ? 'Searching database...' : 'Complete';
  const loadingProgressValue = loading ? 70 : 100;

  const allEvidenceTypes = useMemo(() => {
    const types = new Set<string>();
    people.forEach((person) => {
      person.evidenceTypes.forEach((type) => types.add(type));
    });
    return Array.from(types).sort();
  }, [people]);

  const handlePersonClick = (person: Person) => {
    if (onPersonClick) {
      onPersonClick(person, searchTerm);
    }
  };

  const setSelectedRiskLevelWithUndo = (value: string) => {
    const previousValue = selectedRiskLevel;
    setSelectedRiskLevel(value);
    addUndoAction({
      description: 'Risk level filter change',
      undo: () => setSelectedRiskLevel(previousValue),
    });
  };

  const setSelectedEvidenceTypeWithUndo = (value: string) => {
    const previousValue = selectedEvidenceType;
    setSelectedEvidenceType(value);
    addUndoAction({
      description: 'Evidence type filter change',
      undo: () => setSelectedEvidenceType(previousValue),
    });
  };

  const setShowRedFlagOnlyWithUndo = (value: boolean) => {
    const previousValue = showRedFlagOnly;
    setShowRedFlagOnly(value);
    addUndoAction({
      description: 'Red flag only filter change',
      undo: () => setShowRedFlagOnly(previousValue),
    });
  };

  const setMinRedFlagRatingWithUndo = (value: number) => {
    const previousValue = minRedFlagRating;
    setMinRedFlagRating(value);
    addUndoAction({
      description: 'Minimum red flag rating change',
      undo: () => setMinRedFlagRating(previousValue),
    });
  };

  const setMaxRedFlagRatingWithUndo = (value: number) => {
    const previousValue = maxRedFlagRating;
    setMaxRedFlagRating(value);
    addUndoAction({
      description: 'Maximum red flag rating change',
      undo: () => setMaxRedFlagRating(previousValue),
    });
  };

  const setSortByWithUndo = (value: typeof sortBy) => {
    const previousValue = sortBy;
    setSortBy(value);
    addUndoAction({
      description: 'Sort order change',
      undo: () => setSortBy(previousValue),
    });
  };

  const { data: docSnippetsState = [] } = useQuery<
    Array<{ id: number; title: string; redFlagRating: number; snippet?: string }>
  >({
    queryKey: ['evidence-search-doc-snippets', debouncedSearchTerm],
    queryFn: async () => {
      const q = (debouncedSearchTerm || '').trim();
      if (!q) return [];
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8&snippets=true`);
      const json = await r.json();
      return Array.isArray(json.documents)
        ? json.documents.map((d: Record<string, unknown>) => ({
            id: Number(d.id || 0),
            title: String(d.title || ''),
            redFlagRating: Number(d.redFlagRating || 0),
            snippet: String(d.snippet || d.contentPreview || ''),
          }))
        : [];
    },
    enabled: Boolean((debouncedSearchTerm || '').trim()),
    placeholderData: (previousData) => previousData,
  });

  const docSnippets = useMemo(() => docSnippetsState, [docSnippetsState]);

  const searchResults = useMemo(() => {
    if (loading && people.length === 0) return [];
    return people.map((person) => ({
      person,
      matchingContexts: person.contexts.slice(0, 3),
      matchingPassages: person.significantPassages?.slice(0, 3) || [],
      score: person.redFlagScore || person.mentions,
    }));
  }, [people, loading]);

  const filterOptions = useMemo(
    () => ({
      riskLevels: [
        { value: 'ALL', label: 'All Levels' },
        { value: 'HIGH', label: 'High Risk' },
        { value: 'MEDIUM', label: 'Medium Risk' },
        { value: 'LOW', label: 'Low Risk' },
      ],
      redFlagRatings: [
        { value: 0, label: '⚪ 0 - No Red Flags' },
        { value: 1, label: '🟡 1 - Minor Concerns' },
        { value: 2, label: '🟠 2 - Moderate Red Flags' },
        { value: 3, label: '🔴 3 - Significant Red Flags' },
        { value: 4, label: '🟣 4 - High Red Flags' },
        { value: 5, label: '⚫ 5 - Critical Red Flags' },
      ],
      sortByOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'mentions', label: 'Document mentions' },
        { value: 'redflag_desc', label: 'Red Flag Index (high → low)' },
        { value: 'redflag_asc', label: 'Red Flag Index (low → high)' },
        { value: 'name', label: 'Name' },
      ],
    }),
    [],
  );

  return (
    <Box className={styles.root}>
      <EvidenceFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedRiskLevel={selectedRiskLevel}
        onRiskLevelChange={setSelectedRiskLevelWithUndo}
        selectedEvidenceType={selectedEvidenceType}
        onEvidenceTypeChange={setSelectedEvidenceTypeWithUndo}
        minRedFlagRating={minRedFlagRating}
        onMinRedFlagRatingChange={setMinRedFlagRatingWithUndo}
        maxRedFlagRating={maxRedFlagRating}
        onMaxRedFlagRatingChange={setMaxRedFlagRatingWithUndo}
        sortBy={sortBy}
        onSortByChange={setSortByWithUndo}
        showRedFlagOnly={showRedFlagOnly}
        onShowRedFlagOnlyChange={setShowRedFlagOnlyWithUndo}
        showFilters={showFilters}
        onShowFiltersToggle={() => setShowFilters(!showFilters)}
        loading={loading}
        loadingProgress={loadingProgress}
        loadingProgressValue={loadingProgressValue}
        allEvidenceTypes={allEvidenceTypes}
        filterOptions={filterOptions}
        resultCount={searchResults.length}
      />

      <Box className={styles.resultsStack}>
        {loading && people.length === 0 ? (
          <Grid cols={{ base: 1, md: 2 }} gap={24 as SpaceValue}>
            {[...Array(6)].map((_, i) => (
              <Surface key={i} variant="glass" className={styles.skeletonCard}>
                <Box className={styles.shimmer} />
                <Flex align="start" justify="between" className={styles.skeletonHeader}>
                  <Flex align="center" gap={12}>
                    <Box className={styles.skeletonRow} />
                    <Box>
                      <Box className={`${styles.skeletonLine} ${styles.skeletonLineLg}`} />
                      <Box className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
                    </Box>
                  </Flex>
                  <Box className={styles.skeletonBadge} />
                </Flex>
                <Box className={styles.skeletonBody}>
                  <Box className={`${styles.skeletonLine} ${styles.skeletonFull}`} />
                  <Box className={`${styles.skeletonLine} ${styles.skeletonWide}`} />
                  <Box className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
                </Box>
                <Flex align="center" justify="between" className={styles.skeletonFooter}>
                  <Flex align="center" gap={8}>
                    <Box className={`${styles.skeletonLine} ${styles.skeletonBadge}`} />
                    <Box className={`${styles.skeletonLine} ${styles.skeletonLineMd}`} />
                  </Flex>
                  <Box className={`${styles.skeletonLine} ${styles.skeletonBadge}`} />
                </Flex>
              </Surface>
            ))}
          </Grid>
        ) : (
          <>
            {searchResults.length === 0 && docSnippets.length === 0 && searchTerm.trim() && (
              <Flex direction="column" align="center" className={styles.emptyState}>
                <Search size={48} className={styles.emptyIcon} />
                <LqText variant="h3" color="muted">
                  No results found for &quot;{searchTerm}&quot;
                </LqText>
                <LqText variant="small" color="muted" className={styles.emptySubtitle}>
                  Try adjusting your search terms or filters
                </LqText>
              </Flex>
            )}

            {!loading && searchResults.length === 0 && !searchTerm.trim() && !showRedFlagOnly && (
              <Flex direction="column" align="center" className={styles.emptyState}>
                <Search size={48} className={styles.emptyIcon} />
                <LqText variant="h3" color="muted">
                  Start searching to find evidence
                </LqText>
                <LqText variant="small" color="muted" className={styles.emptySubtitle}>
                  Search for names, keywords, or apply filters
                </LqText>
              </Flex>
            )}

            {searchResults.map((result, index) => (
              <EvidenceResultCard key={index} result={result} onPersonClick={handlePersonClick} />
            ))}

            <EvidenceDocSnippets snippets={docSnippets} searchTerm={searchTerm} />
          </>
        )}
      </Box>
    </Box>
  );
};
