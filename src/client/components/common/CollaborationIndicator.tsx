import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Surface, LqText } from '@client/design-system/lib';
import Icon from './Icon';

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
    <Surface
      variant="glass"
      style={{
        position: 'fixed',
        bottom: 'var(--space-4)',
        right: 'var(--space-4)',
        padding: 'var(--space-2) var(--space-4)',
        borderRadius: 'var(--radius-full)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        border: '1px solid var(--status-success)',
        background: 'rgba(46, 204, 113, 0.08)',
        backdropFilter: 'blur(10px)',
        boxShadow: 'var(--shadow-lg)',
        animation: 'pulse 2s infinite',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--status-success)',
          display: 'inline-block',
        }}
      />
      <Icon name="Users" size="xs" style={{ color: 'var(--status-success)' }} />
      <LqText variant="xs" style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
        {coPresent.length} other {coPresent.length === 1 ? 'researcher' : 'researchers'} here
      </LqText>

      {/* Tooltip on hover showing names */}
      <div
        style={{
          display: 'none',
          position: 'absolute',
          bottom: '100%',
          right: 0,
          background: 'var(--bg-panel)',
          border: '1px solid var(--glass-border)',
          padding: 'var(--space-2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-2)',
          whiteSpace: 'nowrap',
        }}
        className="copresent-tooltip"
      >
        {coPresent.map((u) => (
          <div key={u.id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {u.username}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
        }
        div:hover > .copresent-tooltip {
          display: block !important;
        }
      `}</style>
    </Surface>
  );
};
