import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Article, ArticleFeedService } from '../services/articleFeedService';
import { ExternalLink, Calendar, Tag, RefreshCw, AlertCircle } from 'lucide-react';
import styles from './ArticleFeed.module.css';

import { Button } from '../design-system/lib';

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
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Latest Articles</h2>
          <div className={styles.loadingMeta}>
            <div className={styles.spinner} />
            <span className={styles.headerMeta}>Loading articles...</span>
          </div>
        </div>
        <div className={styles.articleGrid}>
          {[...Array(maxArticles)].map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonLineLarge} />
              <div className={styles.skeletonLineMedium} />
              <div className={styles.skeletonLineMedium} />
              <div className={styles.skeletonLineSmall} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Latest Articles</h2>
          <Button unstyled onClick={() => void refetch()} className={styles.retryButton}>
            <RefreshCw className={styles.buttonIcon} />
            <span>Retry</span>
          </Button>
        </div>
        <div className={styles.errorCard}>
          <div className={styles.errorHeader}>
            <AlertCircle className={styles.errorIcon} />
            <span className={styles.errorTitle}>Failed to load articles</span>
          </div>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Latest Articles</h2>
          <Button unstyled onClick={() => void refetch()} className={styles.refreshButton}>
            <RefreshCw className={styles.buttonIcon} />
            <span>Refresh</span>
          </Button>
        </div>
        <div className={styles.emptyState}>
          <Tag className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>No articles found</h3>
          <p className={styles.emptyText}>
            {tagFilter ? (
              <>
                No articles found with "{tagFilter}" in title, description, or tags.
                <br />
                <span className={styles.emptyTextSmall}>
                  Try refreshing or check back later for new content.
                </span>
              </>
            ) : (
              'No articles available'
            )}
          </p>
          {error && (
            <div className={styles.emptyErrorCard}>
              <p className={styles.emptyErrorTitle}>Error: {error}</p>
              <p className={styles.emptyErrorText}>
                This might be due to network issues or the feed being temporarily unavailable.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Latest Articles</h2>
        <div className={styles.headerActions}>
          {lastUpdated && (
            <span className={styles.headerMeta}>
              Updated {formatDate(lastUpdated.toISOString())}
            </span>
          )}
          <Button unstyled onClick={() => void refetch()} className={styles.refreshButton}>
            <RefreshCw className={styles.buttonIcon} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      <div className={styles.articleGrid}>
        {articles.map((article, index) => (
          <article key={article.guid || index} className={styles.articleCard}>
            <div className={styles.articleHeader}>
              <h3 className={styles.articleTitle}>{article.title}</h3>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.articleLink}
                title="Read full article"
              >
                <ExternalLink className={styles.buttonIcon} />
              </a>
            </div>

            <p className={styles.articleDescription}>{truncateText(article.description)}</p>

            <div className={styles.articleMeta}>
              <div className={styles.metaGroup}>
                <Calendar className={styles.metaIcon} />
                <span>{formatDate(article.pubDate)}</span>
              </div>
              <div className={styles.metaGroup}>
                <span>{article.author}</span>
              </div>
            </div>

            {article.categories.length > 0 && (
              <div className={styles.categoryList}>
                {article.categories.slice(0, 3).map((category, catIndex) => (
                  <span key={catIndex} className={styles.categoryChip}>
                    {category}
                  </span>
                ))}
                {article.categories.length > 3 && (
                  <span className={`${styles.categoryChip} ${styles.categoryChipMuted}`}>
                    +{article.categories.length - 3}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <div className={styles.footerLinkWrap}>
        <a href={feedUrl} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
          <span>View all articles on Substack</span>
          <ExternalLink className={styles.buttonIcon} />
        </a>
      </div>
    </div>
  );
};
