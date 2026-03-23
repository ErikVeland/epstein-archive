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

export function EvidenceResultCard({ result, onPersonClick }: EvidenceResultCardProps) {
  return (
    <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] border border-[var(--glass-border)] overflow-hidden">
      {/* Person Header - Mobile-optimized with stacked layout */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 border-b border-[var(--glass-border)]">
        {/* Entity Name - Always prominent at top */}
        <button
          onClick={() => onPersonClick(result.person)}
          className="text-lg md:text-base font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors mb-2 md:mb-0 block text-left w-full truncate"
          title="Click to view full profile"
        >
          {result.person.name}
        </button>

        {/* Metadata - Stacked on mobile, inline on desktop */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {/* Tags row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Icon name="User" size="sm" color="primary" className="shrink-0 hidden md:block" />
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                result.person.likelihoodScore === 'HIGH'
                  ? 'bg-red-900/80 text-red-200'
                  : result.person.likelihoodScore === 'MEDIUM'
                    ? 'bg-yellow-900/80 text-yellow-200'
                    : 'bg-green-900/80 text-green-200'
              }`}
            >
              {result.person.likelihoodScore}
            </span>
            {result.person.redFlagRating !== undefined && (
              <RedFlagIndex
                value={result.person.redFlagRating}
                size="sm"
                variant="combined"
                showTextLabel={false}
              />
            )}
          </div>

          {/* Stats and actions - stacked text on mobile */}
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 text-xs text-[var(--text-muted)]">
              <span>{result.person.mentions?.toLocaleString()} mentions</span>
              <span className="hidden md:inline text-[var(--text-primary)]">•</span>
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
              className="hover:bg-[var(--glass-bg-highlight)] self-start md:self-auto"
            />
          </div>
        </div>
      </div>

      {/* Evidence Types */}
      <div className="p-4 border-b border-[var(--glass-border)]">
        <div className="flex flex-wrap gap-2">
          {result.person.evidenceTypes.map((type, i) => (
            <span key={i} className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">
              {type.replace('_', ' ').toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Matching Contexts */}
      {result.matchingContexts.length > 0 && (
        <div className="p-4 border-b border-[var(--glass-border)]">
          <h4
            className="text-sm font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2"
            aria-level={3}
          >
            <Icon name="FileText" size="sm" />
            Contexts ({result.matchingContexts.length})
          </h4>
          {/* Microcopy for Contexts */}
          <div className="text-xs text-[var(--text-muted)] mb-3 flex items-start gap-1">
            <Icon name="Info" size="xs" className="mt-0.5 flex-shrink-0" />
            <span>Relevant excerpts from documents mentioning this subject</span>
          </div>
          <div className="space-y-3">
            {result.matchingContexts.map((context, i) => (
              <div key={i} className="bg-[var(--glass-bg-strong)] p-3 rounded-[var(--radius-lg)]">
                <div className="text-sm text-[var(--text-secondary)] mb-2">{context.context}</div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] overflow-hidden">
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

      {/* Matching Red Flag Passages */}
      {result.matchingPassages.length > 0 && (
        <div className="p-4 bg-red-900 bg-opacity-20">
          <h4
            className="text-sm font-medium text-red-300 mb-3 flex items-center gap-2"
            aria-level={3}
          >
            <Icon name="AlertTriangle" size="sm" color="danger" />
            Key Passages ({result.matchingPassages.length})
          </h4>
          {/* Microcopy for Key Passages */}
          <div className="text-xs text-red-200 mb-3 flex items-start gap-1">
            <Icon name="Info" size="xs" className="mt-0.5 flex-shrink-0" />
            <span>Excerpts containing flagged keywords or significant mentions</span>
          </div>
          <div className="space-y-3">
            {result.matchingPassages.map((passage, i) => (
              <div
                key={i}
                className="bg-red-900 bg-opacity-30 p-3 rounded-[var(--radius-lg)] border border-red-700"
              >
                <div className="text-sm text-red-200 mb-2">{passage.passage}</div>
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <span className="px-2 py-1 bg-red-800 rounded">
                    {passage.keyword.toUpperCase()}
                  </span>
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
