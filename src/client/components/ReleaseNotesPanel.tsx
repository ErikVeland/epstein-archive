import React from 'react';
import { Calendar, BookOpen, Circle } from 'lucide-react';
import { useScrollLock } from '../hooks/useScrollLock';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { CloseButton } from './common/CloseButton';
import { Flex } from '../design-system/components/layout/Flex';
import { Box } from '../design-system/components/layout/Box';
import { LqText } from '../design-system/components/typography/Text';

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
    <Flex
      align="center"
      justify="end"
      className="fixed inset-0 bg-[var(--glass-bg-strong)] z-[var(--z-modal)] p-0 md:p-4"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close release notes"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="surface-glass rounded-none md:rounded-[var(--radius-lg)] w-full max-w-md h-full md:h-auto md:max-h-[90vh] md:border border-l flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Flex
          align="center"
          justify="between"
          className="p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/80 sticky top-0 z-10 w-full"
        >
          <LqText
            as="h2"
            id="release-notes-title"
            variant="h3"
            color="primary"
            className="flex items-center gap-2 font-bold"
          >
            <BookOpen className="h-5 w-5 text-[var(--accent)]" />
            What's New
          </LqText>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close release notes"
            className="text-[var(--text-primary)]"
          />
        </Flex>

        {/* Content */}
        <Box className="flex-1 overflow-y-auto p-4 bg-[var(--glass-bg-strong)] w-full">
          {isLoading ? (
            <Flex align="center" justify="center" className="h-full">
              <Box className="text-[var(--text-muted)] animate-pulse">Loading release notes...</Box>
            </Flex>
          ) : error ? (
            <Flex align="center" justify="center" className="h-full p-4">
              <Box className="text-red-400 text-center bg-red-900/20 p-4 rounded-[var(--radius-lg)] border border-red-900/50">
                <Box className="font-medium mb-2">Could not load release notes</Box>
                <Box className="text-sm opacity-80">{error}</Box>
              </Box>
            </Flex>
          ) : allReleaseNotes.length === 0 ? (
            <Flex align="center" justify="center" className="h-full">
              <Box className="text-[var(--text-muted)] text-center italic">
                <p>No release notes available</p>
              </Box>
            </Flex>
          ) : (
            <Box className="space-y-8 pb-8">
              {allReleaseNotes.map((release, index) => (
                <Box
                  key={index}
                  className="relative pl-4 border-l-2 border-[var(--glass-border)] last:border-l-0"
                >
                  {/* Timeline Dot */}
                  <Flex
                    align="center"
                    justify="center"
                    className={`absolute -left-[10px] top-0 h-5 w-5 ${index === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                  >
                    <Circle className="h-3.5 w-3.5 fill-current" />
                  </Flex>

                  <Box className="mb-4">
                    <Flex align="center" gap={2} className="mb-1">
                      <span
                        className={`text-sm font-mono font-bold ${index === 0 ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                      >
                        {release.version}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--glass-bg)]/50 px-2 py-0.5 rounded-full border border-[var(--glass-border)]">
                        <Calendar className="h-3 w-3" />
                        {release.date}
                      </span>
                    </Flex>
                    <LqText
                      as="h3"
                      variant="body"
                      color="primary"
                      className="text-lg font-semibold leading-tight"
                    >
                      {release.title}
                    </LqText>
                  </Box>

                  <Box className="space-y-3 bg-[var(--glass-bg)]/30 rounded-[var(--radius-lg)] p-4 border border-[var(--glass-border)]">
                    {release.notes.map((note, noteIndex) => {
                      if (isInternalPathLeak(note)) {
                        return null;
                      }

                      // Check if this is a markdown header (### text)
                      if (note.startsWith('### ')) {
                        const headerText = note.substring(4).trim();
                        return (
                          <LqText
                            as="h4"
                            key={noteIndex}
                            variant="small"
                            className="text-base font-semibold text-[var(--accent)] mt-4 first:mt-0 mb-2"
                          >
                            {headerText}
                          </LqText>
                        );
                      }

                      // Regular bullet point
                      return (
                        <Flex key={noteIndex} align="start" gap={3}>
                          <span className="text-[var(--accent)]/80 mt-1.5 text-[10px]">
                            <Circle className="h-2.5 w-2.5 fill-current" />
                          </span>
                          <Box className="text-sm text-[var(--text-secondary)] leading-relaxed break-words [overflow-wrap:anywhere]">
                            {note.split(/(\*\*.*?\*\*)/).map((part, i) =>
                              part.startsWith('**') && part.endsWith('**') ? (
                                <strong key={i} className="font-semibold text-cyan-100">
                                  {part.slice(2, -2)}
                                </strong>
                              ) : (
                                <span key={i}>{part}</span>
                              ),
                            )}
                          </Box>
                        </Flex>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box className="p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/80 text-center sticky bottom-0 z-10 w-full">
          <LqText as="p" variant="small" color="muted">
            Epstein Archive Investigation Tool
          </LqText>
        </Box>
      </div>
    </Flex>
  );
};
