import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Badge,
  Button,
  Icon,
  MediaBrowserCount,
  MediaBrowserDropdown,
  MediaBrowserDropdownItem,
  MediaBrowserEmptyState,
  MediaBrowserHeader,
  MediaBrowserMobileTrigger,
  MediaBrowserPanel,
  MediaBrowserSearch,
  MediaBrowserSearchInput,
  MediaBrowserShell,
  MediaBrowserSidebar,
  MediaBrowserSidebarItem,
  MediaBrowserSidebarTitle,
  MediaBrowserStatus,
  MediaBrowserToolbar,
  MediaBrowserTriggerLabel,
  Select,
  Spinner,
  Surface,
} from '@design-system';
import ArticleViewerModal from './ArticleViewerModal';
import { Article } from './ArticleCard';

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
    async (pageNum: number, isReset = false) => {
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
        } else if (isReset) {
          setArticles([]);
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
    setArticles([]);
    setPage(1);
    fetchArticles(1, true);
  }, [searchTerm, selectedPublication, sortOrder, fetchArticles]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };

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
    <MediaBrowserShell className="soft-glass-panel-strong">
      <MediaBrowserHeader className="app-header-glass">
        <div className="relative md:hidden">
          <MediaBrowserMobileTrigger onClick={() => setShowPublicationDropdown((open) => !open)}>
            <MediaBrowserTriggerLabel>
              <Icon name="Newspaper" size="sm" />
              {selectedPublication || 'All Publications'}
            </MediaBrowserTriggerLabel>
            <Icon name={showPublicationDropdown ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </MediaBrowserMobileTrigger>
          {showPublicationDropdown ? (
            <MediaBrowserDropdown>
              <MediaBrowserDropdownItem
                active={!selectedPublication}
                onClick={() => {
                  setSelectedPublication(null);
                  setShowPublicationDropdown(false);
                }}
              >
                <span>All Publications</span>
                <span className="text-xs opacity-70">{articles.length}</span>
              </MediaBrowserDropdownItem>
              {publications.map((publication) => (
                <MediaBrowserDropdownItem
                  key={publication.name}
                  active={selectedPublication === publication.name}
                  onClick={() => {
                    setSelectedPublication(publication.name);
                    setShowPublicationDropdown(false);
                  }}
                >
                  <span className="truncate">{publication.name}</span>
                  <span className="text-xs opacity-70">{publication.count}</span>
                </MediaBrowserDropdownItem>
              ))}
            </MediaBrowserDropdown>
          ) : null}
        </div>

        <div className="flex w-full gap-2 md:w-64">
          <MediaBrowserSearch className="relative flex-1">
            <Icon
              name="Search"
              size="sm"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <MediaBrowserSearchInput
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-sm placeholder-[var(--text-muted)]"
            />
          </MediaBrowserSearch>
        </div>

        <MediaBrowserToolbar className="hidden md:flex">
          <MediaBrowserStatus>Sort by:</MediaBrowserStatus>
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'date' | 'redFlag')}
            options={[
              { value: 'redFlag', label: 'Red Flag Rating' },
              { value: 'date', label: 'Date Published' },
            ]}
            className="min-h-[var(--control-height-compact)] bg-[var(--glass-bg)] px-[var(--space-2)] text-xs"
          />
          <MediaBrowserStatus>
            {filteredArticles.length} of {articles.length} articles
          </MediaBrowserStatus>
        </MediaBrowserToolbar>
      </MediaBrowserHeader>

      <div className="relative flex flex-1 overflow-hidden">
        <MediaBrowserSidebar>
          <MediaBrowserSidebarTitle>Publications</MediaBrowserSidebarTitle>
          <div className="flex-1 overflow-y-auto">
            <MediaBrowserSidebarItem
              active={!selectedPublication}
              onClick={() => setSelectedPublication(null)}
            >
              <span className="truncate">All Publications</span>
              <MediaBrowserCount>{articles.length}</MediaBrowserCount>
            </MediaBrowserSidebarItem>
            {publications.map((publication) => (
              <MediaBrowserSidebarItem
                key={publication.name}
                active={selectedPublication === publication.name}
                onClick={() => setSelectedPublication(publication.name)}
                title={publication.name}
              >
                <span className="truncate">{publication.name}</span>
                <MediaBrowserCount>{publication.count}</MediaBrowserCount>
              </MediaBrowserSidebarItem>
            ))}
          </div>
        </MediaBrowserSidebar>

        <MediaBrowserPanel className="relative flex flex-1 flex-col bg-[var(--glass-bg)]">
          {loading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--glass-bg)] backdrop-blur-sm">
              <Spinner label="Loading articles" />
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {filteredArticles.length === 0 ? (
              <MediaBrowserEmptyState
                icon="Newspaper"
                title="No articles found"
                description="Try a different publication or search term."
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredArticles.map((article) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] transition-all duration-300 hover:border-[var(--accent)]/50 hover:shadow-[var(--glass-shadow)]"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,var(--bg-elevated),var(--bg-surface))]">
                      {article.imageUrl ? (
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Icon name="Newspaper" size="xl" className="text-[var(--text-primary)]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent opacity-60" />
                      {article.redFlagRating > 0 ? (
                        <div className="absolute right-3 top-3">
                          <Badge tone="danger">Risk {article.redFlagRating}</Badge>
                        </div>
                      ) : null}
                      <div className="absolute bottom-3 left-3">
                        <Badge tone="accent">{article.publication}</Badge>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                        {article.title}
                      </h3>
                      <p className="mb-4 line-clamp-2 text-sm text-[var(--text-muted)]">
                        {article.summary || 'No summary available.'}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Surface className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-secondary))] text-xs font-bold text-[var(--text-primary)]">
                            {article.author
                              ?.split(' ')
                              .map((name) => name[0])
                              .join('')
                              .slice(0, 2) || '?'}
                          </Surface>
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {article.author || 'Unknown'}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {formatDate(article.published_date)}
                            </div>
                          </div>
                        </div>
                        {article.reading_time ? (
                          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Icon name="Clock" size="xs" />
                            {article.reading_time}
                          </div>
                        ) : null}
                      </div>

                      {article.tags ? (
                        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[var(--glass-border)] pt-4">
                          {article.tags
                            .split(',')
                            .slice(0, 4)
                            .map((tag, index) => (
                              <Badge key={index} tone="neutral" size="sm">
                                {tag.trim()}
                              </Badge>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </MediaBrowserPanel>
      </div>

      {hasMore ? (
        <div className="flex justify-center border-t border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/50 p-4">
          <Button onClick={handleLoadMore} disabled={loading} variant="secondary">
            {loading ? <Spinner label="Loading" /> : 'Load More Articles'}
          </Button>
        </div>
      ) : null}

      <ArticleViewerModal
        article={viewerArticle}
        highlight={searchTerm}
        onClose={() => setViewerArticle(null)}
      />
    </MediaBrowserShell>
  );
};

export default ArticlesTab;
