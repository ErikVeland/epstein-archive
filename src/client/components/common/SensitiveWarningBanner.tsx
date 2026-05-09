import React from 'react';
import { Surface, Button, LqText } from '@client/design-system/lib';

export const SensitiveWarningBanner: React.FC<{ onAccept: () => void }> = ({ onAccept }) => {
  return (
    <Surface
      variant="glass"
      style={{
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid #ff4d4f',
        background: 'rgba(255, 77, 79, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        maxWidth: '600px',
        margin: 'var(--space-12) auto',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          color: '#ff4d4f',
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: 'bold',
          letterSpacing: '0.05em',
        }}
      >
        SENSITIVE CONTENT WARNING
      </h2>
      <LqText variant="small" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        This research layer contains highly sensitive information, survivor testimonies, and
        depositions regarding victims and witnesses. The following material details abuse and may be
        distressing. Please proceed with caution and utmost respect.
      </LqText>
      <Button
        unstyled
        onClick={onAccept}
        style={{
          background: '#ff4d4f',
          color: '#fff',
          fontWeight: 'bold',
          padding: 'var(--space-3) var(--space-6)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          alignSelf: 'center',
          border: 'none',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ff7875';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#ff4d4f';
        }}
      >
        I Understand, Proceed to Testimony Records
      </Button>
    </Surface>
  );
};
