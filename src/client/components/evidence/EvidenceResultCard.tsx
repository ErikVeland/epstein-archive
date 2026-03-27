import { Person } from '../../types';
import { RedFlagIndex } from '../visualizations/RedFlagIndex';
import Icon from '../common/Icon';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';

interface SearchResult {
  person: Person;
  matchingContexts: Person['contexts'];
  matchingPassages: NonNullable<Person['significantPassages']>;
  score: number;
}

interface EvidenceResultCardProps {
  result: SearchResult;
  onPersonClick: (person: Person) => void;
}

const likelihoodToneClass: Record<string, string> = {
  HIGH: 'tone-danger',
  MEDIUM: 'tone-warning',
  LOW: 'tone-success',
};

export function EvidenceResultCard({ result, onPersonClick }: EvidenceResultCardProps) {
  const likelihoodTone =
    result.person.likelihoodScore !== undefined
      ? (likelihoodToneClass[result.person.likelihoodScore] ?? 'tone-info')
      : 'tone-info';

  return (
    <div className="glass-panel overflow-hidden rounded-[var(--radius-xl)]">
      <div className="soft-glass-panel border-b border-[var(--glass-border)] px-4 py-3">
        <button
          onClick={() => onPersonClick(result.person)}
          className="mb-3 block w-full truncate text-left text-lg font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)] md:mb-2 md:text-base"
          title="Click to view full profile"
        >
          {result.person.name}
        </button>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Icon name="User" size="sm" color="primary" className="hidden shrink-0 md:block" />
            <span className={`status-chip ${likelihoodTone}`}>{result.person.likelihoodScore}</span>
            {result.person.redFlagRating !== undefined && (
              <RedFlagIndex
                value={result.person.redFlagRating}
                size="sm"
                variant="combined"
                showTextLabel={false}
              />
            )}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="flex flex-col gap-1 text-xs text-[var(--text-muted)] md:flex-row md:items-center md:gap-2">
              <span>{result.person.mentions?.toLocaleString()} mentions</span>
              <span className="hidden text-[var(--text-primary)] md:inline">•</span>
              <span>{result.person.files} files</span>
            </div>
            <AddToInvestigationButton
              item={{
                id: result.person.id?.toString() || '',
                title: result.person.name,
                description: result.person.role || 'Person of interest',
                type: 'entity',
                sourceId: result.person.id?.toString() || '',
              }}
              variant="quick"
              className="self-start hover:bg-[var(--glass-bg-highlight)] md:self-auto"
            />
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--glass-border)] p-4">
        <div className="flex flex-wrap gap-2">
          {result.person.evidenceTypes.map((type, index) => (
            <span key={index} className="status-chip tone-info">
              {type.replace('_', ' ').toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {result.matchingContexts.length > 0 && (
        <div className="border-b border-[var(--glass-border)] p-4">
          <h4
            className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"
            aria-level={3}
          >
            <Icon name="FileText" size="sm" />
            Contexts ({result.matchingContexts.length})
          </h4>
          <div className="mb-3 flex items-start gap-1 text-xs text-[var(--text-muted)]">
            <Icon name="Info" size="xs" className="mt-0.5 shrink-0" />
            <span>Relevant excerpts from documents mentioning this subject</span>
          </div>
          <div className="space-y-3">
            {result.matchingContexts.map((context, index) => (
              <div key={index} className="soft-glass-panel rounded-[var(--radius-lg)] p-3">
                <div className="mb-2 text-sm text-[var(--text-secondary)]">{context.context}</div>
                <div className="flex items-center gap-2 overflow-hidden text-xs text-[var(--text-muted)]">
                  <Icon name="FileText" size="xs" className="shrink-0" />
                  <span className="truncate">{context.file}</span>
                  {context.date !== 'Unknown' && (
                    <>
                      <span>•</span>
                      <Icon name="Calendar" size="xs" />
                      <span>{context.date}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.matchingPassages.length > 0 && (
        <div className="p-4">
          <div className="status-banner status-banner-danger mb-3">
            <div>
              <h4 className="mb-1 flex items-center gap-2 text-sm font-medium" aria-level={3}>
                <Icon name="AlertTriangle" size="sm" color="danger" />
                Key Passages ({result.matchingPassages.length})
              </h4>
              <div className="flex items-start gap-1 text-xs">
                <Icon name="Info" size="xs" className="mt-0.5 shrink-0" />
                <span>Excerpts containing flagged keywords or significant mentions</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {result.matchingPassages.map((passage, index) => (
              <div
                key={index}
                className="rounded-[var(--radius-lg)] border border-[color:color-mix(in_srgb,var(--accent-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--accent-danger)_10%,transparent)] p-3"
              >
                <div className="mb-2 text-sm text-[var(--text-primary)]">{passage.passage}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="status-chip tone-danger">{passage.keyword.toUpperCase()}</span>
                  <span>•</span>
                  <span>{passage.filename}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
