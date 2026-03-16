import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Newspaper, Search, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import ArticleViewerModal from './ArticleViewerModal';
import { Article } from './ArticleCard';

interface PublicationStats {
  name: string;
  count: number;
  avgRedFlag: number;
}

export const ArticlesTab: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPublication, setSelectedPublication] = useState<string | null>(null);
  const [viewerArticle, setViewerArticle] = useState<any | null>(null);
  const [showPublicationDropdown, setShowPublicationDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState<'date' | 'redFlag'>('redFlag');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchArticles = useCallback(
    async (pageNum: number, isReset: boolean = false) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '12',
          sort: sortOrder,
        });

        if (searchTerm) params.append('search', searchTerm);
        if (selectedPublication) params.append('publication', selectedPublication);

        const response = await fetch(`/api/articles?${params.toString()}`);

        if (!response.ok) {
          console.warn('Articles API not available, using empty array');
          if (isReset) setArticles([]);
          return;
        }

        const { data, pagination } = await response.json();

        if (Array.isArray(data)) {
          // Normalize API response
          const normalized = data.map((item: any) => ({
            id: item.id,
            title: item.title,
            url: item.link || item.url,
            author: item.author || 'Unknown',
            publication: item.source || item.publication || 'Unknown',
            published_date: item.pub_date || item.published_date || '',
            summary: item.description || item.summary || '',
            tags: item.tags || '',
            redFlagRating: item.redFlagRating ?? 0,
            imageUrl: item.image_url || item.imageUrl || null,
            reading_time: item.reading_time || item.readingTime || null,
          }));

          setArticles((prev) => (isReset ? normalized : [...prev, ...normalized]));
          setHasMore(Math.ceil(pagination.total / pagination.limit) > pageNum);
        } else {
          if (isReset) setArticles([]);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
        if (isReset) setArticles([]);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedPublication, sortOrder],
  );

  useEffect(() => {
    // Reset and fetch when filters change
    setArticles([]);
    setPage(1);
    fetchArticles(1, true);
  }, [searchTerm, selectedPublication, sortOrder, fetchArticles]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };

  // Calculate publication stats (like albums)
  const publications = useMemo((): PublicationStats[] => {
    const pubMap = new Map<string, { count: number; totalRedFlag: number }>();
    for (const article of articles) {
      const pub = article.publication || 'Unknown';
      const existing = pubMap.get(pub) || { count: 0, totalRedFlag: 0 };
      pubMap.set(pub, {
        count: existing.count + 1,
        totalRedFlag: existing.totalRedFlag + (article.redFlagRating || 0),
      });
    }
    return Array.from(pubMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgRedFlag: stats.count > 0 ? stats.totalRedFlag / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  // Client-side filtering is no longer needed as it's done server-side
  // But we keep the sorting logic if we want to re-sort fetched items,
  // though typically server-side sort is preferred.
  // We'll trust the server order for now or just return 'articles' directly
  // since we reset on sort change.
  const filteredArticles = articles;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header with controls */}
      <div className="bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Publication Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setShowPublicationDropdown(!showPublicationDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm h-8"
          >
            <span className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              {selectedPublication || 'All Publications'}
            </span>
            {showPublicationDropdown ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showPublicationDropdown && (
            <div className="absolute left-3 right-3 mt-1 dropdown-surface z-30 max-h-60 overflow-y-auto">
              <button
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${!selectedPublication ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => {
                  setSelectedPublication(null);
                  setShowPublicationDropdown(false);
                }}
              >
                <span>All Publications</span>
                <span className="text-xs opacity-70">{articles.length}</span>
              </button>
              {publications.map((pub) => (
                <button
                  key={pub.name}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-slate-700/50 ${selectedPublication === pub.name ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                  onClick={() => {
                    setSelectedPublication(pub.name);
                    setShowPublicationDropdown(false);
                  }}
                >
                  <span className="truncate">{pub.name}</span>
                  <span className="text-xs opacity-70">{pub.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="w-full md:w-64 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 pl-9 pr-3 py-2 md:py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-all h-8"
            />
          </div>
        </div>

        {/* Desktop Sort Controls */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Sort by:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'date' | 'redFlag')}
            className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 h-8"
          >
            <option value="redFlag">Red Flag Rating</option>
            <option value="date">Date Published</option>
          </select>

          <div className="text-xs text-slate-500">
            {filteredArticles.length} of {articles.length} articles
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Publications sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
            Publications
          </h3>
          <div className="flex-1 overflow-y-auto">
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${!selectedPublication ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
              onClick={() => setSelectedPublication(null)}
            >
              <span className="truncate">All Publications</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {articles.length}
              </span>
            </button>
            {publications.map((pub) => (
              <button
                key={pub.name}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedPublication === pub.name ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
                onClick={() => setSelectedPublication(pub.name)}
                title={pub.name}
              >
                <span className="truncate">{pub.name}</span>
                <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {pub.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : null}

          {/* Articles Grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {filteredArticles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Newspaper className="w-12 h-12 mb-2 opacity-50" />
                <p>No articles found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredArticles.map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
                  >
                    {/* Hero Image */}
                    <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper className="w-16 h-16 text-slate-700" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                      {/* Red flag badge */}
                      {article.redFlagRating > 0 && (
                        <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                          {'🚩'.repeat(Math.min(article.redFlagRating, 5))}
                        </div>
                      )}
                      {/* Publication badge */}
                      <div className="absolute bottom-3 left-3">
                        <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm text-cyan-400 text-xs font-semibold rounded-full border border-cyan-500/30">
                          {article.publication}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      <h3 className="text-white font-bold text-lg leading-tight group-hover:text-cyan-400 transition-colors mb-2 line-clamp-2">
                        {article.title}
                      </h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mb-4">
                        {article.summary || 'No summary available.'}
                      </p>

                      {/* Author and meta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {article.author
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2) || '?'}
                          </div>
                          <div>
                            <div className="text-sm text-white font-medium">
                              {article.author || 'Unknown'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {formatDate(article.published_date)}
                            </div>
                          </div>
                        </div>
                        {article.reading_time && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {article.reading_time}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {article.tags && (
                        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-800">
                          {article.tags
                            .split(',')
                            .slice(0, 4)
                            .map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700 transition-colors"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {hasMore && (
        <div className="p-4 flex justify-center border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Articles'
            )}
          </button>
        </div>
      )}

      <ArticleViewerModal
        article={viewerArticle}
        highlight={searchTerm}
        onClose={() => setViewerArticle(null)}
      />
    </div>
  );
};

export default ArticlesTab;
