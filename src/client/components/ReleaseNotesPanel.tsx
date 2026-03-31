import React from 'react';
import { Calendar, BookOpen, Circle } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { CloseButton } from './common/CloseButton';

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

interface ReleaseNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  releaseNotes: ReleaseNote[];
  isLoading?: boolean;
  error?: string | null;
}

export const ReleaseNotesPanel: React.FC<ReleaseNotesPanelProps> = ({
  isOpen,
  onClose,
  releaseNotes,
  isLoading = false,
  error = null,
}) => {
  // Use the passed releaseNotes prop directly as the single source of truth
  const allReleaseNotes = releaseNotes;
  useScrollLock(isOpen);
  const { modalRef } = useModalFocusTrap({ isActive: isOpen, onEscape: onClose });

  const isInternalPathLeak = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    return (
      /(^|[\s`])(src|scripts|tests|docs|server|components|services|contexts|types)\//i.test(
        trimmed,
      ) ||
      /(^|[\s`])\/Users\//.test(trimmed) ||
      /(^|[\s`])[A-Za-z]:\\/.test(trimmed) ||
      /(^|[\s`])\.\//.test(trimmed) ||
      /(^|[\s`])file:\/\//i.test(trimmed)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--glass-bg-strong)] flex items-center justify-end z-[var(--z-modal)] p-0 md:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close release notes"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="surface-glass rounded-none md:rounded-[var(--radius-lg)] w-full max-w-md h-full md:h-auto md:max-h-[90vh] md:border border-l border-[var(--glass-border)] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/80 sticky top-0 z-10">
          <h2
            id="release-notes-title"
            className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"
          >
            <BookOpen className="h-5 w-5 text-[var(--accent)]" />
            What's New
          </h2>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close release notes"
            className="text-[var(--text-primary)]"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[var(--glass-bg-strong)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--text-muted)] animate-pulse">Loading release notes...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-red-400 text-center bg-red-900/20 p-4 rounded-[var(--radius-lg)] border border-red-900/50">
                <p className="font-medium mb-2">Could not load release notes</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            </div>
          ) : allReleaseNotes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--text-muted)] text-center italic">
                <p>No release notes available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 pb-8">
              {allReleaseNotes.map((release, index) => (
                <div
                  key={index}
                  className="relative pl-4 border-l-2 border-[var(--glass-border)] last:border-l-0"
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[10px] top-0 h-5 w-5 flex items-center justify-center ${index === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                  >
                    <Circle className="h-3.5 w-3.5 fill-current" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-mono font-bold ${index === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                      >
                        {release.version}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 bg-[var(--glass-bg)]/50 px-2 py-0.5 rounded-full border border-[var(--glass-border)]">
                        <Calendar className="h-3 w-3" />
                        {release.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">
                      {release.title}
                    </h3>
                  </div>

                  <div className="space-y-3 bg-[var(--glass-bg)]/30 rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
                    {release.notes.map((note, noteIndex) => {
                      if (isInternalPathLeak(note)) {
                        return null;
                      }

                      // Check if this is a markdown header (### text)
                      if (note.startsWith('### ')) {
                        const headerText = note.substring(4).trim();
                        return (
                          <h4
                            key={noteIndex}
                            className="text-base font-semibold text-[var(--accent)] mt-4 first:mt-0 mb-2"
                          >
                            {headerText}
                          </h4>
                        );
                      }

                      // Regular bullet point
                      return (
                        <div key={noteIndex} className="flex items-start gap-3">
                          <span className="text-[var(--accent)]/80 mt-1.5 text-[10px]">
                            <Circle className="h-2.5 w-2.5 fill-current" />
                          </span>
                          <div className="text-sm text-[var(--text-secondary)] leading-relaxed break-words [overflow-wrap:anywhere]">
                            {note.split(/(\*\*.*?\*\*)/).map((part, i) =>
                              part.startsWith('**') && part.endsWith('**') ? (
                                <strong key={i} className="font-semibold text-cyan-100">
                                  {part.slice(2, -2)}
                                </strong>
                              ) : (
                                <span key={i}>{part}</span>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/80 text-center sticky bottom-0 z-10">
          <p className="text-xs text-[var(--text-muted)]">Epstein Archive Investigation Tool</p>
        </div>
      </div>
    </div>
  );
};
