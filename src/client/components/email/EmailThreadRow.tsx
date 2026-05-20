import React from 'react';
import type { ListChildComponentProps } from 'react-window';
import Icon from '@client/components/common/Icon';
import { Button } from '@client/design-system/lib';
import type { EmailThreadDTO } from '@client/services/apiClient';
import styles from './EmailClient.module.css';
import { formatEmailTime } from './emailFormatting';

export type EmailDensity = 'comfortable' | 'compact';

type EmailThreadRowData = {
  rows: EmailThreadDTO[];
  selectedThreadId: string | null;
  onOpen: (threadId: string) => void;
  density: EmailDensity;
};

export const EmailThreadRow = React.memo(
  ({ index, style, data }: ListChildComponentProps<EmailThreadRowData>) => {
    const thread = data.rows[index];
    const selected = data.selectedThreadId === thread.threadId;

    const viewCount = Math.max(1, Math.floor((thread.significanceScore || 0) * 10 + 12));
    const starCount = Math.max(0, Math.floor((thread.signalScore || 0) * 10));
    const formattedSnippet = (thread.snippet || '').replace(/^(\s*[-–—]\s*)+/, '').trim();

    return (
      <Button
        style={style}
        onClick={() => data.onOpen(thread.threadId)}
        type="button"
        variant="ghost"
        size="sm"
        data-thread-id={thread.threadId}
        className={`${styles.emailRow} ${selected ? styles.active : ''} ${
          data.density === 'compact' ? styles.compactRow : styles.comfortableRow
        }`}
      >
        <div className={styles.metricCluster}>
          <div className={styles.metricItem} title="Priority Indicator">
            <Icon
              name="Star"
              className={`${styles.metricIcon} ${
                starCount > 3 ? styles.priorityMetricIconActive : styles.priorityMetricIconMuted
              }`}
            />
            <span>{starCount}</span>
          </div>
          <div className={styles.metricItem} title="Significance View Factor">
            <Icon name="Eye" className={styles.metricIcon} />
            <span>{viewCount}</span>
          </div>
        </div>

        <div className={styles.rowParticipants}>
          {thread.participants[0]?.split('@')[0] || 'Unknown'}
        </div>

        <div className={styles.rowMain}>
          <span className={styles.rowSubject}>{thread.subject}</span>
          <span className={styles.rowSnippet}>{formattedSnippet || '(No content)'}</span>
        </div>

        <div className={styles.rowAside}>
          <div className={styles.rowTime}>{formatEmailTime(thread.lastMessageAt)}</div>
        </div>
      </Button>
    );
  },
);
