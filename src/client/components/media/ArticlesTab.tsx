import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Newspaper, Search, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import ArticleViewerModal from './ArticleViewerModal';
import { Article } from './ArticleCard';
import { cn } from '@client/utils/cn';
import styles from './ArticlesTab.module.css';

interface PublicationStats {
  name: string;
  count: number;
  avgRedFlag: number;
}

type ArticleApiItem = Record<string, unknown>;

type ArticleContent = Article & {
  content: string;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

export const ArticlesTab: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPublication, setSelectedPublication] = useState<string | null>(null);
  const [viewerArticle, setViewerArticle] = useState<ArticleContent | null>(null);
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
          const normalized: ArticleContent[] = data.map((item: ArticleApiItem) => ({
            id: asNumber(item.id),
            title: asString(item.title),
            url: asString(item.link ?? item.url),
            author: asString(item.author, 'Unknown'),
            publication: asString(item.source ?? item.publication, 'Unknown'),
            published_date: asString(item.pub_date ?? item.published_date),
            summary: asString(item.description ?? item.summary),
            content: asString(item.content ?? item.description ?? item.summary),
            tags: asString(item.tags),
            redFlagRating: asNumber(item.redFlagRating, 0),
            imageUrl:
              item.image_url == null && item.imageUrl == null
                ? null
                : asString(item.image_url ?? item.imageUrl),
            reading_time:
              item.reading_time == null && item.readingTime == null
                ? undefined
                : asString(item.reading_time ?? item.readingTime),
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

  const mobilePublicationClassName = (isActive: boolean, isFirst = false) =>
    cn(
      styles.mobilePublicationOption,
      isActive ? styles.mobilePublicationOptionActive : styles.mobilePublicationOptionInactive,
      !isFirst && styles.mobilePublicationOptionBordered,
    );

  const sidebarPublicationClassName = (isActive: boolean) =>
    cn(
      styles.sidebarPublicationButton,
      isActive ? styles.sidebarPublicationButtonActive : styles.sidebarPublicationButtonInactive,
    );

  return (
    <div className={styles.container}>
      {/* Header with controls */}
      <div className={styles.header}>
        {/* Mobile Publication Dropdown */}
        <div className={styles.mobileOnly}>
          <button
            onClick={() => setShowPublicationDropdown(!showPublicationDropdown)}
            className={styles.mobileDropdownButton}
          >
            <span className={styles.mobileDropdownLabel}>
              <Newspaper className={styles.smallIcon} />
              {selectedPublication || 'All Publications'}
            </span>
            {showPublicationDropdown ? (
              <ChevronUp className={styles.smallIcon} />
            ) : (
              <ChevronDown className={styles.smallIcon} />
            )}
          </button>
          {showPublicationDropdown && (
            <div className={styles.mobileDropdownMenu}>
              <button
                className={mobilePublicationClassName(!selectedPublication, true)}
                onClick={() => {
                  setSelectedPublication(null);
                  setShowPublicationDropdown(false);
                }}
              >
                <span>All Publications</span>
                <span className={styles.optionCount}>{articles.length}</span>
              </button>
              {publications.map((pub) => (
                <button
                  key={pub.name}
                  className={mobilePublicationClassName(selectedPublication === pub.name)}
                  onClick={() => {
                    setSelectedPublication(pub.name);
                    setShowPublicationDropdown(false);
                  }}
                >
                  <span className={styles.truncate}>{pub.name}</span>
                  <span className={styles.optionCount}>{pub.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className={styles.searchShell}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Desktop Sort Controls */}
        <div className={styles.desktopControls}>
          <span className={styles.sortLabel}>Sort by:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'date' | 'redFlag')}
            className={styles.sortSelect}
          >
            <option value="redFlag">Red Flag Rating</option>
            <option value="date">Date Published</option>
          </select>

          <div className={styles.articleCount}>
            {filteredArticles.length} of {articles.length} articles
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Publications sidebar - Hidden on mobile */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Publications</h3>
          <div className={styles.sidebarList}>
            <button
              className={sidebarPublicationClassName(!selectedPublication)}
              onClick={() => setSelectedPublication(null)}
            >
              <span className={styles.truncate}>All Publications</span>
              <span className={styles.sidebarCountPill}>{articles.length}</span>
            </button>
            {publications.map((pub) => (
              <button
                key={pub.name}
                className={sidebarPublicationClassName(selectedPublication === pub.name)}
                onClick={() => setSelectedPublication(pub.name)}
                title={pub.name}
              >
                <span className={styles.truncate}>{pub.name}</span>
                <span className={styles.sidebarCountPill}>{pub.count}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className={styles.main}>
          {loading ? (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
            </div>
          ) : null}

          {/* Articles Grid */}
          <div className={styles.gridScroller}>
            {filteredArticles.length === 0 ? (
              <div className={styles.emptyState}>
                <Newspaper className={styles.emptyIcon} />
                <p>No articles found</p>
              </div>
            ) : (
              <div className={styles.articleGrid}>
                {filteredArticles.map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.articleCard}
                  >
                    {/* Hero Image */}
                    <div className={styles.hero}>
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className={styles.heroImage}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.heroFallback}>
                          <Newspaper className={styles.heroFallbackIcon} />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className={styles.heroOverlay} />
                      {/* Red flag badge */}
                      {article.redFlagRating > 0 && (
                        <div className={styles.redFlagBadge}>
                          {'🚩'.repeat(Math.min(article.redFlagRating, 5))}
                        </div>
                      )}
                      {/* Publication badge */}
                      <div className={styles.publicationBadgeWrap}>
                        <span className={styles.publicationBadge}>{article.publication}</span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className={styles.cardContent}>
                      <h3 className={styles.cardTitle}>{article.title}</h3>
                      <p className={styles.cardSummary}>
                        {article.summary || 'No summary available.'}
                      </p>

                      {/* Author and meta */}
                      <div className={styles.cardMeta}>
                        <div className={styles.authorBlock}>
                          <div className={styles.authorAvatar}>
                            {article.author
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2) || '?'}
                          </div>
                          <div>
                            <div className={styles.authorName}>{article.author || 'Unknown'}</div>
                            <div className={styles.publishedDate}>
                              {formatDate(article.published_date)}
                            </div>
                          </div>
                        </div>
                        {article.reading_time && (
                          <div className={styles.readingTime}>
                            <Clock className={styles.readingTimeIcon} />
                            {article.reading_time}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {article.tags && (
                        <div className={styles.tagList}>
                          {article.tags
                            .split(',')
                            .slice(0, 4)
                            .map((tag, i) => (
                              <span key={i} className={styles.tag}>
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
        <div className={styles.loadMoreFooter}>
          <button onClick={handleLoadMore} disabled={loading} className={styles.loadMoreButton}>
            {loading ? (
              <>
                <div className={styles.buttonSpinner} />
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
