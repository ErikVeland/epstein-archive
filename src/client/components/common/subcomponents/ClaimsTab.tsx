import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { apiClient } from '@client/services/apiClient';
import { Box } from '@client/design-system/components/layout/Box';
import { LqText } from '@client/design-system/components/typography/Text';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { ConfidenceBadge } from '@client/components/common/ConfidenceBadge';
import { ProvenanceBadge } from '@client/components/common/ProvenanceBadge';
import type { ExtractionMethod, ProvenanceStatus, ReviewState } from '@shared/dto/provenance';
import styles from './ClaimsTab.module.css';

interface ClaimTriple {
  id: string;
  documentId: string;
  subjectEntityId: string | null;
  objectEntityId: string | null;
  predicate: string | null;
  objectText: string | null;
  claimText: string | null;
  confidence: number;
  modality: string;
  verified: number; // 0=unverified, 1=verified, 2=rejected
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  subjectName?: string;
  objectName?: string;
  documentTitle?: string;
  sourceDocumentId?: number | null;
  sourceHash?: string | null;
  extractionMethod?: ExtractionMethod | null;
  reviewState?: ReviewState;
  provenanceStatus?: ProvenanceStatus;
}

interface ClaimsTabProps {
  documentId?: string;
  entityId?: string;
  onOpenEntity?: (id: string) => void;
  onOpenDocument?: (id: string) => void;
}

interface DashboardSnapshot {
  claimTriples?: ClaimTriple[];
}

async function loadClaimSnapshot(): Promise<ClaimTriple[]> {
  const response = await fetch('/data/dashboard_snapshot.json');
  if (!response.ok) return [];
  const snapshot = (await response.json()) as DashboardSnapshot;
  return snapshot.claimTriples || [];
}

