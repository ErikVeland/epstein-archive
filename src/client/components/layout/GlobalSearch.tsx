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
import { Box, Button, SearchField, Select, TextInput } from '../../design-system/lib';
import { apiClient } from '../../services/apiClient';
import { Person } from '../../types';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import { MobileStackHeader } from './MobileStackHeader';
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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  useScrollLock(!!selectedResult || (isMobile && searchTerm.length > 2));

  const handleDownload = (id: string, filename: string) => {
    const a = document.createElement('a');
    a.href = `/api/documents/${encodeURIComponent(String(id))}/file`;
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
          <Button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            variant="secondary"
            size="sm"
            className={s.filterToggle}
          >
            <Filter size={16} />
            <span>Filters</span>
            <ChevronDown
              size={16}
              className={showFilters ? `${s.chevronIcon} ${s.chevronIconOpen}` : s.chevronIcon}
            />
          </Button>
        </div>

        {/* Search Input */}
        <div className={s.inputWrapper}>
          <SearchField
            type="text"
            placeholder="Search across all evidence files... (e.g., Trump, Clinton, Epstein, flight logs, emails)"
            className={s.input}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search global evidence"
          />
          {searchTerm && !loading && (
            <Button
              type="button"
              onClick={() => setSearchTerm('')}
              variant="ghost"
              size="sm"
              className={s.clearButton}
              aria-label="Clear search"
              title="Clear search"
            >
              <X size={16} />
            </Button>
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
              <Select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                size="sm"
                className={s.filterSelect}
                options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Entity</label>
              <TextInput
                type="text"
                placeholder="e.g., Trump, Epstein, Clinton"
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                density="compact"
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Min Word Count</label>
              <TextInput
                type="number"
                min="0"
                value={filters.min_word_count}
                onChange={(e) =>
                  setFilters({ ...filters, min_word_count: parseInt(e.target.value) || 0 })
                }
                density="compact"
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>Start Date</label>
              <TextInput
                type="date"
                value={filters.date_range.start}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_range: { ...filters.date_range, start: e.target.value },
                  })
                }
                density="compact"
                className={s.filterInput}
              />
            </div>

            <div className={s.filterGroup}>
              <label className={s.filterLabel}>End Date</label>
              <TextInput
                type="date"
                value={filters.date_range.end}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    date_range: { ...filters.date_range, end: e.target.value },
                  })
                }
                density="compact"
                className={s.filterInput}
              />
            </div>

            <div className={`${s.filterGroup} ${s.filterGroupEnd}`}>
              <Button
                type="button"
                onClick={() =>
                  setFilters({
                    category: 'all',
                    entity: '',
                    date_range: { start: '', end: '' },
                    min_word_count: 0,
                  })
                }
                variant="secondary"
                size="sm"
                className={s.clearFilterButton}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {searchError && (
        <div role="alert" className={s.errorBanner}>
          <AlertCircle size={20} className={s.errorIcon} />
          <div>
            <p className={s.errorTitle}>Search failed</p>
            <p className={s.errorDesc}>{searchError}</p>
          </div>
          <Button
            type="button"
            onClick={() => setSearchError(null)}
            variant="ghost"
            size="sm"
            className={`${s.clearButton} ${s.errorDismissButton}`}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </Button>
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
              <Button
                key={`inv-${index}`}
                type="button"
                variant="ghost"
                size="sm"
                className={`${s.resultItem} ${s.resultItemInvestigation}`}
                onClick={() => navigate(`/investigations/${asString(inv.uuid)}`)}
                aria-label={`Open investigation ${asString(inv.title)}`}
              >
                <div className={s.itemMeta}>
                  <span className={`${s.categoryBadge} ${s.categoryBadgeInvestigation}`}>
                    Investigation
                  </span>
                  <span className={s.helperText}>{asString(inv.status)}</span>
                </div>
                <h4 className={s.itemTitle}>{asString(inv.title)}</h4>
                {Boolean(inv.snippet) && (
                  <div
                    className={`${s.helperText} ${s.italicText}`}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asString(inv.snippet)) }}
                  />
                )}
              </Button>
            ))}

          {/* Articles Section */}
          {articleResults.length > 0 &&
            articleResults.map((art, index) => (
              <Button
                key={`art-${index}`}
                type="button"
                variant="ghost"
                size="sm"
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
                  <span className={`${s.categoryBadge} ${s.categoryBadgeArticle}`}>Article</span>
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
              </Button>
            ))}

          {/* Media Section */}
          {mediaResults.length > 0 &&
            mediaResults.map((med, index) => (
              <Button
                key={`med-${index}`}
                type="button"
                variant="ghost"
                size="sm"
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
                  <span className={`${s.categoryBadge} ${s.categoryBadgeMedia}`}>Media</span>
                  <span className={`${s.helperText} ${s.monoText}`}>{asString(med.fileType)}</span>
                </div>
                <h4 className={s.itemTitle}>{asString(med.title) || asString(med.filename)}</h4>
                {Boolean(med.snippet) && (
                  <div
                    className={s.helperText}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(asString(med.snippet)) }}
                  />
                )}
              </Button>
            ))}

          {/* Existing Document Results */}
          {filteredResults.map((result, index) => (
            <div key={`doc-${index}`} className={`${s.resultItem} ${s.resultItemDoc}`}>
              <div className={`${s.entityHeader} ${s.entityHeaderStart}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={s.resultItemInner}
                  onClick={() => setSelectedResult(result)}
                  aria-label={`Open evidence result ${result.filename}`}
                >
                  <div className={s.itemMeta}>
                    <span className={`${s.categoryBadge} ${s.categoryBadgeDocument}`}>
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
                </Button>

                <div className={s.itemActions}>
                  <Button
                    type="button"
                    onClick={() => navigate(`/documents/${encodeURIComponent(String(result.id))}`)}
                    variant="secondary"
                    size="sm"
                    iconOnly
                    className={s.actionButtonAccent}
                    aria-label={`View document: ${result.filename}`}
                    title="View document"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDownload(result.id, result.filename)}
                    variant="secondary"
                    size="sm"
                    iconOnly
                    className={s.actionButtonGlass}
                    aria-label={`Download document: ${result.filename}`}
                    title="Download document"
                  >
                    <Download size={16} />
                  </Button>
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
              <h4 className={`${s.sectionTitle} ${s.sectionTitleCentered}`}>No results found</h4>
              <p className={s.helperText}>Try adjusting your search terms or filters</p>
            </div>
          )}

        {!searchTerm && (
          <div className={s.emptyState}>
            <Search size={48} className={s.emptyIcon} />
            <h4 className={`${s.sectionTitle} ${s.sectionTitleCentered}`}>
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
        (isMobile ? (
          <Box className={s.fullScreenMobile}>
            <MobileStackHeader
              title={selectedResult.filename}
              subtitle={categories.find((c) => c.id === selectedResult.category)?.name}
              onBack={() => setSelectedResult(null)}
            />
            <div className={s.fullScreenContent}>
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
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedResult(null);
                    navigate(`/documents/${encodeURIComponent(String(selectedResult.id))}`);
                  }}
                  variant="primary"
                  size="sm"
                  className={s.mobileModalPrimaryButton}
                >
                  <Eye className={s.modalButtonIcon} />
                  <span>View File</span>
                </Button>
              </div>
            </div>
          </Box>
        ) : (
          createPortal(
            <div className={s.modalOverlay}>
              <div className={s.modalContent}>
                <div className={s.modalHeader}>
                  <div className={`${s.headerTop} ${s.headerTopCompact}`}>
                    <span className={`${s.categoryBadge} ${s.categoryBadgeMedia}`}>
                      {categories.find((c) => c.id === selectedResult.category)?.name}
                    </span>
                    <h3 className={`${s.itemTitle} ${s.itemTitleCompact}`}>
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
                  <Button
                    type="button"
                    onClick={() => setSelectedResult(null)}
                    variant="secondary"
                    size="sm"
                    className={s.modalSecondaryButton}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedResult(null);
                      navigate(`/documents/${encodeURIComponent(String(selectedResult.id))}`);
                    }}
                    variant="primary"
                    size="sm"
                    className={s.modalPrimaryButton}
                  >
                    <Eye className={s.modalButtonIcon} />
                    <span>View File</span>
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        ))}
    </div>
  );
};

export default GlobalSearch;
