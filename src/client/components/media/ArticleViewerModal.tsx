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
    return text.replace(rx, '<mark class="bg-yellow-500/40 text-white">$1</mark>');
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
      <div className="absolute inset-0 bg-black/90 header-blur-backdrop" onClick={onClose} />
      {article.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl"
          style={{ backgroundImage: `url(${article.imageUrl})` }}
        />
      )}

      <div className="relative w-full max-w-4xl h-full max-h-[90vh] overflow-hidden bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {/* Hero Header */}
          <div className="relative h-64 md:h-80 shrink-0 w-full group">
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                alt={article.title}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded border border-cyan-500/30 backdrop-blur-sm">
                  {article.publication}
                </span>
                <span className="text-slate-300 text-sm font-medium drop-shadow-md">
                  {new Date(article.published_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-lg text-balance">
                {article.title}
              </h2>
            </div>

            <CloseButton
              onClick={onClose}
              size="md"
              label="Close article viewer"
              className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white border-white/10 z-10"
            />
          </div>

          <div className="p-6 md:p-10">
            {/* Author & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-lg border border-white/10 shadow-inner">
                  {article.author.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{article.author}</div>
                  <div className="text-cyan-400 text-sm">Investigative Journalist</div>
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
                className="bg-purple-600 hover:bg-purple-700"
              />

              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all shadow-lg shadow-cyan-900/20 font-medium group"
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
              className="prose prose-invert prose-lg max-w-none prose-p:text-slate-300 prose-headings:text-white prose-a:text-cyan-400 hover:prose-a:text-cyan-300 prose-strong:text-white prose-blockquote:border-l-cyan-500 prose-blockquote:bg-slate-800/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-img:rounded-xl prose-img:shadow-xl"
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
