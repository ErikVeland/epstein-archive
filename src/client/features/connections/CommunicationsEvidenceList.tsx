import type { SharedCommunicationDto } from '@shared/dto/connections';
import styles from './EvidenceList.module.css';

interface Props {
  communications: SharedCommunicationDto[];
}

export function CommunicationsEvidenceList({ communications }: Props) {
  return (
    <div className={styles.list}>
      {communications.map((c) => (
        <div key={c.threadId} className={styles.row}>
          <span className={styles.date}>
            {c.lastDate
              ? new Date(c.lastDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                })
              : '—'}
          </span>
          <span className={styles.route}>{c.subject ?? '(no subject)'}</span>
          <span className={styles.meta}>
            {c.messageCount} message{c.messageCount !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