export const ClaimsTab: React.FC<ClaimsTabProps> = ({
  documentId,
  entityId,
  onOpenEntity,
  onOpenDocument,
}) => {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const getClaimReviewState = (claim: ClaimTriple): ReviewState => {
    if (claim.reviewState) return claim.reviewState;
    if (claim.verified === 1) return 'accepted';
    if (claim.verified === 2) return 'rejected';
    return 'unreviewed';
  };

  const getClaimSourceDocumentId = (claim: ClaimTriple): number | null => {
    if (typeof claim.sourceDocumentId === 'number') return claim.sourceDocumentId;
    const parsed = Number(claim.documentId);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const {
    data: rawClaims = [],
    isLoading,
    isError,
    error,
  } = useQuery<ClaimTriple[]>({
    queryKey: ['claims', documentId || entityId],
    queryFn: () =>
      documentId
        ? apiClient.getDocumentClaims<ClaimTriple>(documentId)
        : apiClient.getEntityClaims<ClaimTriple>(entityId!),
    enabled: !!(documentId || entityId),
  });

  const { data: snapshotClaims = [] } = useQuery<ClaimTriple[]>({
    queryKey: ['claims-snapshot'],
    queryFn: loadClaimSnapshot,
  });

  // Only fall back to snapshot when there is no entity/document scope — never substitute
  // a global snapshot for a scoped empty result, as that would misattribute claims.
  const hasScope = !!(documentId || entityId);
  const claims = rawClaims.length > 0 || hasScope ? rawClaims : snapshotClaims;
  const isSnapshot = !hasScope && rawClaims.length === 0 && snapshotClaims.length > 0;

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: number; reason?: string }) =>
      apiClient.verifyClaim(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });

  if (isLoading) {
    return (
      <div className={styles.emptyState}>
        <div className="spinner" />
        <LqText variant="body" color="muted">
          Analyzing forensic claims...
        </LqText>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.emptyState}>
        <Icon name="XCircle" size="xl" style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <LqText variant="h3" weight="bold">
          Claims could not be loaded
        </LqText>
        <LqText variant="body" color="muted">
          {error instanceof Error ? error.message : 'The claims endpoint returned an error.'}
        </LqText>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon name="BrainCircuit" size="xl" style={{ marginBottom: '1rem', opacity: 0.3 }} />
        <LqText variant="h3" weight="bold">
          No AI Claims Found
        </LqText>
        <LqText variant="body" color="muted">
          AI extraction has not identified specific subject-predicate-object claims for this{' '}
          {documentId ? 'document' : 'entity'}.
        </LqText>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <LqText variant="h3" weight="bold">
            AI-Extracted Claims
          </LqText>
          <LqText variant="small" color="muted">
            {isSnapshot
              ? 'Latest extracted claim snapshot while this record awaits document-specific enrichment.'
              : 'Structured relational data automatically extracted by the forensic intelligence agent.'}
          </LqText>
        </div>
        <Surface variant="glass-highlight" className={styles.verifiedBadge}>
          <Icon name="Info" size="sm" />
          <span>Requires Human Verification</span>
        </Surface>
      </div>

      <div className={styles.claimsList}>
        {claims.map((claim) => (
          <Surface key={claim.id} variant="glass-strong" className={styles.claimCard}>
            <div className={styles.claimHeader}>
              <div className={styles.claimStatusGroup}>
                <ConfidenceBadge
                  confidence={claim.confidence}
                  showPercentage={true}
                  showIcon={true}
                />
                <ProvenanceBadge
                  sourceDocumentId={getClaimSourceDocumentId(claim)}
                  sourceHash={claim.sourceHash}
                  extractionMethod={claim.extractionMethod || 'agentic'}
                  confidence={claim.confidence}
                  reviewState={getClaimReviewState(claim)}
                  provenanceStatus={
                    claim.provenanceStatus ||
                    (claim.sourceHash || getClaimSourceDocumentId(claim) != null
                      ? 'partial'
                      : 'missing')
                  }
                  showLabel={false}
                />
              </div>

              {claim.verified === 1 && (
                <div className={styles.verifiedBadge}>
                  <Icon name="CheckCircle2" size="sm" />
                  <span>Verified by {claim.verifiedBy}</span>
                </div>
              )}
              {claim.verified === 2 && (
                <div className={styles.rejectedBadge}>
                  <Icon name="XCircle" size="sm" />
                  <span>Rejected: {claim.rejectionReason}</span>
                </div>
              )}
            </div>

            <div className={styles.triple}>
              <span
                className={styles.entityLink}
                onClick={() => claim.subjectEntityId && onOpenEntity?.(claim.subjectEntityId)}
              >
                {claim.subjectName || 'Unknown Entity'}
              </span>
              <span className={styles.predicate}>{claim.predicate || 'related to'}</span>
              {claim.objectEntityId ? (
                <span
                  className={styles.entityLink}
                  onClick={() => onOpenEntity?.(claim.objectEntityId!)}
                >
                  {claim.objectName || 'Unknown Entity'}
                </span>
              ) : (
                <span className={styles.objectText}>{claim.objectText || 'unknown'}</span>
              )}
            </div>

            {claim.claimText && (
              <div className={styles.fullClaim}>
                <LqText variant="body" italic>
                  "{claim.claimText}"
                </LqText>
              </div>
            )}

            {entityId && claim.documentTitle && (
              <Box mt="sm">
                <LqText variant="xs" color="muted">
                  Source:{' '}
                  <span
                    className={styles.entityLink}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => onOpenDocument?.(claim.documentId)}
                  >
                    {claim.documentTitle}
                  </span>
                </LqText>
              </Box>
            )}

            {claim.verified === 0 && (
              <div className={styles.actions}>
                {rejectingId === claim.id ? (
                  <div className={styles.rejectInline}>
                    <input
                      className={styles.rejectInput}
                      type="text"
                      placeholder="Reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          verifyMutation.mutate({ id: claim.id, status: 2, reason: rejectReason });
                          setRejectingId(null);
                          setRejectReason('');
                        }
                        if (e.key === 'Escape') {
                          setRejectingId(null);
                          setRejectReason('');
                        }
                      }}
                      autoFocus
                    />
                    <button
                      className={styles.rejectBtn}
                      onClick={() => {
                        verifyMutation.mutate({ id: claim.id, status: 2, reason: rejectReason });
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      className={styles.cancelBtn}
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => {
                        setRejectingId(claim.id);
                        setRejectReason('');
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className={styles.verifyBtn}
                      onClick={() => verifyMutation.mutate({ id: claim.id, status: 1 })}
                    >
                      Verify Claim
                    </button>
                  </>
                )}
              </div>
            )}
          </Surface>
        ))}
      </div>
    </div>
  );
};
