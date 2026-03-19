import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';

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
    return text.replace(rx, '<mark class="bg-yellow-500/40 text-[var(--text-primary)]">$1</mark>');
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
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    },
  );

  return createPortal(
    <div
      id="ArticleViewerModal"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-8"
    >
      {/* Background Backdrop with Hero Image Blur */}
      <div
        className="absolute inset-0 bg-[var(--app-bg)]/90 header-blur-backdrop"
        onClick={onClose}
      />
      {article.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl"
          style={{ backgroundImage: `url(${article.imageUrl})` }}
        />
      )}

      <div className="relative w-full max-w-4xl h-full max-h-[90vh] overflow-hidden bg-[var(--glass-bg-strong)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-[var(--scroll-thumb)] scrollbar-track-transparent">
          {/* Hero Header */}
          <div className="relative h-64 md:h-80 shrink-0 w-full group">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt={article.title}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--glass-bg-strong)] to-[var(--app-bg)] border-b border-[var(--glass-border)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--glass-bg-strong)] via-[var(--glass-bg-strong)]/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold uppercase tracking-wider rounded-[var(--radius-sm)] border border-[var(--accent)]/30 backdrop-blur-sm">
                  {article.publication}
                </span>
                <span className="text-[var(--text-secondary)] text-sm font-medium drop-shadow-[var(--glass-shadow)]">
                  {new Date(article.published_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] leading-tight drop-shadow-[var(--glass-shadow)] text-balance">
                {article.title}
              </h2>
            </div>

            <CloseButton
              onClick={onClose}
              size="md"
              label="Close article viewer"
              className="absolute top-4 right-4 bg-[var(--app-bg)]/40 hover:bg-[var(--app-bg)]/60 text-[var(--text-primary)] border border-[var(--glass-border)] z-10"
            />
          </div>

          <div className="p-6 md:p-10">
            {/* Author & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--glass-bg)] to-[var(--glass-bg-strong)] flex items-center justify-center text-[var(--text-primary)] font-bold text-lg border border-[var(--glass-border)] shadow-inner">
                  {article.author.charAt(0)}
                </div>
                <div>
                  <div className="text-[var(--text-primary)] font-bold text-lg">
                    {article.author}
                  </div>
                  <div className="text-[var(--accent)] text-sm">Investigative Journalist</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
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
                className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--app-bg)] font-medium rounded-[var(--radius-lg)] border-[var(--glass-border)] shadow-[var(--glass-shadow)]"
              />

              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-all shadow-[var(--glass-shadow)] border border-[var(--glass-border)] font-medium group"
                >
                  Read Original Source
                  <ExternalLink
                    size={16}
                    className="group-hover:translate-x-0.5 transition-transform"
                  />
                </a>
              )}
            </div>

            {/* Content */}
            <div
              className="prose prose-invert prose-lg max-w-none prose-p:text-[var(--text-secondary)] prose-headings:text-[var(--text-primary)] prose-a:text-[var(--accent)] hover:prose-a:text-[var(--accent)]/80 prose-strong:text-[var(--text-primary)] prose-blockquote:border-l-[var(--accent)] prose-blockquote:bg-[var(--glass-bg)] prose-blockquote:py-1 prose-blockquote:px-4 prose-img:rounded-[var(--radius-xl)] prose-img:shadow-[var(--glass-shadow)]"
              dangerouslySetInnerHTML={{ __html: content }}
            />

            {/* Fallback for short content/layout */}
            <div className="h-20" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ArticleViewerModal;
