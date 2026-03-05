import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Person } from '../../types';
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

const GlobalSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [entityResults, setEntityResults] = useState<Person[]>([]);
  const [investigationResults, setInvestigationResults] = useState<any[]>([]);
  const [articleResults, setArticleResults] = useState<any[]>([]);
  const [mediaResults, setMediaResults] = useState<any[]>([]);
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
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    apiClient.getStats().then(setStats).catch(console.error);
  }, []);

  const categories = [
    { id: 'all', name: 'All Categories', color: 'bg-gray-600' },
    { id: 'emails', name: 'Emails', color: 'bg-green-600' },
    { id: 'legal_documents', name: 'Legal Documents', color: 'bg-red-600' },
    { id: 'flight_logs', name: 'Flight Records', color: 'bg-yellow-600' },
    { id: 'testimonies', name: 'Testimonies', color: 'bg-cyan-600' },
    { id: 'financial_records', name: 'Financial', color: 'bg-orange-600' },
    { id: 'general_documents', name: 'General', color: 'bg-blue-600' },
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

    try {
      const data = await apiClient.search(searchTerm, 100);

      if (data.entities) {
        setEntityResults(data.entities);
      }

      if (data.investigations) {
        setInvestigationResults(data.investigations);
      }

      if (data.articles) {
        setArticleResults(data.articles);
      }

      if (data.media) {
        setMediaResults(data.media);
      }

      if (data.documents) {
        const searchResults: SearchResult[] = data.documents.map((doc: any) => ({
          id: doc.id,
          file: doc.filePath,
          filename: doc.fileName,
          category: doc.evidenceType || 'general_documents',
          entities: [],
          dates: [],
          wordCount: doc.wordCount || 0,
          score: doc.score || 0,
          highlights: doc.snippet ? [doc.snippet] : [],
          snippet: doc.snippet,
          filePath: doc.filePath,
          evidenceType: doc.evidenceType,
        }));
        setResults(searchResults);
        setFilteredResults(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
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

    setFilteredResults(filtered);
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find((c) => c.id === category);
    return cat?.color || 'bg-gray-600';
  };

  const formatWordCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
            <Search className="h-6 w-6 text-cyan-400" />
            <span>Global Evidence Search</span>
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
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
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search across all evidence files... (e.g., Trump, Clinton, Epstein, flight logs, emails)"
            className="w-full pl-12 pr-12 py-4 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && !loading && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          {loading && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
            </div>
          )}
        </div>

        <p className="text-gray-400 text-sm mt-2">
          Search across {stats?.totalDocuments?.toLocaleString() || 'thousands of'} evidence files.
          Try names, dates, document types, or key terms.
        </p>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Entity</label>
              <input
                type="text"
                placeholder="e.g., Trump, Epstein, Clinton"
                value={filters.entity}
                onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Min Word Count</label>
              <input
                type="number"
                min="0"
                value={filters.min_word_count}
                onChange={(e) =>
                  setFilters({ ...filters, min_word_count: parseInt(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() =>
                  setFilters({
                    category: 'all',
                    entity: '',
                    date_range: { start: '', end: '' },
                    min_word_count: 0,
                  })
                }
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Results */}
      {entityResults.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-400" />
            Matched Entities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entityResults.map((entity) => (
              <div
                key={entity.id}
                className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 hover:border-cyan-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-white font-medium">{entity.name}</h4>
                    <p className="text-sm text-gray-400">{entity.role || 'Unknown Role'}</p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      (entity.red_flag_rating || 0) > 3
                        ? 'bg-red-900 text-red-200'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      {entity.red_flag_rating || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
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
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Evidence Results {searchTerm && `for "${searchTerm}"`}
            </h3>
            <span className="text-gray-400">
              {filteredResults.length +
                investigationResults.length +
                articleResults.length +
                mediaResults.length}{' '}
              total results
            </span>
          </div>
        </div>

        <div className="divide-y divide-gray-700">
          {/* Investigations Section */}
          {investigationResults.length > 0 &&
            investigationResults.map((inv, index) => (
              <div
                key={`inv-${index}`}
                className="p-6 hover:bg-cyan-900/10 cursor-pointer transition-colors border-l-4 border-purple-500"
                onClick={() => (window.location.href = `/investigations/${inv.uuid}`)}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-600 text-white">
                    Investigation
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300 uppercase`}
                  >
                    {inv.status}
                  </span>
                </div>
                <h4 className="text-white font-medium text-lg mb-2">{inv.title}</h4>
                {inv.snippet && (
                  <div
                    className="text-gray-400 text-sm italic"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inv.snippet) }}
                  />
                )}
              </div>
            ))}

          {/* Articles Section */}
          {articleResults.length > 0 &&
            articleResults.map((art, index) => (
              <div
                key={`art-${index}`}
                className="p-6 hover:bg-orange-900/10 cursor-pointer transition-colors border-l-4 border-orange-500"
                onClick={() =>
                  setSelectedResult({
                    ...art,
                    filename: art.title,
                    category: 'article',
                    highlights: [art.snippet],
                  })
                }
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-600 text-white">
                    Article
                  </span>
                  <span className="text-gray-400 text-sm">
                    {art.source} by {art.author}
                  </span>
                  {art.pubDate && (
                    <span className="text-gray-500 text-xs">
                      {new Date(art.pubDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h4 className="text-white font-medium text-lg mb-2">{art.title}</h4>
                {art.snippet && (
                  <div
                    className="text-gray-400 text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(art.snippet) }}
                  />
                )}
              </div>
            ))}

          {/* Media Section */}
          {mediaResults.length > 0 &&
            mediaResults.map((med, index) => (
              <div
                key={`med-${index}`}
                className="p-6 hover:bg-blue-900/10 cursor-pointer transition-colors border-l-4 border-blue-500"
                onClick={() =>
                  setSelectedResult({
                    ...med,
                    filename: med.title || med.filename,
                    category: 'media',
                    highlights: [med.snippet],
                  })
                }
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                    Media
                  </span>
                  <span className="text-gray-400 text-sm font-mono">{med.fileType}</span>
                </div>
                <h4 className="text-white font-medium text-lg mb-2">{med.title || med.filename}</h4>
                {med.snippet && (
                  <div
                    className="text-gray-400 text-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(med.snippet) }}
                  />
                )}
              </div>
            ))}

          {/* Existing Document Results */}
          {filteredResults.map((result, index) => (
            <div
              key={`doc-${index}`}
              className="p-6 hover:bg-gray-800/30 cursor-pointer transition-colors border-l-4 border-emerald-500"
              onClick={() => setSelectedResult(result)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(result.category)}`}
                    >
                      {categories.find((c) => c.id === result.category)?.name || result.category}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {result.wordCount ? formatWordCount(result.wordCount) : '0'} words
                    </span>
                    <span className="text-cyan-400 text-sm font-medium">Score: {result.score}</span>
                  </div>

                  <h4 className="text-white font-medium text-lg mb-2">{result.filename}</h4>

                  <p className="text-gray-400 text-sm mb-3">{result.file}</p>

                  {result.highlights.length > 0 && (
                    <div className="space-y-1">
                      {result.highlights.slice(0, 3).map((highlight, idx) => (
                        <div key={idx} className="text-gray-300 text-sm flex items-start space-x-2">
                          <span className="mt-1 text-cyan-500">•</span>
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
                </div>

                <div className="ml-4 flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle file preview
                    }}
                    className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle file download
                    }}
                    className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  >
                    <Download className="h-4 w-4" />
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
            <div className="p-12 text-center">
              <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h4 className="text-gray-300 font-medium mb-2">No results found</h4>
              <p className="text-gray-500 mb-4">Try adjusting your search terms or filters</p>
              <p className="text-gray-600 text-sm">
                Search tips: Try different spellings, use fewer keywords, or check entity names
              </p>
            </div>
          )}

        {!searchTerm && (
          <div className="p-12 text-center">
            <Search className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-gray-300 font-medium mb-2">Start your investigation</h4>
            <p className="text-gray-500">
              Enter a search term to begin exploring the evidence archive
            </p>
          </div>
        )}
      </div>

      {/* Result Detail Modal */}
      {selectedResult &&
        createPortal(
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-slate-700">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getCategoryColor(selectedResult.category)}`}
                    >
                      {categories.find((c) => c.id === selectedResult.category)?.name}
                    </span>
                    <h3 className="text-xl font-semibold text-white">{selectedResult.filename}</h3>
                  </div>
                  <CloseButton
                    onClick={() => setSelectedResult(null)}
                    size="sm"
                    label="Close search result"
                    className="border-slate-600 bg-slate-900/70 text-white"
                  />
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">File Path</label>
                    <p className="text-white text-sm font-mono">{selectedResult.file}</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Word Count</label>
                    <p className="text-white">{(selectedResult.wordCount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Search Score</label>
                    <p className="text-cyan-400 font-medium">{selectedResult.score}</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Category</label>
                    <p className="text-white">{selectedResult.category}</p>
                  </div>
                </div>

                {selectedResult.entities.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">Entities Mentioned</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.entities.map((entity, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm"
                        >
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedResult.dates.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">Dates Mentioned</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.dates.map((date, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm flex items-center space-x-2"
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
                    <label className="block text-gray-400 text-sm mb-2">Search Highlights</label>
                    <div className="space-y-2">
                      {selectedResult.highlights.map((highlight, idx) => (
                        <div key={idx} className="p-3 bg-gray-900 rounded-lg">
                          <p className="text-cyan-300 text-sm">{highlight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-700 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedResult(null)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Handle file preview
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors flex items-center space-x-2"
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
