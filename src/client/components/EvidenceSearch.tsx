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
import { Surface, Flex, Stack, LqText, Grid } from '../design-system/lib';
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

  useUndo();
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

  const allEvidenceTypes = useMemo(() => {
    const types = new Set<string>();
    people.forEach((person) => {
      person.evidenceTypes.forEach((type) => types.add(type));
    });
    return Array.from(types).sort();
  }, [people]);

  const handlePersonClick = (person: Person) => {
    if (onPersonClick) onPersonClick(person, searchTerm);
  };

  const { data: docSnippets = [] } = useQuery<
    Array<{ id: number; title: string; redFlagRating: number; snippet?: string }>
  >({
    queryKey: ['evidence-search-doc-snippets', debouncedSearchTerm],
    queryFn: async () => {
      const q = (debouncedSearchTerm || '').trim();
      if (!q) return [];
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8&snippets=true`);
      const json = await r.json();
      return (json.documents || []).map((d: Record<string, unknown>) => ({
        id: Number(d.id),
        title: String(d.title),
        redFlagRating: Number(d.redFlagRating),
        snippet: String(d.snippet || d.contentPreview || ''),
      }));
    },
    enabled: Boolean(debouncedSearchTerm.trim()),
    placeholderData: (previousData) => previousData,
  });

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
        { value: 0, label: '0 - No Red Flags' },
        { value: 1, label: '1 - Minor Concerns' },
        { value: 2, label: '2 - Moderate' },
        { value: 3, label: '3 - Significant' },
        { value: 4, label: '4 - High Risk' },
        { value: 5, label: '5 - Critical' },
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
    <Stack gap="xl" className={styles.root}>
      <EvidenceFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedRiskLevel={selectedRiskLevel}
        onRiskLevelChange={setSelectedRiskLevel}
        selectedEvidenceType={selectedEvidenceType}
        onEvidenceTypeChange={setSelectedEvidenceType}
        minRedFlagRating={minRedFlagRating}
        onMinRedFlagRatingChange={setMinRedFlagRating}
        maxRedFlagRating={maxRedFlagRating}
        onMaxRedFlagRatingChange={setMaxRedFlagRating}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        showRedFlagOnly={showRedFlagOnly}
        onShowRedFlagOnlyChange={setShowRedFlagOnly}
        showFilters={showFilters}
        onShowFiltersToggle={() => setShowFilters(!showFilters)}
        loading={loading}
        loadingProgress={loading ? 'Scanning Archive...' : 'Complete'}
        loadingProgressValue={loading ? 70 : 100}
        allEvidenceTypes={allEvidenceTypes}
        filterOptions={filterOptions}
        resultCount={searchResults.length}
      />

      <Stack gap="lg" className={styles.resultsStack}>
        {loading && people.length === 0 ? (
          <Grid cols={{ base: 1, md: 2 }} gap="lg">
            {[...Array(6)].map((_, i) => (
              <Surface key={i} variant="glass" p="md">
                <Stack gap="md">
                  <Flex justify="between" align="center">
                    <Flex align="center" gap="md">
                      <Surface
                        variant="glass"
                        className={styles.autoGen0}
                        style={{ width: 40, height: 40 }}
                      />
                      <Stack gap="xs">
                        <Surface variant="glass" style={{ width: 120, height: 20 }} />
                        <Surface variant="glass" style={{ width: 80, height: 12 }} />
                      </Stack>
                    </Flex>
                    <Surface variant="glass" style={{ width: 60, height: 24 }} />
                  </Flex>
                  <Stack gap="xs">
                    <Surface variant="glass" style={{ width: '100%', height: 12 }} />
                    <Surface variant="glass" style={{ width: '90%', height: 12 }} />
                    <Surface variant="glass" style={{ width: '40%', height: 12 }} />
                  </Stack>
                </Stack>
              </Surface>
            ))}
          </Grid>
        ) : (
          <>
            {searchResults.length === 0 && docSnippets.length === 0 && searchTerm.trim() && (
              <Surface variant="glass" className={styles.emptyState} p="xl">
                <Flex direction="column" align="center" gap="md">
                  <Search size={48} className={styles.emptyIcon} />
                  <Stack align="center" gap="xs">
                    <LqText variant="h3" color="muted">
                      No signals found for &quot;{searchTerm}&quot;
                    </LqText>
                    <LqText variant="small" color="muted">
                      Try adjusting your forensic filters or search terms.
                    </LqText>
                  </Stack>
                </Flex>
              </Surface>
            )}

            {!loading && searchResults.length === 0 && !searchTerm.trim() && !showRedFlagOnly && (
              <Surface variant="glass" className={styles.emptyState} p="xl">
                <Flex direction="column" align="center" gap="md">
                  <Search size={48} className={styles.emptyIcon} />
                  <Stack align="center" gap="xs">
                    <LqText variant="h3" color="muted">
                      Initialize Forensic Search
                    </LqText>
                    <LqText variant="small" color="muted">
                      Enter keywords or use the filters to begin analysis.
                    </LqText>
                  </Stack>
                </Flex>
              </Surface>
            )}

            <Grid cols={{ base: 1, md: 2 }} gap="lg">
              {searchResults.map((result, index) => (
                <EvidenceResultCard key={index} result={result} onPersonClick={handlePersonClick} />
              ))}
            </Grid>

            {docSnippets.length > 0 && (
              <EvidenceDocSnippets snippets={docSnippets} searchTerm={searchTerm} />
            )}
          </>
        )}
      </Stack>
    </Stack>
  );
};
