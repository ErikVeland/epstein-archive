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

const HEARTBEAT_INTERVAL_MS = 5000;
const HEARTBEAT_ENABLED =
  !import.meta.env.DEV || import.meta.env.VITE_ENABLE_COLLABORATION_HEARTBEAT === 'true';

export const CollaborationIndicator: React.FC = () => {
  const location = useLocation();
  const [coPresent, setCoPresent] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!HEARTBEAT_ENABLED) return undefined;

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

    // Run immediately and then often enough to stay inside the server's presence window.
    void sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(interval);
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
