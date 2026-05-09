import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SEO } from '@client/components/common/SEO';
import Icon from '@client/components/common/Icon';
import { Surface, Flex, LqText } from '@client/design-system/lib';
import styles from './SharedDetailPage.module.css';

interface CorroboratedClaim {
  subjectId: string;
  subjectName: string;
  predicate: string;
  objectId: string | null;
  objectName: string | null;
  objectText: string | null;
  corroborationCount: number;
  documents: Array<{ id: string; title: string }>;
}

interface CorroboratedClaimsResponse {
  corroborated: CorroboratedClaim[];
}

export const CorroborationPage: React.FC = () => {
  const { data, isLoading, isError } = useQuery<CorroboratedClaimsResponse>({
    queryKey: ['corroborated-claims'],
    queryFn: async () => {
      const response = await fetch('/api/claims/corroborated');
      if (!response.ok) throw new Error('Failed to fetch corroborated claims');
      return (await response.json()) as CorroboratedClaimsResponse;
    },
  });

  const claims = data?.corroborated ?? [];

  return (
    <main className={styles.page}>
      <SEO
        title="Cross-Document Corroboration Hub"
        description="View machine-extracted claims that have been corroborated across multiple independent documents."
        canonical="https://epstein.academy/claims/corroborated"
      />

      <Link className={styles.crumb} to="/intelligence">
        <Icon name="ArrowLeft" size="sm" />
        Intelligence
      </Link>

      <Surface variant="panel" className={styles.hero}>
        <div className={styles.kicker}>
          <span className={styles.badge}>Multi-Source Intelligence</span>
          <span className={styles.badge}>Cross-Document Corroboration</span>
        </div>
        <h1 className={styles.title}>Cross-Document Corroboration Hub</h1>
        <p className={styles.subtitle}>
          This workbench aggregates claims (Subject-Predicate-Object triples) that are found across
          multiple independent files. Multi-source corroboration is how investigators build
          bulletproof cases.
        </p>
      </Surface>

      <div
        style={{
          marginTop: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {isLoading ? (
          <div
            style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}
          >
            Analyzing cross-document corroboration data...
          </div>
        ) : isError ? (
          <div
            style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--status-error)' }}
          >
            Failed to load corroborated claims.
          </div>
        ) : claims.length === 0 ? (
          <div
            style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}
          >
            No multi-document corroborated claims found yet.
          </div>
        ) : (
          claims.map((claim, idx) => {
            const claimText = `${claim.subjectName} ${claim.predicate} ${claim.objectName || claim.objectText}`;
            return (
              <Surface key={idx} variant="panel" style={{ padding: 'var(--space-5)' }}>
                <Flex align="center" justify="between" gap="md" style={{ flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <LqText
                      variant="small"
                      weight="bold"
                      style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}
                    >
                      {claimText}
                    </LqText>
                    <div
                      style={{
                        marginTop: 'var(--space-2)',
                        display: 'flex',
                        gap: 'var(--space-2)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                          color: 'var(--accent)',
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                        }}
                      >
                        Subject: {claim.subjectName}
                      </span>
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-muted)',
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                        }}
                      >
                        Predicate: {claim.predicate}
                      </span>
                      <span
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          padding: 'var(--space-1) var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                        }}
                      >
                        Object: {claim.objectName || claim.objectText}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        background: 'color-mix(in srgb, var(--status-success) 15%, transparent)',
                        color: 'var(--status-success)',
                        padding: 'var(--space-2) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        display: 'inline-block',
                      }}
                    >
                      <Icon name="FileText" size="xs" style={{ marginRight: 'var(--space-1)' }} />
                      Corroborated by {claim.corroborationCount} Documents
                    </span>
                  </div>
                </Flex>

                <div
                  style={{
                    marginTop: 'var(--space-4)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--glass-border)',
                  }}
                >
                  <LqText
                    variant="xs"
                    color="muted"
                    weight="semibold"
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Backing Evidence Documents
                  </LqText>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {claim.documents.map((doc) => (
                      <Link
                        key={doc.id}
                        to={`/documents/${encodeURIComponent(doc.id)}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          color: 'var(--accent)',
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          padding: 'var(--space-2)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid transparent',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'var(--glass-border)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                      >
                        <Icon name="Link" size="xs" />
                        <span>{doc.title || `Document ${doc.id}`}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </Surface>
            );
          })
        )}
      </div>
    </main>
  );
};

export default CorroborationPage;
