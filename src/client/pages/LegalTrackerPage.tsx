import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SEO } from '@client/components/common/SEO';
import Icon from '@client/components/common/Icon';
import { Surface, Flex, LqText, Button } from '@client/design-system/lib';
import styles from './SharedDetailPage.module.css';

interface Proceeding {
  id: string;
  title: string;
  caseNumber: string;
  jurisdiction: string;
  filingDate: string;
  evidenceType: string;
}

interface ProceedingsResponse {
  proceedings: Proceeding[];
}

export const LegalTrackerPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery<ProceedingsResponse>({
    queryKey: ['legal-proceedings'],
    queryFn: async () => {
      const response = await fetch('/api/legal-proceedings');
      if (!response.ok) throw new Error('Failed to fetch legal proceedings');
      return (await response.json()) as ProceedingsResponse;
    },
  });

  const proceedings = data?.proceedings ?? [];

  return (
    <main className={styles.page}>
      <SEO
        title="Court Proceedings & Legal Records"
        description="Browse legal proceedings, depositions, court transcripts, and case exhibits from the public archive."
        canonical="https://epstein.academy/legal-proceedings"
      />

      <Link className={styles.crumb} to="/intelligence">
        <Icon name="ArrowLeft" size="sm" />
        Intelligence
      </Link>

      <Surface variant="panel" className={styles.hero}>
        <div className={styles.kicker}>
          <span className={styles.badge}>Court Records</span>
          <span className={styles.badge}>Depositions & Transcripts</span>
        </div>
        <h1 className={styles.title}>Court Proceedings & Legal Tracker</h1>
        <p className={styles.subtitle}>
          Track structured cases (SDNY, EDNY, congressional hearings) and index transcripts,
          depositions, motions, and evidence exhibits related to active investigations.
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
            Retrieving legal records from database...
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
            Failed to load legal proceedings.
          </div>
        ) : proceedings.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: 'var(--space-8)',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No legal proceedings records indexed.
          </div>
        ) : (
          proceedings.map((proc) => (
            <Surface
              key={proc.id}
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
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--accent)',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {proc.caseNumber}
                  </span>
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem',
                      fontWeight: 'semibold',
                    }}
                  >
                    {proc.filingDate ? new Date(proc.filingDate).toLocaleDateString() : '—'}
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
                  {proc.title}
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
                    <span style={{ color: 'var(--text-muted)' }}>Jurisdiction:</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 'medium' }}>
                      {proc.jurisdiction}
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Doc Type:</span>
                    <span
                      style={{
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                      }}
                    >
                      {proc.evidenceType || 'Court Record'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 'var(--space-5)' }}>
                <Link
                  to={`/documents/${encodeURIComponent(proc.id)}`}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <Button
                    unstyled
                    style={{
                      width: '100%',
                      background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                      color: 'var(--accent)',
                      border: '1px solid var(--glass-border)',
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
                      e.currentTarget.style.background =
                        'color-mix(in srgb, var(--accent) 15%, transparent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        'color-mix(in srgb, var(--accent) 10%, transparent)';
                    }}
                  >
                    <Icon name="ExternalLink" size="xs" />
                    Inspect File
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

export default LegalTrackerPage;
