import DOMPurify from 'isomorphic-dompurify';
import Icon from '../common/Icon';

interface DocSnippet {
  id: number;
  title: string;
  redFlagRating: number;
  snippet?: string;
}

interface EvidenceDocSnippetsProps {
  snippets: DocSnippet[];
  searchTerm: string;
}

export function EvidenceDocSnippets({ snippets, searchTerm }: EvidenceDocSnippetsProps) {
  if (snippets.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] border border-[var(--glass-border)] overflow-hidden">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 border-b border-[var(--glass-border)]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Icon name="FileText" size="sm" />
          Matched Documents
          <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
            ({snippets.length})
          </span>
        </h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-xs text-[var(--text-muted)] mb-2 flex items-start gap-1">
          <Icon name="Info" size="xs" className="mt-0.5 flex-shrink-0" />
          <span>Documents containing &quot;{searchTerm}&quot;</span>
        </div>
        {snippets.map((d) => (
          <div
            key={d.id}
            className="bg-[var(--glass-bg-strong)] p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)] hover:border-[var(--glass-border)] transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-medium text-[var(--accent)] truncate pr-4">{d.title}</div>
              <div
                className={`text-xs px-2 py-0.5 rounded ${
                  d.redFlagRating >= 4
                    ? 'bg-red-900/50 text-red-200'
                    : d.redFlagRating >= 2
                      ? 'bg-yellow-900/50 text-yellow-200'
                      : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]'
                }`}
              >
                Risk: {d.redFlagRating}
              </div>
            </div>
            {d.snippet && (
              <div
                className="text-sm text-[var(--text-secondary)] font-mono bg-[var(--glass-bg-strong)] p-2 rounded mb-2 border-l-2 border-[var(--accent)]/30"
                // DOMPurify sanitizes the snippet before rendering — safe against XSS
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(d.snippet, {
                    ALLOWED_TAGS: ['mark'],
                    ALLOWED_ATTR: ['class'],
                  }),
                }}
              />
            )}
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Icon name="File" size="xs" />
                {(d.title || '').split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
              {/* <span>{d.dateCreated ? new Date(d.dateCreated).toLocaleDateString() : 'Unknown Date'}</span> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
