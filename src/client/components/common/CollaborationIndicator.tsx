import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Surface, LqText } from '@client/design-system/lib';
import Icon from './Icon';
import styles from './CollaborationIndicator.module.css';

interface PresenceUser {
  id: string;
  username: string;
  path: string;
}

export const CollaborationIndicator: React.FC = () => {
  const location = useLocation();
  const [coPresent, setCoPresent] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/collaboration/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: location.pathname }),
        });
        if (response.ok) {
          const data = await response.json();
          setCoPresent(data.coPresent || []);
        }
      } catch (error) {
        console.error('[Co-Presence] Heartbeat failed:', error);
      }
    };

    // Run immediately and then every 5 seconds
    void sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  if (coPresent.length === 0) return null;

  return (
    <Surface variant="glass" className={styles.indicator}>
      <span className={styles.dot} />
      <Icon name="Users" size="xs" className={styles.icon} />
      <LqText variant="xs" className={styles.label}>
        {coPresent.length} other {coPresent.length === 1 ? 'researcher' : 'researchers'} here
      </LqText>

      <div className={styles.tooltip}>
        {coPresent.map((u) => (
          <div key={u.id} className={styles.tooltipUser}>
            {u.username}
          </div>
        ))}
      </div>
    </Surface>
  );
};
