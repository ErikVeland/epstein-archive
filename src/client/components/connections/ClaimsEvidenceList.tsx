import { useState } from 'react';
import type { SharedClaimDto } from '@shared/dto/connections';
import styles from './EvidenceList.module.css';

interface Props {
  claims: SharedClaimDto[];
}

export function ClaimsEvidenceList({ claims }: Props) {
  const [, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });

  return (
    <div className={styles.list}>
      {claims.map((c) => (
        <div key={c.id} className={styles.claimRow}>
          <div className={styles.claimText}>
            {c.subjectName ?? 'Unknown'} <em>{c.predicate ?? ''}</em>{' '}
            {c.objectName ?? c.objectText ?? 'Unknown'}
          </div>
          <button type="button" className={styles.corrobBadge} onClick={() => toggle(c.id)}>
            {c.documentCount} doc{c.documentCount !== 1 ? 's' : ''}
          </button>
        </div>
      ))}
    </div>
  );
}
