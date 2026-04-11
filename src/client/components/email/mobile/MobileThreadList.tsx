import { useEffect, useRef } from 'react';
import { Loader2, Paperclip, Search } from 'lucide-react';
import { EmailThreadDTO } from '../../../services/apiClient';
import { riskToneFromRating } from '../../../utils/riskSemantics';
import styles from './MobileThreadList.module.css';

const formatTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const age = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (age < oneDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (age < oneDay * 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

interface MobileThreadListProps {
  mailboxName: string;
  threads: EmailThreadDTO[];
  threadsTotal: number;
  threadsLoading: boolean;
  threadsError: string | null;
  loadingMore: boolean;
  hasMore: boolean;
  selectedThreadId: string | null;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onOpenThread: (threadId: string) => void;
  onLoadMore: () => void;
}

export function MobileThreadList({
  mailboxName,
  threads,
  threadsTotal,
  threadsLoading,
  threadsError,
  loadingMore,
  hasMore,
  selectedThreadId,
  searchInput,
  onSearchChange,
  onOpenThread,
  onLoadMore,
}: MobileThreadListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.mailboxName}>{mailboxName}</span>
          <span className={styles.count}>{threadsTotal.toLocaleString()} threads</span>
        </div>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} />
          <input
            className={styles.searchInput}
            placeholder="Search threads"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.list}>
        {threadsLoading ? (
          <div className={styles.state}>
            <Loader2 className={styles.spinner} size={20} />
            Loading conversations
          </div>
        ) : threadsError ? (
          <div className={styles.stateError}>{threadsError}</div>
        ) : threads.length === 0 ? (
          <div className={styles.state}>
            {searchInput ? `No threads match "${searchInput}"` : 'No threads in this mailbox'}
          </div>
        ) : (
          <>
            {threads.map((thread) => {
              const riskTone = riskToneFromRating(thread.risk);
              const active = thread.threadId === selectedThreadId;

              return (
                <button
                  key={thread.threadId}
                  className={`${styles.row} ${active ? styles.rowActive : ''}`}
                  onClick={() => onOpenThread(thread.threadId)}
                  type="button"
                >
                  <div className={styles.rowMain}>
                    <div className={styles.rowSubject}>{thread.subject}</div>
                    <div className={styles.rowParticipants}>
                      {thread.participants.slice(0, 3).join(' · ') || 'Unknown participants'}
                    </div>
                    {thread.snippet && <div className={styles.rowSnippet}>{thread.snippet}</div>}
                  </div>
                  <div className={styles.rowAside}>
                    <div className={styles.rowTime}>{formatTime(thread.lastMessageAt)}</div>
                    <div className={styles.rowMeta}>
                      {thread.hasAttachments && (
                        <Paperclip size={12} className={styles.paperclip} />
                      )}
                      <span className={`${styles.riskBadge} ${riskTone.className}`}>
                        R{thread.risk ?? '0'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            <div ref={sentinelRef} className={styles.sentinel}>
              {loadingMore && (
                <div className={styles.loadingMore}>
                  <Loader2 size={16} className={styles.spinner} /> Loading more
                </div>
              )}
              {!hasMore && threads.length > 0 && (
                <div className={styles.endText}>End of results</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
