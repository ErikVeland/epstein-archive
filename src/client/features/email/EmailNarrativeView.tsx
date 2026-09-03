import React, { useMemo } from 'react';
import Icon from '@client/components/common/Icon';
import { Button } from '@client/design-system/lib';
import type { EmailThreadDTO } from '@client/services/apiClient';
import styles from './EmailClient.module.css';

interface EmailNarrativeViewProps {
  threads: EmailThreadDTO[];
  selectedThreadId: string | null;
  onOpen: (threadId: string) => void;
}

interface NarrativeChapter {
  key: string;
  eyebrow: string;
  title: string;
  description: string;
  threads: EmailThreadDTO[];
}

const chapterForYear = (year: number): Omit<NarrativeChapter, 'threads'> => {
  if (year <= 2008) {
    return {
      key: 'through-2008',
      eyebrow: 'Through 2008',
      title: 'Early correspondence',
      description: 'Dated exchanges from the earlier archive record.',
    };
  }
  if (year <= 2011) {
    return {
      key: '2009-2011',
      eyebrow: '2009–2011',
      title: 'Network continuity',
      description: 'Correspondence recorded after Epstein’s 2008 conviction.',
    };
  }
  if (year <= 2015) {
    return {
      key: '2012-2015',
      eyebrow: '2012–2015',
      title: 'Introductions, travel, and business',
      description: 'Threads about meetings, travel, properties, finance, and introductions.',
    };
  }
  return {
    key: '2016-2019',
    eyebrow: '2016–August 2019',
    title: 'Later correspondence',
    description: 'The final period covered by this curated view.',
  };
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unverified';
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatRange = (thread: EmailThreadDTO): string => {
  const start = formatDate(thread.firstMessageAt);
  const end = formatDate(thread.lastMessageAt);
  return start === end ? start : `${start} – ${end}`;
};

const cleanParticipant = (value: string): string =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/["']/g, '')
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const EmailNarrativeView: React.FC<EmailNarrativeViewProps> = ({
  threads,
  selectedThreadId,
  onOpen,
}) => {
  const chapters = useMemo(() => {
    const chapterMap = new Map<string, NarrativeChapter>();

    for (const thread of threads) {
      const date = new Date(thread.firstMessageAt);
      const chapterBase = chapterForYear(
        Number.isNaN(date.getTime()) ? 2019 : date.getUTCFullYear(),
      );
      const chapter = chapterMap.get(chapterBase.key) ?? { ...chapterBase, threads: [] };
      chapter.threads.push(thread);
      chapterMap.set(chapterBase.key, chapter);
    }

    return Array.from(chapterMap.values());
  }, [threads]);

  return (
    <div className={styles.narrativeScroll}>
      <section className={styles.narrativeIntro} aria-labelledby="correspondence-timeline-title">
        <div className={styles.narrativeIntroIcon} aria-hidden="true">
          <Icon name="History" />
        </div>
        <div>
          <div className={styles.narrativeKicker}>Curated archive path</div>
          <h2 id="correspondence-timeline-title">Key correspondence timeline</h2>
          <p>
            Follow substantive, dated exchanges that connect at least two people in the archive's
            key-person index. Bulk mail, empty records, generic subjects, and implausible thread
            merges are excluded.
          </p>
          <p className={styles.narrativeCaveat}>
            Machine curation identifies useful reading paths. A link or mention does not establish
            participation, knowledge, or wrongdoing. Open each thread and verify the source context.
          </p>
        </div>
      </section>

      {chapters.map((chapter) => (
        <section className={styles.narrativeChapter} key={chapter.key}>
          <header className={styles.narrativeChapterHeader}>
            <div className={styles.narrativeYear}>{chapter.eyebrow}</div>
            <div>
              <h3>{chapter.title}</h3>
              <p>{chapter.description}</p>
            </div>
          </header>

          <div className={styles.narrativeThreadList}>
            {chapter.threads.map((thread) => {
              const keyPeople = thread.keyPeople.slice(0, 4);
              const visibleParticipants = thread.participants
                .map(cleanParticipant)
                .filter((participant) => participant.length > 2 && /[a-z]{2}/i.test(participant))
                .slice(0, 3);

              return (
                <Button
                  unstyled
                  type="button"
                  key={thread.threadId}
                  className={`${styles.narrativeCard} ${
                    selectedThreadId === thread.threadId ? styles.narrativeCardActive : ''
                  }`}
                  onClick={() => onOpen(thread.threadId)}
                >
                  <div className={styles.narrativeRail} aria-hidden="true">
                    <span />
                  </div>
                  <div className={styles.narrativeCardBody}>
                    <div className={styles.narrativeCardMeta}>
                      <time dateTime={thread.firstMessageAt}>{formatRange(thread)}</time>
                      <span>
                        {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
                      </span>
                      {thread.hasAttachments && (
                        <span className={styles.narrativeAttachment}>
                          <Icon name="Paperclip" /> Attachment
                        </span>
                      )}
                    </div>
                    <h4>{thread.subject}</h4>
                    {visibleParticipants.length > 0 && (
                      <p className={styles.narrativeParticipants}>
                        {visibleParticipants.join(' · ')}
                      </p>
                    )}
                    <p className={styles.narrativeSnippet}>
                      {(thread.snippet || '').replace(/^(\s*[-–—]\s*)+/, '').trim() ||
                        'Open the thread to review the archived messages.'}
                    </p>
                    <div className={styles.narrativeCardFooter}>
                      <div className={styles.narrativePeople}>
                        <Icon name="Users" />
                        <span>
                          Linked context: {keyPeople.join(', ')}
                          {thread.keyPeople.length > keyPeople.length
                            ? ` +${thread.keyPeople.length - keyPeople.length}`
                            : ''}
                        </span>
                      </div>
                      <span className={styles.narrativeOpen}>
                        Read thread <Icon name="ArrowRight" />
                      </span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
