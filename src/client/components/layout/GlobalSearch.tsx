import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import DOMPurify from 'isomorphic-dompurify';
import {
  Search,
  Filter,
  Calendar,
  Eye,
  Download,
  ChevronDown,
  User,
  Building,
  ShieldAlert,
  AlertCircle,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Person } from '../../types';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';

interface SearchResult {
  id: string;
  file?: string;
  filename: string;
  category: string;
  score: number;
  highlights: string[];
  snippet?: string;
  entities: string[];
  dates: string[];
  // Document specific
  filePath?: string;
  evidenceType?: string;
  wordCount?: number;
  // Investigation specific
  uuid?: string;
  title?: string;
  description?: string;
  status?: string;
  // Article specific
  source?: string;
  author?: string;
  pubDate?: string;
  // Media specific
  fileType?: string;
}

interface SearchFilters {
  category: string;
  entity: string;
  date_range: { start: string; end: string };
  min_word_count: number;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asRecordArray = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

const GlobalSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [entityResults, setEntityResults] = useState<Person[]>([]);
  const [investigationResults, setInvestigationResults] = useState<Array<Record<string, unknown>>>(
    [],
  );
  const [articleResults, setArticleResults] = useState<Array<Record<string, unknown>>>([]);
  const [mediaResults, setMediaResults] = useState<Array<Record<string, unknown>>>([]);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    entity: '',
    date_range: { start: '', end: '' },
    min_word_count: 0,
  });
  const navigate = useNavigate();
  const [searchError, setSearchError] = useState<string | null>(null);
  useScrollLock(!!selectedResult);

  const handleDownload = (id: string, filename: string) => {
    const a = document.createElement('a');
    a.href = `/api/documents/${id}/file`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const { data: stats = null } = useQuery<Record<string, unknown> | null>({
    queryKey: ['global-search-stats'],
    queryFn: async () => {
      const value = await apiClient.getStats();
      return asRecord(value);
    },
  });

  const categories = [
    { id: 'all', name: 'All Categories', color: 'bg-[var(--glass-bg-highlight)]' },
    { id: 'emails', name: 'Emails', color: 'bg-green-600' },
    { id: 'legal_documents', name: 'Legal Documents', color: 'bg-red-600' },
    { id: 'flight_logs', name: 'Flight Records', color: 'bg-yellow-600' },
    { id: 'testimonies', name: 'Testimonies', color: 'bg-[var(--accent)]' },
    { id: 'financial_records', name: 'Financial', color: 'bg-orange-600' },
    { id: 'general_documents', name: 'General', color: 'bg-[var(--accent)]' },
  ];

  useEffect(() => {
    if (searchTerm.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        performSearch();
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setResults([]);
      setEntityResults([]);
      setFilteredResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- performSearch is stable and defined below
  }, [searchTerm]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyFilters is stable and defined below
  }, [results, filters]);

  const performSearch = async () => {
    setLoading(true);
    setSearchError(null);

    try {
      const data = asRecord(await apiClient.search(searchTerm, 100));

      if (data.entities) {
        setEntityResults(data.entities as Person[]);
      }

      if (data.investigations) {
        setInvestigationResults(asRecordArray(data.investigations));
      }

      if (data.articles) {
        setArticleResults(asRecordArray(data.articles));
      }

      if (data.media) {
        setMediaResults(asRecordArray(data.media));
      }

      if (data.documents) {
        const searchResults: SearchResult[] = asRecordArray(data.documents).map((doc) => ({
          id: asString(doc.id),
          file: asString(doc.filePath),
          filename: asString(doc.fileName),
          category: asString(doc.evidenceType, 'general_documents'),
          entities: Array.isArray(doc.entities)
            ? doc.entities
                .map((entity) =>
                  typeof entity === 'string'
                    ? entity
                    : entity && typeof entity === 'object'
                      ? asString((entity as UnknownRecord).name)
                      : '',
                )
                .filter(Boolean)
            : Array.isArray(doc.keyEntities)
              ? doc.keyEntities.map((entity) => asString(entity)).filter(Boolean)
              : [],
          dates: [asString(doc.dateCreated), asString(doc.extractedDate)].filter(Boolean),
          wordCount: asNumber(doc.wordCount, 0),
          score: asNumber(doc.score, 0),
          highlights: doc.snippet ? [asString(doc.snippet)] : [],
          snippet: asString(doc.snippet) || undefined,
          filePath: asString(doc.filePath) || undefined,
          evidenceType: asString(doc.evidenceType) || undefined,
        }));
        setResults(searchResults);
        setFilteredResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...results];

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter((result) => result.category === filters.category);
    }

    // Filter by entity
    if (filters.entity) {
      filtered = filtered.filter((result) =>
        result.entities.some((entity) =>
          entity.toLowerCase().includes(filters.entity.toLowerCase()),
        ),
      );
    }

    // Filter by word count
    if (filters.min_word_count > 0) {
      filtered = filtered.filter((result) => (result.wordCount || 0) >= filters.min_word_count);
    }

    if (filters.date_range.start || filters.date_range.end) {
      const start = filters.date_range.start ? Date.parse(filters.date_range.start) : null;
      const end = filters.date_range.end ? Date.parse(filters.date_range.end) : null;
      filtered = filtered.filter((result) => {
        const matchingDate = result.dates.find((value) => Number.isFinite(Date.parse(value)));
        if (!matchingDate) return false;
        const timestamp = Date.parse(matchingDate);
        if (start !== null && timestamp < start) return false;
        if (end !== null && timestamp > end) return false;
        return true;
      });
    }

    setFilteredResults(filtered);
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find((c) => c.id === category);
    return cat?.color || 'bg-[var(--glass-bg-highlight)]';
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm p-6 rounded-[var(--radius-xl)] border border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center space-x-2">
            <Search className="h-6 w-6 text-[var(--accent)]" />
            <span>Global Evidence Search</span>
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search across all evidence files... (e.g., Trump, Clinton, Epstein, flight logs, emails)"
            className="w-full pl-12 pr-12 py-4 bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && !loading && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-[var(--glass-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Clear search"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {loading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--accent)]"></div>
            </div>
          )}
        </div>

        <p className="text-[var(--text-muted)] text-sm mt-2">
          Search across {stats?.totalDocuments?.toLocaleString() || 'thousands of'} evidence files.
          Try names, dates, document types, or key terms.
        </p>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm p-6 rounded-[var(--radius-xl)] border border-[var(--glass-border)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Entity
              </label>
              <input
                type="text"
                placeholder="e.g., Trump, Epstein, Clinton"
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-gray-400 focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Min Word Count
              </label>
              <input
                type="number"
                min="0"
                value={filters.min_word_count}
                onChange={(e) =>
                  setFilters({ ...filters, min_word_count: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.date_range.start}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_range: { ...filters.date_range, start: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-[var(--text-primary)] text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.date_range.end}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_range: { ...filters.date_range, end: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex items-end md:col-span-2 lg:col-span-2">
              <button
                onClick={() =>
                  setFilters({
                    category: 'all',
                    entity: '',
                    date_range: { start: '', end: '' },
                    min_word_count: 0,
                  })
                }
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {searchError && (
        <div
          role="alert"
          className="bg-red-900/30 border border-red-500/50 rounded-[var(--radius-lg)] p-4 flex items-center gap-3"
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <p className="text-red-300 text-sm font-medium">Search failed</p>
            <p className="text-red-400/80 text-xs mt-0.5">{searchError}</p>
          </div>
          <button
            onClick={() => setSearchError(null)}
            className="ml-auto p-1 text-red-400 hover:text-red-300 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Entity Results */}
      {entityResults.length > 0 && (
        <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm rounded-[var(--radius-xl)] border border-[var(--glass-border)] p-6">
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[var(--accent)]" />
            Matched Entities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entityResults.map((entity) => (
              <div
                key={entity.id}
                className="bg-[var(--glass-bg-highlight)]/50 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:border-[var(--accent)] transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-[var(--text-primary)] font-medium">{entity.name}</h4>
                    <p className="text-sm text-[var(--text-muted)]">
                      {entity.role || 'Unknown Role'}
                    </p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      (entity.redFlagRating || 0) > 3
                        ? 'bg-red-900 text-red-200'
                        : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      {entity.redFlagRating || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {entity.files || 0} docs
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {entity.mentions || 0} mentions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Results */}
      <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm rounded-[var(--radius-xl)] border border-[var(--glass-border)]">
        <div className="p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">
              Evidence Results {searchTerm && `for "${searchTerm}"`}
            </h3>
            <span className="text-[var(--text-muted)]">
              {filteredResults.length +
                investigationResults.length +
                articleResults.length +
                mediaResults.length}{' '}
              total results
            </span>
          </div>
        </div>

        <div className="divide-y divide-[var(--glass-border)]">
          {/* Investigations Section */}
          {investigationResults.length > 0 &&
            investigationResults.map((inv, index) => (
              <button
                key={`inv-${index}`}
                type="button"
                className="w-full p-6 text-left bg-transparent hover:bg-cyan-900/10 transition-colors border-l-4 border-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                onClick={() => navigate(`/investigations/${asString(inv.uuid)}`)}
                aria-label={`Open investigation ${asString(inv.title)}`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-[var(--text-primary)]">
                    Investigation
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] uppercase`}
                  >
                    {asString(inv.status)}
                  </span>
                </div>
                <h4 className="text-[var(--text-primary)] font-medium text-lg mb-2">
                  {asString(inv.title)}
                </h4>
                {Boolean(inv.snippet) && (
                  <div
                    className="text-[var(--text-muted)] text-sm italic"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asString(inv.snippet)) }}
                  />
                )}
              </button>
            ))}

          {/* Articles Section */}
          {articleResults.length > 0 &&
            articleResults.map((art, index) => (
              <button
                key={`art-${index}`}
                type="button"
                className="w-full p-6 text-left bg-transparent hover:bg-orange-900/10 transition-colors border-l-4 border-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                onClick={() =>
                  setSelectedResult({
                    id: asString(art.id, `article-${index}`),
                    filename: asString(art.title),
                    category: 'article',
                    highlights: art.snippet ? [asString(art.snippet)] : [],
                    title: asString(art.title) || undefined,
                    snippet: asString(art.snippet) || undefined,
                    source: asString(art.source) || undefined,
                    author: asString(art.author) || undefined,
                    pubDate: asString(art.pubDate) || undefined,
                    score: asNumber(art.score, 0),
                    entities: [],
                    dates: [],
                  })
                }
                aria-label={`Open article result ${asString(art.title)}`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-600 text-[var(--text-primary)]">
                    Article
                  </span>
                  <span className="text-[var(--text-muted)] text-sm">
                    {asString(art.source)} by {asString(art.author)}
                  </span>
                  {Boolean(art.pubDate) && (
                    <span className="text-[var(--text-muted)] text-xs">
                      {new Date(asString(art.pubDate)).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h4 className="text-[var(--text-primary)] font-medium text-lg mb-2">
                  {asString(art.title)}
                </h4>
                {Boolean(art.snippet) && (
                  <div
                    className="text-[var(--text-muted)] text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asString(art.snippet)) }}
                  />
                )}
              </button>
            ))}

          {/* Media Section */}
          {mediaResults.length > 0 &&
            mediaResults.map((med, index) => (
              <button
                key={`med-${index}`}
                type="button"
                className="w-full p-6 text-left bg-transparent hover:bg-blue-900/10 transition-colors border-l-4 border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
                onClick={() =>
                  setSelectedResult({
                    id: asString(med.id, `media-${index}`),
                    filename: asString(med.title) || asString(med.filename),
                    category: 'media',
                    highlights: med.snippet ? [asString(med.snippet)] : [],
                    title: asString(med.title) || undefined,
                    snippet: asString(med.snippet) || undefined,
                    fileType: asString(med.fileType) || undefined,
                    filePath: asString(med.filePath) || undefined,
                    score: asNumber(med.score, 0),
                    entities: [],
                    dates: [],
                  })
                }
                aria-label={`Open media result ${asString(med.title) || asString(med.filename)}`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent)] text-[var(--text-primary)]">
                    Media
                  </span>
                  <span className="text-[var(--text-muted)] text-sm font-mono">
                    {asString(med.fileType)}
                  </span>
                </div>
                <h4 className="text-[var(--text-primary)] font-medium text-lg mb-2">
                  {asString(med.title) || asString(med.filename)}
                </h4>
                {Boolean(med.snippet) && (
                  <div
                    className="text-[var(--text-muted)] text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asString(med.snippet)) }}
                  />
                )}
              </button>
            ))}

          {/* Existing Document Results */}
          {filteredResults.map((result, index) => (
            <article
              key={`doc-${index}`}
              className="p-6 hover:bg-[var(--glass-bg)]/30 transition-colors border-l-4 border-emerald-500"
            >
              <div className="flex items-start justify-between">
                <button
                  type="button"
                  className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset rounded-[var(--radius-lg)]"
                  onClick={() => setSelectedResult(result)}
                  aria-label={`Open evidence result ${result.filename}`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-[var(--text-primary)] ${getCategoryColor(result.category)}`}
                    >
                      {categories.find((c) => c.id === result.category)?.name || result.category}
                    </span>
                    <span className="text-[var(--text-muted)] text-sm">
                      {result.wordCount ? formatWordCount(result.wordCount) : '0'} words
                    </span>
                    <span className="text-[var(--accent)] text-sm font-medium">
                      Score: {result.score}
                    </span>
                  </div>

                  <h4 className="text-[var(--text-primary)] font-medium text-lg mb-2">
                    {result.filename}
                  </h4>

                  <p className="text-[var(--text-muted)] text-sm mb-3">{result.file}</p>

                  {result.highlights.length > 0 && (
                    <div className="space-y-1">
                      {result.highlights.slice(0, 3).map((highlight, idx) => (
                        <div
                          key={idx}
                          className="text-[var(--text-secondary)] text-sm flex items-start space-x-2"
                        >
                          <span className="mt-1 text-[var(--accent)]">•</span>
                          <span
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(
                                highlight.replace(
                                  /<mark>/g,
                                  '<mark class="bg-yellow-500/30 text-yellow-200 rounded px-0.5">',
                                ),
                                { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: ['class'] },
                              ),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </button>

                <div className="ml-4 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/documents/${result.id}`);
                    }}
                    className="p-2 bg-[var(--accent)] hover:bg-cyan-700 rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors"
                    aria-label={`View document: ${result.filename}`}
                    title="View document"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(result.id, result.filename);
                    }}
                    className="p-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors"
                    aria-label={`Download document: ${result.filename}`}
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filteredResults.length === 0 &&
          entityResults.length === 0 &&
          investigationResults.length === 0 &&
          articleResults.length === 0 &&
          mediaResults.length === 0 &&
          searchTerm && (
            <div className="p-12 text-center">
              <Search className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
              <h4 className="text-[var(--text-secondary)] font-medium mb-2">No results found</h4>
              <p className="text-[var(--text-muted)] mb-4">
                Try adjusting your search terms or filters
              </p>
              <p className="text-[var(--text-primary)] text-sm">
                Search tips: Try different spellings, use fewer keywords, or check entity names
              </p>
            </div>
          )}

        {!searchTerm && (
          <div className="p-12 text-center">
            <Search className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h4 className="text-[var(--text-secondary)] font-medium mb-2">
              Start your investigation
            </h4>
            <p className="text-[var(--text-muted)]">
              Enter a search term to begin exploring the evidence archive
            </p>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {selectedResult &&
        createPortal(
          <div className="fixed inset-0 bg-[var(--glass-bg-strong)] backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] max-w-4xl w-full max-h-[80vh] overflow-hidden border border-[var(--glass-border)]">
              <div className="p-6 border-b border-[var(--glass-border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium text-[var(--text-primary)] ${getCategoryColor(selectedResult.category)}`}
                    >
                      {categories.find((c) => c.id === selectedResult.category)?.name}
                    </span>
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {selectedResult.filename}
                    </h3>
                  </div>
                  <CloseButton
                    onClick={() => setSelectedResult(null)}
                    size="sm"
                    label="Close search result"
                    className="border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/70 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-1">File Path</label>
                    <p className="text-[var(--text-primary)] text-sm font-mono">
                      {selectedResult.file}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-1">
                      Word Count
                    </label>
                    <p className="text-[var(--text-primary)]">
                      {(selectedResult.wordCount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-1">
                      Search Score
                    </label>
                    <p className="text-[var(--accent)] font-medium">{selectedResult.score}</p>
                  </div>
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-1">Category</label>
                    <p className="text-[var(--text-primary)]">{selectedResult.category}</p>
                  </div>
                </div>

                {selectedResult.entities.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-[var(--text-muted)] text-sm mb-2">
                      Entities Mentioned
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.entities.map((entity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded-full text-sm"
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.dates.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-[var(--text-muted)] text-sm mb-2">
                      Dates Mentioned
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.dates.map((date, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded-full text-sm flex items-center space-x-2"
                        >
                          <Calendar className="h-3 w-3" />
                          <span>{date}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.highlights.length > 0 && (
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-2">
                      Search Highlights
                    </label>
                    <div className="space-y-2">
                      {selectedResult.highlights.map((highlight, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)]"
                        >
                          <p className="text-[var(--accent)] text-sm">{highlight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[var(--glass-border)] flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedResult(null);
                    navigate(`/documents/${selectedResult.id}`);
                  }}
                  className="px-4 py-2 bg-[var(--accent)] hover:bg-cyan-700 rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View File</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default GlobalSearch;
