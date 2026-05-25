import React from 'react';
import { Surface, Flex } from '@client/design-system/lib';

interface EmailAnalyticsPaneProps {
  analyticsData?: {
    matrix: Array<{ sender: string; recipient: string; count: number }>;
  };
}

export const EmailAnalyticsPane: React.FC<EmailAnalyticsPaneProps> = ({ analyticsData }) => {
  return (
    <div style={{ padding: 'var(--space-5)', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3
          style={{
            margin: 0,
            color: 'var(--text-primary)',
            fontSize: '1.25rem',
            fontWeight: 'var(--weight-light)',
          }}
        >
          Forensic Communication Heatmap
        </h3>
        <p
          style={{
            margin: 'var(--space-1) 0 0',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}
        >
          Pairwise communication frequency analysis mapped between foreclosure targets and senders.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {(analyticsData?.matrix || []).map((item, idx) => {
          const maxVal = Math.max(...(analyticsData?.matrix || []).map((m) => m.count), 1);
          const percent = (item.count / maxVal) * 100;
          return (
            <Surface
              key={idx}
              variant="glass"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <Flex
                justify="between"
                align="center"
                style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: 'var(--accent)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {item.sender}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>➔</span>
                  <span
                    style={{
                      fontWeight: 'bold',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                  >
                    {item.recipient}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: 'var(--status-success)',
                  }}
                >
                  {item.count} messages
                </span>
              </Flex>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div
                  style={{
                    flex: 1,
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent), var(--status-success))',
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>
            </Surface>
          );
        })}
        {(!analyticsData || (analyticsData?.matrix || []).length === 0) && (
          <div
            style={{
              padding: 'var(--space-6)',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            No analytical communications data has been indexed for this mailbox yet.
          </div>
        )}
      </div>
    </div>
  );
};
