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
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Person } from '../../types';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import s from './GlobalSearch.module.css';

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
    { id: 'all', name: 'All Categories', colorClass: '' },
    { id: 'emails', name: 'Emails', colorClass: s.resultItemDoc },
    { id: 'legal_documents', name: 'Legal Documents', colorClass: s.resultItemInvestigation },
    { id: 'flight_logs', name: 'Flight Records', colorClass: s.resultItemArticle },
    { id: 'testimonies', name: 'Testimonies', colorClass: s.resultItemMedia },
    { id: 'financial_records', name: 'Financial', colorClass: s.resultItemArticle },
    { id: 'general_documents', name: 'General', colorClass: s.resultItemMedia },
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

  const formatWordCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={s.root}>
      {/* Search Header */}
      <div className={s.header}>
        <div className={s.headerTop}>
          <h2 className={s.title}>
            <Search size={24} className={s.accentIcon} />
            <span>Global Evidence Search</span>
          </h2>
          <button onClick={() => setShowFilters(!showFilters)} className={s.filterToggle}>
            <Filter size={16} />
            <span>Filters</span>
            <ChevronDown
              size={16}
              style={{
                transform: showFilters ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>

        {/* Search Input */}
        <div className={s.inputWrapper}>
          <Search size={20} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Search across all evidence files... (e.g., Trump, Clinton, Epstein, flight logs, emails)"
            className={s.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && !loading && (
            <button
              onClick={() => setSearchTerm('')}
              className={s.clearButton}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
          {loading && (
            <div className={s.loadingSpinner}>
              <div className={`${s.spin} ${s.spinnerWrapper}`}>
                <RotateCcw size={20} className={s.accentIcon} />
              </div>
            </div>
          )}
        </div>

        <p className={s.helperText}>
          Search across {stats?.totalDocuments?.toLocaleString() || 'thousands of'} evidence files.
          Try names, dates, document types, or key terms.
        </p>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={s.filterPanel}>
          <div className={s.filterGrid}>
            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className={s.filterSelect}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Entity</label>
              <input
                type="text"
                placeholder="e.g., Trump, Epstein, Clinton"
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Min Word Count</label>
              <input
                type="number"
                min="0"
                value={filters.min_word_count}
                onChange={(e) =>
                  setFilters({ ...filters, min_word_count: parseInt(e.target.value) || 0 })
                }
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Start Date</label>
              <input
                type="date"
                value={filters.date_range.start}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_range: { ...filters.date_range, start: e.target.value },
                  })
                }
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>End Date</label>
              <input
                type="date"
                value={filters.date_range.end}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_range: { ...filters.date_range, end: e.target.value },
                  })
                }
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup} style={{ justifyContent: 'flex-end' }}>
              <button
                onClick={() =>
                  setFilters({
                    category: 'all',
                    entity: '',
                    date_range: { start: '', end: '' },
                    min_word_count: 0,
                  })
                }
                className={s.clearFilterButton}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {searchError && (
        <div role="alert" className={s.errorBanner}>
          <AlertCircle size={20} style={{ color: '#f87171' }} />
          <div>
            <p className={s.errorTitle}>Search failed</p>
            <p className={s.errorDesc}>{searchError}</p>
          </div>
          <button
            onClick={() => setSearchError(null)}
            className={s.clearButton}
            style={{ marginLeft: 'auto' }}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Entity Results */}
      {entityResults.length > 0 && (
        <div className={s.entitySection}>
          <h3 className={s.sectionTitle}>
            <User size={20} className={s.accentIcon} />
            Matched Entities
          </h3>
          <div className={s.entityGrid}>
            {entityResults.map((entity) => (
              <div key={entity.id} className={s.entityCard}>
                <div className={s.entityHeader}>
                  <div>
                    <h4 className={s.entityName}>{entity.name}</h4>
                    <p className={s.entityRole}>{entity.role || 'Unknown Role'}</p>
                  </div>
                  <div
                    className={s.riskBadge}
                    data-risk={(entity.redFlagRating || 0) > 3 ? 'high' : 'low'}
                  >
                    <ShieldAlert size={12} />
                    <span>{entity.redFlagRating || 0}</span>
                  </div>
                </div>
                <div className={s.entityStats}>
                  <span className={s.statItem}>
                    <Eye size={12} />
                    {entity.files || 0} docs
                  </span>
                  <span className={s.statItem}>
                    <Building size={12} />
                    {entity.mentions || 0} mentions
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Results */}
      <div className={s.resultsList}>
        <div className={s.resultsHeader}>
          <h3 className={s.sectionTitle}>Evidence Results {searchTerm && `for "${searchTerm}"`}</h3>
          <span className={s.helperText}>
            {filteredResults.length +
              investigationResults.length +
              articleResults.length +
              mediaResults.length}{' '}
            total results
          </span>
        </div>

        <div className={s.resultsDivider}>
          {/* Investigations Section */}
          {investigationResults.length > 0 &&
            investigationResults.map((inv, index) => (
              <button
                key={`inv-${index}`}
                type="button"
                className={`${s.resultItem} ${s.resultItemInvestigation}`}
                onClick={() => navigate(`/investigations/${asString(inv.uuid)}`)}
                aria-label={`Open investigation ${asString(inv.title)}`}
              >
                <div className={s.itemMeta}>
                  <span className={s.categoryBadge} style={{ background: '#9333ea' }}>
                    Investigation
                  </span>
                  <span className={s.helperText}>{asString(inv.status)}</span>
                </div>
                <h4 className={s.itemTitle}>{asString(inv.title)}</h4>
                {Boolean(inv.snippet) && (
                  <div
                    className={s.helperText}
                    style={{ fontStyle: 'italic' }}
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
                className={`${s.resultItem} ${s.resultItemArticle}`}
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
                <div className={s.itemMeta}>
                  <span className={s.categoryBadge} style={{ background: '#f97316' }}>
                    Article
                  </span>
                  <span className={s.helperText}>
                    {asString(art.source)} by {asString(art.author)}
                  </span>
                  {Boolean(art.pubDate) && (
                    <span className={s.helperText}>
                      {new Date(asString(art.pubDate)).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h4 className={s.itemTitle}>{asString(art.title)}</h4>
                {Boolean(art.snippet) && (
                  <div
                    className={s.helperText}
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
                className={`${s.resultItem} ${s.resultItemMedia}`}
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
                <div className={s.itemMeta}>
                  <span className={s.categoryBadge} style={{ background: 'var(--accent)' }}>
                    Media
                  </span>
                  <span className={s.helperText} style={{ fontFamily: 'monospace' }}>
                    {asString(med.fileType)}
                  </span>
                </div>
                <h4 className={s.itemTitle}>{asString(med.title) || asString(med.filename)}</h4>
                {Boolean(med.snippet) && (
                  <div
                    className={s.helperText}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asString(med.snippet)) }}
                  />
                )}
              </button>
            ))}

          {/* Existing Document Results */}
          {filteredResults.map((result, index) => (
            <div key={`doc-${index}`} className={`${s.resultItem} ${s.resultItemDoc}`}>
              <div className={s.entityHeader} style={{ alignItems: 'flex-start' }}>
                <button
                  type="button"
                  className={s.resultItemInner}
                  onClick={() => setSelectedResult(result)}
                  aria-label={`Open evidence result ${result.filename}`}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                  }}
                >
                  <div className={s.itemMeta}>
                    <span className={s.categoryBadge} style={{ background: '#10b981' }}>
                      {categories.find((c) => c.id === result.category)?.name || result.category}
                    </span>
                    <span className={s.itemWordCount}>
                      {result.wordCount ? formatWordCount(result.wordCount) : '0'} words
                    </span>
                    <span className={s.itemScore}>Score: {result.score}</span>
                  </div>

                  <h4 className={s.itemTitle}>{result.filename}</h4>
                  <p className={s.itemPath}>{result.file}</p>

                  {result.highlights.length > 0 && (
                    <div className={s.highlightList}>
                      {result.highlights.slice(0, 3).map((highlight, idx) => (
                        <div key={idx} className={s.highlightRow}>
                          <span className={s.highlightBullet}>•</span>
                          <span
                            className={s.highlightText}
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(highlight),
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </button>

                <div className={s.itemActions}>
                  <button
                    onClick={() => navigate(`/documents/${result.id}`)}
                    className={s.actionButtonAccent}
                    aria-label={`View document: ${result.filename}`}
                    title="View document"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => handleDownload(result.id, result.filename)}
                    className={s.actionButtonGlass}
                    aria-label={`Download document: ${result.filename}`}
                    title="Download document"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredResults.length === 0 &&
          entityResults.length === 0 &&
          investigationResults.length === 0 &&
          articleResults.length === 0 &&
          mediaResults.length === 0 &&
          searchTerm && (
            <div className={s.emptyState}>
              <Search size={48} className={s.emptyIcon} />
              <h4 className={s.sectionTitle} style={{ justifyContent: 'center' }}>
                No results found
              </h4>
              <p className={s.helperText}>Try adjusting your search terms or filters</p>
            </div>
          )}

        {!searchTerm && (
          <div className={s.emptyState}>
            <Search size={48} className={s.emptyIcon} />
            <h4 className={s.sectionTitle} style={{ justifyContent: 'center' }}>
              Start your investigation
            </h4>
            <p className={s.helperText}>
              Enter a search term to begin exploring the evidence archive
            </p>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {selectedResult &&
        createPortal(
          <div className={s.modalOverlay}>
            <div className={s.modalContent}>
              <div className={s.modalHeader}>
                <div className={s.headerTop} style={{ marginBottom: 0 }}>
                  <span className={s.categoryBadge} style={{ background: 'var(--accent)' }}>
                    {categories.find((c) => c.id === selectedResult.category)?.name}
                  </span>
                  <h3 className={s.itemTitle} style={{ marginBottom: 0, marginLeft: '1rem' }}>
                    {selectedResult.filename}
                  </h3>
                </div>
                <CloseButton
                  onClick={() => setSelectedResult(null)}
                  size="sm"
                  label="Close search result"
                  className={s.actionButtonGlass}
                />
              </div>

              <div className={s.modalBody}>
                <div className={s.modalGrid}>
                  <div>
                    <label className={s.modalLabel}>File Path</label>
                    <p className={`${s.modalValue} ${s.modalValueMono}`}>{selectedResult.file}</p>
                  </div>
                  <div>
                    <label className={s.modalLabel}>Word Count</label>
                    <p className={s.modalValue}>
                      {(selectedResult.wordCount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className={s.modalLabel}>Search Score</label>
                    <p className={s.modalValueAccent}>{selectedResult.score}</p>
                  </div>
                  <div>
                    <label className={s.modalLabel}>Category</label>
                    <p className={s.modalValue}>{selectedResult.category}</p>
                  </div>
                </div>

                {selectedResult.entities.length > 0 && (
                  <div className={s.modalSection}>
                    <label className={s.modalSectionLabel}>Entities Mentioned</label>
                    <div className={s.modalChipList}>
                      {selectedResult.entities.map((entity, idx) => (
                        <span key={idx} className={s.modalChip}>
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.dates.length > 0 && (
                  <div className={s.modalSection}>
                    <label className={s.modalSectionLabel}>Dates Mentioned</label>
                    <div className={s.modalChipList}>
                      {selectedResult.dates.map((date, idx) => (
                        <span key={idx} className={`${s.modalChip} ${s.modalDateChip}`}>
                          <Calendar className={s.modalDateIcon} />
                          <span>{date}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.highlights.length > 0 && (
                  <div>
                    <label className={s.modalSectionLabel}>Search Highlights</label>
                    <div className={s.modalHighlightList}>
                      {selectedResult.highlights.map((highlight, idx) => (
                        <div key={idx} className={s.modalHighlightCard}>
                          <p className={s.modalHighlightText}>{highlight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={s.modalFooter}>
                <button onClick={() => setSelectedResult(null)} className={s.modalSecondaryButton}>
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedResult(null);
                    navigate(`/documents/${selectedResult.id}`);
                  }}
                  className={s.modalPrimaryButton}
                >
                  <Eye className={s.modalButtonIcon} />
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
