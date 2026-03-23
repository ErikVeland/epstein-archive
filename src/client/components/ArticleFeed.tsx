import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Article, ArticleFeedService } from '../services/articleFeedService';
import { ExternalLink, Calendar, Tag, RefreshCw, AlertCircle } from 'lucide-react';

interface ArticleFeedProps {
  feedUrl: string;
  tagFilter?: string;
  maxArticles?: number;
}

export const ArticleFeed: React.FC<ArticleFeedProps> = ({
  feedUrl,
  tagFilter = 'epstein',
  maxArticles = 6,
}) => {
  const feedService = new ArticleFeedService();

  const {
    data,
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery<{ articles: Article[]; fetchedAt: Date }>({
    queryKey: ['article-feed', feedUrl, tagFilter, maxArticles],
    queryFn: async () => {
      const fetchedArticles = await feedService.fetchArticles(feedUrl, tagFilter);
      return { articles: fetchedArticles.slice(0, maxArticles), fetchedAt: new Date() };
    },
  });

  const articles = data?.articles ?? [];
  const lastUpdated = data?.fetchedAt ?? null;
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to fetch articles'
    : null;

  const formatDate = (dateString: string): string => {
    return feedService.formatPubDate(dateString);
  };

  const truncateText = (text: string, maxLength: number = 150): string => {
    return feedService.truncateText(text, maxLength);
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Latest Articles</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--accent)]"></div>
            <span className="text-sm text-[var(--text-muted)]">Loading articles...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(maxArticles)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4 animate-pulse"
            >
              <div className="h-4 bg-[var(--glass-bg-highlight)] rounded mb-2"></div>
              <div className="h-3 bg-[var(--glass-bg-highlight)] rounded mb-2"></div>
              <div className="h-3 bg-[var(--glass-bg-highlight)] rounded mb-2"></div>
              <div className="h-2 bg-[var(--glass-bg-highlight)] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Latest Articles</h2>
          <button
            onClick={() => void refetch()}
            className="flex items-center space-x-2 px-3 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
        <div className="bg-red-900 border border-red-700 rounded-[var(--radius-lg)] p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200 font-medium">Failed to load articles</span>
          </div>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Latest Articles</h2>
          <button
            onClick={() => void refetch()}
            className="flex items-center space-x-2 px-3 py-2 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        <div className="text-center py-8">
          <Tag className="w-12 h-12 text-[var(--text-primary)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-muted)] mb-2">No articles found</h3>
          <p className="text-[var(--text-muted)]">
            {tagFilter ? (
              <>
                No articles found with "{tagFilter}" in title, description, or tags.
                <br />
                <span className="text-sm">Try refreshing or check back later for new content.</span>
              </>
            ) : (
              'No articles available'
            )}
          </p>
          {error && (
            <div className="mt-4 text-sm text-red-400 bg-red-900 bg-opacity-20 rounded-[var(--radius-lg)] p-3">
              <p className="font-medium">Error: {error}</p>
              <p className="text-red-300">
                This might be due to network issues or the feed being temporarily unavailable.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-lg)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Latest Articles</h2>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-[var(--text-muted)]">
              Updated {formatDate(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => void refetch()}
            className="flex items-center space-x-2 px-3 py-2 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {articles.map((article, index) => (
          <article
            key={article.guid || index}
            className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4 hover:bg-[var(--glass-bg-highlight)] transition-colors group"
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors">
                {article.title}
              </h3>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors ml-2 flex-shrink-0"
                title="Read full article"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-3 line-clamp-3">
              {truncateText(article.description)}
            </p>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex items-center space-x-2">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(article.pubDate)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>{article.author}</span>
              </div>
            </div>

            {article.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {article.categories.slice(0, 3).map((category, catIndex) => (
                  <span
                    key={catIndex}
                    className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] text-xs rounded"
                  >
                    {category}
                  </span>
                ))}
                {article.categories.length > 3 && (
                  <span className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-muted)] text-xs rounded">
                    +{article.categories.length - 3}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className="mt-6 text-center">
        <a
          href={feedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <span>View all articles on Substack</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
