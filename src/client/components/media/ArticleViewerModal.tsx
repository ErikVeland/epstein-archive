import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import styles from './ArticleViewerModal.module.css';

interface ArticleContent {
  id: number;
  title: string;
  author: string;
  publication: string;
  published_date: string;
  content: string;
  summary?: string;
  imageUrl?: string | null;
  url?: string;
}

interface Props {
  article?: ArticleContent | null;
  highlight?: string;
  onClose: () => void;
}

function highlightText(text: string, term?: string) {
  if (!term || !term.trim()) return text;
  try {
    const rx = new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return text.replace(rx, `<mark class="${styles.highlightMark}">$1</mark>`);
  } catch {
    return text;
  }
}

export const ArticleViewerModal: React.FC<Props> = ({ article, highlight, onClose }) => {
  useScrollLock(!!article);
  if (!article) return null;
  const content = DOMPurify.sanitize(
    highlightText(article.content || article.summary || '', highlight),
    {
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
    },
  );

  return createPortal(
    <div id="ArticleViewerModal" className={styles.overlay}>
      {/* Background Backdrop with Hero Image Blur */}
      <div className={styles.backdrop} onClick={onClose} />
      {article.imageUrl && (
        <div className={styles.heroBlur} style={{ backgroundImage: `url(${article.imageUrl})` }} />
      )}

      <div className={styles.modal}>
        <div className={styles.scrollFrame}>
          {/* Hero Header */}
          <div className={styles.heroSection}>
            {article.imageUrl ? (
              <img src={article.imageUrl} className={styles.heroImage} alt={article.title} />
            ) : (
              <div className={styles.heroFallback} />
            )}
            <div className={styles.heroOverlay} />

            <div className={styles.heroContent}>
              <div className={styles.heroMetaRow}>
                <span className={styles.publicationBadge}>{article.publication}</span>
                <span className={styles.publishedDate}>
                  {new Date(article.published_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h2 className={styles.title}>{article.title}</h2>
            </div>

            <CloseButton
              onClick={onClose}
              size="md"
              label="Close article viewer"
              className={styles.closeButton}
            />
          </div>

          <div className={styles.body}>
            {/* Author & Actions */}
            <div className={styles.authorSection}>
              <div className={styles.authorRow}>
                <div className={styles.authorAvatar}>{article.author.charAt(0)}</div>
                <div>
                  <div className={styles.authorName}>{article.author}</div>
                  <div className={styles.authorRole}>Investigative Journalist</div>
                </div>
              </div>
            </div>

            <div className={styles.actionRow}>
              {/* Add to Investigation Button */}
              <AddToInvestigationButton
                item={{
                  id: String(article.id),
                  title: article.title,
                  description: article.summary || article.content.substring(0, 100),
                  type: 'document', // Assuming article fits document type
                  sourceId: String(article.id),
                }}
                variant="button"
                className={styles.investigationButton}
              />

              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sourceLink}
                >
                  Read Original Source
                  <ExternalLink size={16} className={styles.sourceLinkIcon} />
                </a>
              )}
            </div>

            {/* Content */}
            <div className={styles.articleContent} dangerouslySetInnerHTML={{ __html: content }} />

            {/* Fallback for short content/layout */}
            <div className={styles.bottomSpacer} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ArticleViewerModal;
