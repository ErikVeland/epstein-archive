import { Link } from 'react-router-dom';
import type { SharedFlightDto } from '@shared/dto/connections';
import styles from './EvidenceList.module.css';

interface Props {
  flights: SharedFlightDto[];
}

export function FlightEvidenceList({ flights }: Props) {
  return (
    <div className={styles.list}>
      {flights.map((f) => (
        <Link key={f.id} to={`/flights/${f.id}`} className={styles.row}>
          <span className={styles.date}>
            {f.date
              ? new Date(f.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : '—'}
          </span>
          <span className={styles.route}>
            {f.origin ?? '?'} → {f.destination ?? '?'}
          </span>
          <span className={styles.meta}>{f.tailNumber ?? ''}</span>
          {f.otherPassengers.length > 0 && (
            <span className={styles.passengers}>
              +{f.otherPassengers.slice(0, 3).join(', ')}
              {f.otherPassengers.length > 3 ? ` +${f.otherPassengers.length - 3}` : ''}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
