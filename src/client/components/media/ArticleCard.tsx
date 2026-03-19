import React from 'react';
import { Calendar, ArrowUpRight, User, Clock } from 'lucide-react';
import LazyImage from '../common/LazyImage';

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
      'from-blue-900 via-slate-900 to-black',
      'from-purple-900 via-slate-900 to-black',
      'from-cyan-900 via-slate-900 to-black',
      'from-emerald-900 via-slate-900 to-black',
      'from-red-900 via-slate-900 to-black',
    ];
    return gradients[id % gradients.length];
  };

  return (
    <div
      className="group relative h-[400px] w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] transition-all hover:scale-[1.01] hover:shadow-[var(--glass-shadow)] hover:shadow-cyan-900/20 cursor-pointer"
      onClick={() => onClick(article)}
    >
      {/* Hero Image with Zoom Effect */}
      <div
        className={`absolute inset-0 h-full w-full bg-gradient-to-br ${getPlaceholderGradient(article.id)}`}
      >
        {article.imageUrl && (
          <LazyImage
            src={article.imageUrl}
            alt={article.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-60"
          />
        )}
        {/* Gradient Overlay: Dark at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-90 transition-opacity group-hover:opacity-80" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        {/* Publication & Date Badge */}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
          <span className="uppercase tracking-wider bg-cyan-950/50 px-2 py-1 rounded backdrop-blur-md border border-[var(--accent)]/20">
            {article.publication}
          </span>
          <span className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Calendar className="h-3 w-3" />
            {new Date(article.published_date).toLocaleDateString()}
          </span>
        </div>

        {/* Headline */}
        <h3 className="mb-2 text-2xl font-bold leading-tight text-[var(--text-primary)] drop-shadow-[var(--glass-shadow)] group-hover:text-[var(--accent)] transition-colors line-clamp-3">
          {article.title}
        </h3>

        {/* Summary (Hidden on mobile, visible on hover/desktop) */}
        <p className="mb-4 text-sm text-[var(--text-secondary)] line-clamp-2 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          {article.summary}
        </p>

        {/* Footer: Author & Read Time */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-3">
            {article.authorAvatar ? (
              <img
                src={article.authorAvatar}
                alt={article.author}
                loading="lazy"
                className="h-8 w-8 rounded-full border border-white/20"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--glass-bg-highlight)] border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {article.author}
              </span>
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Clock className="h-3 w-3" /> {article.readingTime || '5 min read'}
              </span>
            </div>
          </div>

          <div className="rounded-full bg-white/10 p-2 text-[var(--text-primary)] backdrop-blur-sm transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--text-primary)]">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Red Flag Badge (Top Right) */}
      {article.redFlagRating > 0 && (
        <div className="absolute top-4 right-4 bg-red-500/20 backdrop-blur-md border border-red-500/50 px-3 py-1 rounded-full text-xs font-bold text-red-200 flex items-center gap-1 shadow-[var(--glass-shadow)] z-10">
          <span>{'🚩'.repeat(article.redFlagRating)}</span>
        </div>
      )}
    </div>
  );
};
