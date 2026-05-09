import { Link } from 'react-router-dom';
import type { SharedDocumentDto } from '@shared/dto/connections';
import styles from './EvidenceList.module.css';

interface Props {
  documents: SharedDocumentDto[];
}

export function DocumentEvidenceList({ documents }: Props) {
  return (
    <div className={styles.list}>
      {documents.map((d) => (
        <Link key={d.id} to={`/documents/${encodeURIComponent(d.id)}`} className={styles.row}>
          <span className={styles.date}>
            {d.date
              ? new Date(d.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </span>
          <span className={styles.route}>{d.title}</span>
          {d.evidenceType && <span className={styles.meta}>{d.evidenceType}</span>}
          {d.wordCount && <span className={styles.meta}>{d.wordCount.toLocaleString()} words</span>}
        </Link>
      ))}
    </div>
  );
}
