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

function getRiskToneClass(redFlagRating: number) {
  if (redFlagRating >= 4) {
    return 'tone-danger';
  }

  if (redFlagRating >= 2) {
    return 'tone-warning';
  }

  return 'tone-info';
}

export function EvidenceDocSnippets({ snippets, searchTerm }: EvidenceDocSnippetsProps) {
  if (snippets.length === 0) {
    return null;
  }

  return (
    <div className="glass-panel overflow-hidden rounded-[var(--radius-xl)]">
      <div className="soft-glass-panel border-b border-[var(--glass-border)] px-4 py-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
          <Icon name="FileText" size="sm" />
          Matched Documents
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
            ({snippets.length})
          </span>
        </h3>
      </div>
      <div className="space-y-3 p-4">
        <div className="mb-2 flex items-start gap-1 text-xs text-[var(--text-muted)]">
          <Icon name="Info" size="xs" className="mt-0.5 shrink-0" />
          <span>Documents containing &quot;{searchTerm}&quot;</span>
        </div>
        {snippets.map((snippet) => (
          <div
            key={snippet.id}
            className="soft-glass-panel rounded-[var(--radius-lg)] border border-[var(--glass-border)] p-4 transition-colors hover:border-[var(--glass-border-highlight)]"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="truncate pr-2 font-medium text-[var(--accent)]">{snippet.title}</div>
              <div className={`status-chip ${getRiskToneClass(snippet.redFlagRating)}`}>
                Risk: {snippet.redFlagRating}
              </div>
            </div>
            {snippet.snippet && (
              <div
                className="soft-glass-panel mb-2 rounded-[var(--radius-md)] border-l-2 border-[var(--accent)]/30 p-2 font-mono text-sm text-[var(--text-secondary)]"
                // DOMPurify sanitizes the snippet before rendering — safe against XSS
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(snippet.snippet, {
                    ALLOWED_TAGS: ['mark'],
                    ALLOWED_ATTR: ['class'],
                  }),
                }}
              />
            )}
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <Icon name="File" size="xs" />
                {(snippet.title || '').split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
