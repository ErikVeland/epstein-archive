import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { optimizedDataService } from '../services/OptimizedDataService';
import type { SearchFilters } from '../services/optimizedDataLoader';
import { Person } from '../types';
import { useNavigation } from '../services/NavigationContext';
import { useUndo } from './useUndo';
import Icon from './common/Icon';
import { EvidenceFilters } from './evidence/EvidenceFilters';
import { EvidenceResultCard } from './evidence/EvidenceResultCard';
import { EvidenceDocSnippets } from './evidence/EvidenceDocSnippets';

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
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle

  // Use undo functionality
  const { addUndoAction } = useUndo();

  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Extract query parameter from URL
  const urlParams = new URLSearchParams(location.search);
  const queryParam = urlParams.get('q') || '';

  // Sync URL query to search term on mount or URL change
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
    ],
    queryFn: async () => {
      const dataService = optimizedDataService;
      await dataService.initialize();

      const filters: SearchFilters = {
        searchTerm: debouncedSearchTerm || undefined,
        minRedFlagIndex: minRedFlagRating,
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
    } else {
      console.log('No onPersonClick handler provided, person clicked:', person.name);
    }
  };

  // Enhanced filter setters with undo functionality
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

  // Memoize document snippets to avoid recomputing on every render
  const docSnippets = useMemo(() => {
    return docSnippetsState;
  }, [docSnippetsState]);

  // Memoize search results to avoid recomputing on every render
  const searchResults = useMemo(() => {
    if (loading) {
      return [];
    }

    // Since filtering is now done server-side, we just need to format the results
    return people.map((person) => ({
      person,
      matchingContexts: person.contexts.slice(0, 3),
      matchingPassages: person.significantPassages?.slice(0, 3) || [],
      score: person.redFlagScore || person.mentions,
    }));
  }, [people, loading]);

  // Memoize filter options to avoid recomputing
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
    <div className="space-y-6">
      {/* Search Header + Filters */}
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

      {/* Search Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 relative overflow-hidden"
                aria-label="Loading search result"
              >
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] w-10 h-10 animate-pulse"></div>
                    <div>
                      <div className="h-4 w-32 bg-[var(--glass-bg-highlight)] rounded mb-2 animate-pulse"></div>
                      <div className="h-3 w-24 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-[var(--glass-bg-highlight)] rounded-full animate-pulse"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                  <div className="h-3 w-5/6 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                  <div className="h-3 w-4/6 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[var(--glass-border)]">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-16 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                  </div>
                  <div className="h-3 w-20 bg-[var(--glass-bg-highlight)] rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {searchResults.length === 0 && docSnippets.length === 0 && searchTerm.trim() && (
              <div className="text-center py-12">
                <Icon name="Search" size="xl" color="gray" className="mx-auto mb-4" />
                <p className="text-[var(--text-muted)] text-lg">
                  No results found for &quot;{searchTerm}&quot;
                </p>
                <p className="text-[var(--text-muted)] text-sm mt-2">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}

            {searchResults.length === 0 &&
              !searchTerm.trim() &&
              selectedRiskLevel === 'ALL' &&
              selectedEvidenceType === 'ALL' &&
              !showRedFlagOnly && (
                <div className="text-center py-12">
                  <Icon name="Search" size="xl" color="gray" className="mx-auto mb-4" />
                  <p className="text-[var(--text-muted)] text-lg">
                    Start searching to find evidence
                  </p>
                  <p className="text-[var(--text-muted)] text-sm mt-2">
                    Search for names, keywords, or apply filters
                  </p>
                </div>
              )}

            {searchResults.map((result, index) => (
              <EvidenceResultCard key={index} result={result} onPersonClick={handlePersonClick} />
            ))}

            {/* Matching Documents Section - Displayed independently of person results */}
            <EvidenceDocSnippets snippets={docSnippets} searchTerm={searchTerm} />
          </>
        )}
      </div>
    </div>
  );
};
