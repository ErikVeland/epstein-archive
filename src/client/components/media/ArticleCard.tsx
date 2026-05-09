import React from 'react';
import Icon from '@client/components/common/Icon';
import LazyImage from '../common/LazyImage';
import { cn } from '@client/utils/cn';
import styles from './ArticleCard.module.css';

export interface Article {
  id: number;
  title: string;
  url: string;
  author: string;
  publication: string;
  published_date: string;
  summary: string;
  tags: string;
  redFlagRating: number;
  imageUrl?: string | null;
  authorAvatar?: string;
  readingTime?: string;
  reading_time?: string; // From API
  premium?: boolean;
}

interface ArticleCardProps {
  article: Article;
  onClick: (article: Article) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  // Generate a consistent placeholder gradient if no image is present
  const getPlaceholderGradient = (id: number) => {
    const gradients = [
      styles.gradientBlue,
      styles.gradientPurple,
      styles.gradientCyan,
      styles.gradientEmerald,
      styles.gradientRed,
    ];
    return gradients[id % gradients.length];
  };

  return (
    <div className={styles.card} onClick={() => onClick(article)}>
      {/* Hero Image with Zoom Effect */}
      <div className={cn(styles.heroImage, getPlaceholderGradient(article.id))}>
        {article.imageUrl && (
          <LazyImage src={article.imageUrl} alt={article.title} className={styles.heroImg} />
        )}
        {/* Gradient Overlay: Dark at bottom for text readability */}
        <div className={styles.gradientOverlay} />
      </div>

      {/* Content Overlay */}
      <div className={styles.content}>
        {/* Publication & Date Badge */}
        <div className={styles.badgeRow}>
          <span className={styles.publicationBadge}>{article.publication}</span>
          <span className={styles.dateChip}>
            <Icon name="Calendar" className={styles.metaIcon} />
            {new Date(article.published_date).toLocaleDateString()}
          </span>
        </div>

        {/* Headline */}
        <h3 className={styles.headline}>{article.title}</h3>

        {/* Summary (Hidden on mobile, visible on hover/desktop) */}
        <p className={styles.summary}>{article.summary}</p>

        {/* Footer: Author & Read Time */}
        <div className={styles.footer}>
          <div className={styles.authorInfo}>
            {article.authorAvatar ? (
              <img
                src={article.authorAvatar}
                alt={article.author}
                loading="lazy"
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>
                <Icon name="User" className={styles.avatarIcon} />
              </div>
            )}
            <div className={styles.authorMeta}>
              <span className={styles.authorName}>{article.author}</span>
              <span className={styles.readTime}>
                <Icon name="Clock" className={styles.metaIcon} />{' '}
                {article.readingTime || '5 min read'}
              </span>
            </div>
          </div>

          <div className={styles.arrowButton}>
            <Icon name="ArrowUpRight" className={styles.arrowIcon} />
          </div>
        </div>
      </div>

      {/* Red Flag Badge (Top Right) */}
      {article.redFlagRating > 0 && (
        <div className={styles.redFlagBadge}>
          <span className={styles.redFlagIconRow}>
            {Array.from({ length: Math.min(article.redFlagRating, 5) }).map((_, index) => (
              <Icon key={index} name="Flag" className={styles.redFlagIcon} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
};
