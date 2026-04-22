import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { MobileStackHeader } from '../components/layout/MobileStackHeader';
import { AddToInvestigationButton } from '../components/common/AddToInvestigationButton';
import panelStyles from '../components/media/ArticleViewerModal.module.css';
import styles from './ArticleDetailPage.module.css';

interface ArticleDetail {
  id: number;
  title: string;
  author: string;
  publication: string;
  published_date: string;
  content: string;
  summary?: string;
  imageUrl?: string | null;
  image_url?: string | null;
  url?: string;
}

export const ArticleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: article,
    isLoading,
    isError,
  } = useQuery<ArticleDetail>({
    queryKey: ['article', id],
    queryFn: async () => {
      const res = await fetch(`/api/articles/${id}`);
      if (!res.ok) throw new Error('Article not found');
      return (await res.json()) as ArticleDetail;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className={styles.page}>
        <MobileStackHeader title="Article" onBack={() => navigate(-1)} />
        <div className={styles.stateMessage}>Loading article…</div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className={styles.page}>
        <MobileStackHeader title="Article" onBack={() => navigate(-1)} />
        <div className={styles.stateMessage}>Article not found.</div>
      </div>
    );
  }

  const imageUrl = article.imageUrl ?? article.image_url ?? null;
  const rawContent = article.content || article.summary || '';
  // Content is sanitized with DOMPurify — safe for dangerouslySetInnerHTML
  const sanitizedContent = DOMPurify.sanitize(rawContent, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'b',
      'i',
      'em',
      'strong',
      'mark',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['style', 'script'],
  });

  const publishedDate = new Date(article.published_date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={styles.page}>
      <MobileStackHeader
        title={article.publication || 'Article'}
        subtitle={publishedDate}
        onBack={() => navigate(-1)}
        breadcrumbItems={[
          { label: 'Articles', onClick: () => navigate('/media/articles') },
          { label: article.publication || 'Article' },
        ]}
      />

      <div className={styles.body}>
        {/* Hero */}
        <div className={panelStyles.heroSection}>
          {imageUrl ? (
            <img src={imageUrl} className={panelStyles.heroImage} alt={article.title} />
          ) : (
            <div className={panelStyles.heroFallback} />
          )}
          <div className={panelStyles.heroOverlay} />

          <div className={panelStyles.heroContent}>
            <div className={panelStyles.heroMetaRow}>
              <span className={panelStyles.publicationBadge}>{article.publication}</span>
              <span className={panelStyles.publishedDate}>{publishedDate}</span>
            </div>
            <h2 className={panelStyles.title}>{article.title}</h2>
          </div>
        </div>

        <div className={panelStyles.body}>
          {/* Author */}
          <div className={panelStyles.authorSection}>
            <div className={panelStyles.authorRow}>
              <div className={panelStyles.authorAvatar}>{article.author.charAt(0)}</div>
              <div>
                <div className={panelStyles.authorName}>{article.author}</div>
                <div className={panelStyles.authorRole}>Investigative Journalist</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={panelStyles.actionRow}>
            <AddToInvestigationButton
              item={{
                id: String(article.id),
                title: article.title,
                description: article.summary || rawContent.substring(0, 100),
                type: 'document',
                sourceId: String(article.id),
              }}
              variant="button"
              className={panelStyles.investigationButton}
            />
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className={panelStyles.sourceLink}
              >
                Read Original Source
                <ExternalLink size={16} className={panelStyles.sourceLinkIcon} />
              </a>
            )}
          </div>

          {/* Content is DOMPurify-sanitized above */}
          <div
            className={panelStyles.articleContent}
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          <div className={panelStyles.bottomSpacer} />
        </div>
      </div>
    </div>
  );
};
