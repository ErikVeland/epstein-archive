import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SEO } from '@client/components/common/SEO';
import Icon from '@client/components/common/Icon';
import { SensitiveWarningBanner } from '@client/components/common/SensitiveWarningBanner';
import { Surface, Flex, LqText, Button } from '@client/design-system/lib';
import styles from './SharedDetailPage.module.css';

interface Testimony {
  id: string;
  title: string;
  survivorName: string;
  filingDate: string;
  locationNamed: string;
}

interface TestimoniesResponse {
  testimonies: Testimony[];
}

export const SurvivorTrackingPage: React.FC = () => {
  const [acceptedWarning, setAcceptedWarning] = useState(() => {
    return localStorage.getItem('acceptedSensitiveWarning') === 'true';
  });

  const { data, isLoading, isError } = useQuery<TestimoniesResponse>({
    queryKey: ['testimonies'],
    queryFn: async () => {
      const response = await fetch('/api/testimonies');
      if (!response.ok) throw new Error('Failed to fetch survivor testimonies');
      return (await response.json()) as TestimoniesResponse;
    },
    enabled: acceptedWarning,
  });

  const handleAcceptWarning = () => {
    localStorage.setItem('acceptedSensitiveWarning', 'true');
    setAcceptedWarning(true);
  };

  if (!acceptedWarning) {
    return (
      <main className={styles.page}>
        <SEO
          title="Sensitive Content Access Gate"
          description="Access verification for witness testimonies and legal records."
          canonical="https://epstein.academy/survivors"
        />
        <SensitiveWarningBanner onAccept={handleAcceptWarning} />
      </main>
    );
  }

  const testimonies = data?.testimonies ?? [];

  return (
    <main className={styles.page}>
      <SEO
        title="Survivor & Witness Testimonies Tracker"
        description="Browse survivor depositions, confidential witness statements, and corroborated testimony filings."
        canonical="https://epstein.academy/survivors"
      />

      <Link className={styles.crumb} to="/intelligence">
        <Icon name="ArrowLeft" size="sm" />
        Intelligence
      </Link>

      <Surface variant="panel" className={styles.hero}>
        <div className={styles.kicker}>
          <span
            className={styles.badge}
            style={{
              background: 'rgba(255, 77, 79, 0.1)',
              color: '#ff4d4f',
              border: '1px solid rgba(255, 77, 79, 0.2)',
            }}
          >
            Confidential Records
          </span>
          <span className={styles.badge}>Depositions</span>
        </div>
        <h1 className={styles.title}>Survivor & Witness Testimonies</h1>
        <p className={styles.subtitle}>
          Surfacing public witness testimonies, cross-corroborating locations (Palm Beach,
          Manhattan, Zorro Ranch), and ensuring survivor voices are structured with linkable archive
          files.
        </p>
      </Surface>

      <div
        style={{
          marginTop: 'var(--space-6)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        {isLoading ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Retrieving testimonies and witness records...
          </div>
        ) : isError ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--status-error)',
            }}
          >
            Failed to load witness testimonies.
          </div>
        ) : testimonies.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No testimony records indexed under this classification.
          </div>
        ) : (
          testimonies.map((test) => (
            <Surface
              key={test.id}
              variant="panel"
              style={{
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
              }}
            >
              <div>
                <Flex align="center" justify="between" style={{ marginBottom: 'var(--space-3)' }}>
                  <span
                    style={{
                      background: 'rgba(255, 77, 79, 0.08)',
                      color: '#ff4d4f',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      border: '1px solid rgba(255, 77, 79, 0.15)',
                    }}
                  >
                    TESTIMONY
                  </span>
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 'semibold',
                    }}
                  >
                    {test.filingDate ? new Date(test.filingDate).toLocaleDateString() : '—'}
                  </span>
                </Flex>

                <LqText
                  variant="small"
                  weight="bold"
                  style={{
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-2)',
                    display: 'block',
                    fontSize: '1rem',
                    lineHeight: '1.4',
                  }}
                >
                  {test.title}
                </LqText>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    marginTop: 'var(--space-3)',
                  }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Witness/Survivor:</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'medium' }}>
                      {test.survivorName}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Corroborated Location:</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'medium' }}>
                      {test.locationNamed}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-5)' }}>
                <Link
                  to={`/documents/${encodeURIComponent(test.id)}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <Button
                    unstyled
                    style={{
                      width: '100%',
                      background: 'rgba(255, 77, 79, 0.05)',
                      color: '#ff4d4f',
                      border: '1px solid rgba(255, 77, 79, 0.15)',
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 'bold',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 'var(--space-1)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 77, 79, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 77, 79, 0.05)';
                    }}
                  >
                    <Icon name="ExternalLink" size="xs" />
                    Inspect Testimony
                  </Button>
                </Link>
              </div>
            </Surface>
          ))
        )}
      </div>
    </main>
  );
};

export default SurvivorTrackingPage;
