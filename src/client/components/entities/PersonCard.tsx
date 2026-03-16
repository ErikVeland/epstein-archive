import React from 'react';
import { Person } from '../../types';
import { formatNumber } from '../../utils/search';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '../../utils/entityTypeIcons';
import {
  calculateEvidenceLadder,
  calculateSignalMetrics,
  generateDriverChips,
} from '../../utils/forensics';
import { SignalPanel } from './cards/SignalPanel';
import { EvidenceBadge } from './cards/EvidenceBadge';
import { DriverChips } from './cards/DriverChips';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
  searchTerm?: string;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClick, searchTerm }) => {
  const rating = Number((person as any).redFlagRating ?? 0);

  // Forensic Calculations
  const evidenceLevel = calculateEvidenceLadder(person);
  const signalMetrics = calculateSignalMetrics(person);
  const driverChips = generateDriverChips(person);

  const photos = React.useMemo(() => person.photos || [], [person.photos]);

  // Identity
  const entityType = (person as any).entityType;
  const role = person.title || person.role || (person as any).primaryRole || 'Unknown';
  const avatarPhoto = photos.length > 0 ? photos[0] : null;

  // Highlight helper
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || !term.trim()) return text;
    try {
      const escapedTerm = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      return text.split(regex).map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0 rounded font-medium">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch {
      return text;
    }
  };

  const filesCount = person.files ?? person.fileReferences?.length ?? 0;

  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/90 backdrop-blur-sm border border-slate-800 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,0,0,0.5)] flex flex-col h-full"
    >
      {/* 1. IDENTITY HEADER */}
      <div className="flex items-start gap-4 mb-3">
        {/* Zoomed Avatar */}
        <div className="flex-shrink-0 relative w-12 h-12 rounded-lg overflow-hidden border border-slate-700 group-hover:border-cyan-500/50 transition-colors bg-slate-950">
          {avatarPhoto ? (
            <img
              src={`/api/media/images/${avatarPhoto.id}/thumbnail`}
              alt={person.name}
              className="w-full h-full object-cover object-top scale-125 transform transition-transform duration-700 group-hover:scale-150"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
              {getEntityTypeIcon(entityType, 'md', role)}
            </div>
          )}
          {rating >= 4 && <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 truncate group-hover:text-cyan-400 transition-colors">
              {highlightText(person.name, searchTerm)}
            </h3>
            <EvidenceBadge
              level={evidenceLevel.level}
              ratingObjective={rating}
              ratingSubjective={Number((person as any).redFlagScore ?? 0)}
            />
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {role}
            </span>
            {/* Black Book Badge */}
            {(person.hasBlackBook ||
              (person.blackBookEntries && person.blackBookEntries.length > 0)) && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-950/40 border border-purple-800/40 rounded text-[9px] font-bold text-purple-300 uppercase tracking-wider"
                title="Listed in Jeffrey Epstein's Black Book"
              >
                <Icon name="Book" size="xs" />
                BB
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SIGNAL BLOCK (Visual) */}
      <div className="mb-3 bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
        <SignalPanel metrics={signalMetrics} />
        <DriverChips chips={driverChips} />
      </div>

      {/* 3. CORE METRICS (Compact) */}
      <div className="grid grid-cols-3 gap-2 py-2 border-t border-slate-800/50 mb-3">
        <div className="flex flex-col items-center">
          <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">
            Mentions
          </span>
          <span className="text-xs font-mono text-slate-300">{formatNumber(person.mentions)}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800">
          <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Docs</span>
          <span className="text-xs font-mono text-slate-300">{formatNumber(filesCount)}</span>
        </div>
        <div className="flex flex-col items-center border-l border-slate-800">
          <span className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Risk</span>
          <span
            className={`text-xs font-mono font-bold ${rating >= 4 ? 'text-red-400' : 'text-slate-400'}`}
          >
            {rating > 0 ? `${rating}/5` : '-'}
          </span>
        </div>
      </div>

      {/* 4. FOOTER / ACTION */}
      <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <AddToInvestigationButton
            item={{
              id: person.id?.toString() || '',
              title: person.name,
              description: role,
              type: 'entity',
              sourceId: person.id?.toString() || '',
            }}
            variant="icon"
          />
          {person.bio && (
            <span className="text-[10px] text-slate-500 truncate max-w-[120px] italic">
              "{person.bio.slice(0, 30)}..."
            </span>
          )}
        </div>
        <button className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 hover:text-cyan-400 flex items-center gap-1">
          Profile <Icon name="ArrowRight" size="xs" />
        </button>
      </div>
    </div>
  );
};

export default PersonCard;
