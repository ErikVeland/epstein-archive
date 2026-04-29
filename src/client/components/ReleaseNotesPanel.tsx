import React from 'react';
import Icon from '@client/components/common/Icon';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { useModalFocusTrap } from '@client/hooks/useModalFocusTrap';
import { CloseButton } from './common/CloseButton';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Box } from '@client/design-system/components/layout/Box';
import { LqText } from '@client/design-system/components/typography/Text';
import styles from './ReleaseNotesPanel.module.css';

import { Button } from '@client/design-system/lib';

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
    <Flex align="center" justify="end" className={styles.overlay}>
      <Button
        unstyled
        type="button"
        className={styles.dismissButton}
        aria-label="Close release notes"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-notes-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Flex align="center" justify="between" className={styles.header}>
          <LqText
            as="h2"
            id="release-notes-title"
            variant="h3"
            color="primary"
            className={styles.headerTitle}
          >
            <Icon name="BookOpen" className={styles.headerIcon} />
            What's New
          </LqText>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close release notes"
            className={styles.closeButton}
          />
        </Flex>

        {/* Content */}
        <Box className={styles.content}>
          {isLoading ? (
            <Flex align="center" justify="center" className={styles.fullHeight}>
              <Box className={styles.loadingState}>Loading release notes...</Box>
            </Flex>
          ) : error ? (
            <Flex align="center" justify="center" className={styles.errorWrap}>
              <Box className={styles.errorCard}>
                <Box className={styles.errorTitle}>Could not load release notes</Box>
                <Box className={styles.errorText}>{error}</Box>
              </Box>
            </Flex>
          ) : allReleaseNotes.length === 0 ? (
            <Flex align="center" justify="center" className={styles.fullHeight}>
              <Box className={styles.emptyState}>
                <p>No release notes available</p>
              </Box>
            </Flex>
          ) : (
            <Box className={styles.timeline}>
              {allReleaseNotes.map((release, index) => (
                <Box key={index} className={styles.timelineItem}>
                  {/* Timeline Dot */}
                  <Flex
                    align="center"
                    justify="center"
                    className={`${styles.timelineDot} ${index === 0 ? styles.timelineDotActive : styles.timelineDotInactive}`}
                  >
                    <Icon name="Circle" className={styles.timelineDotIcon} />
                  </Flex>

                  <Box className={styles.releaseHeader}>
                    <Flex align="center" gap={2} className={styles.releaseMetaRow}>
                      <span
                        className={`${styles.versionTag} ${index === 0 ? styles.versionTagActive : styles.versionTagInactive}`}
                      >
                        {release.version}
                      </span>
                      <span className={styles.dateChip}>
                        <Icon name="Calendar" className={styles.dateChipIcon} />
                        {release.date}
                      </span>
                    </Flex>
                    <LqText as="h3" variant="body" color="primary" className={styles.releaseTitle}>
                      {release.title}
                    </LqText>
                  </Box>

                  <Box className={styles.notesCard}>
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
                            className={styles.sectionHeader}
                          >
                            {headerText}
                          </LqText>
                        );
                      }

                      // Regular bullet point
                      return (
                        <Flex key={noteIndex} align="start" gap={3}>
                          <span className={styles.noteBullet}>
                            <Icon name="Circle" className={styles.noteBulletIcon} />
                          </span>
                          <Box className={styles.noteText}>
                            {note.split(/(\*\*.*?\*\*)/).map((part, i) =>
                              part.startsWith('**') && part.endsWith('**') ? (
                                <strong key={i} className={styles.noteStrong}>
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
        <Box className={styles.footer}>
          <LqText as="p" variant="small" color="muted">
            Epstein Archive Investigation Tool
          </LqText>
        </Box>
      </div>
    </Flex>
  );
};
