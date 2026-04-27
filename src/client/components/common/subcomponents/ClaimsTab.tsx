import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Info, BrainCircuit } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { Box, LqText, Surface } from '../../../design-system/lib';
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
}

interface ClaimsTabProps {
  documentId?: string;
  entityId?: string;
  onOpenEntity?: (id: string) => void;
  onOpenDocument?: (id: string) => void;
}

export const ClaimsTab: React.FC<ClaimsTabProps> = ({
  documentId,
  entityId,
  onOpenEntity,
  onOpenDocument,
}) => {
  const queryClient = useQueryClient();

  const {
    data: claims = [],
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
        <XCircle size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
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
        <BrainCircuit size={48} opacity={0.3} style={{ marginBottom: '1rem' }} />
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

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return '#10b981';
    if (conf >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <LqText variant="h3" weight="bold">
            AI-Extracted Claims
          </LqText>
          <LqText variant="small" color="muted">
            Structured relational data automatically extracted by the forensic intelligence agent.
          </LqText>
        </div>
        <Surface variant="glass-highlight" className={styles.verifiedBadge}>
          <Info size={14} />
          <span>Requires Human Verification</span>
        </Surface>
      </div>

      <div className={styles.claimsList}>
        {claims.map((claim) => (
          <Surface key={claim.id} variant="glass-strong" className={styles.claimCard}>
            <div className={styles.claimHeader}>
              <span
                className={styles.confidenceBadge}
                style={{
                  backgroundColor: `${getConfidenceColor(claim.confidence)}20`,
                  color: getConfidenceColor(claim.confidence),
                }}
              >
                {Math.round(claim.confidence * 100)}% Confidence
              </span>

              {claim.verified === 1 && (
                <div className={styles.verifiedBadge}>
                  <CheckCircle2 size={14} />
                  <span>Verified by {claim.verifiedBy}</span>
                </div>
              )}
              {claim.verified === 2 && (
                <div className={styles.rejectedBadge}>
                  <XCircle size={14} />
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
                <button
                  className={styles.rejectBtn}
                  onClick={() => {
                    const reason = window.prompt('Reason for rejection?');
                    if (reason !== null) {
                      verifyMutation.mutate({ id: claim.id, status: 2, reason });
                    }
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
              </div>
            )}
          </Surface>
        ))}
      </div>
    </div>
  );
};
