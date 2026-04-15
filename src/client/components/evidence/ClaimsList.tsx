import React from 'react';
import { ShieldCheck, ShieldAlert, BadgeCheck, HelpCircle } from 'lucide-react';
import styles from './ClaimsList.module.css';

import { Button } from '../../design-system/lib';

interface Claim {
  id: number;
  subject_name: string;
  predicate: string;
  object_name: string;
  modality: 'alleged' | 'testified' | 'documented' | 'quoted' | 'inferred' | 'denied' | 'unknown';
  confidence: number;
  evidence_json?: string;
  sentence_id?: number;
}

interface ClaimsListProps {
  claims: Claim[];
}

export function ClaimsList({ claims }: ClaimsListProps) {
  const [feedback, setFeedback] = React.useState<Record<number, 'verified' | 'rejected' | null>>(
    {},
  );

  if (!claims || claims.length === 0) return null;

  const handleFeedback = async (id: number, type: 'verify' | 'reject') => {
    try {
      const response = await fetch(`/api/active-learning/claims/${id}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body:
          type === 'reject'
            ? JSON.stringify({ rejection_reason: 'User manual rejection' })
            : JSON.stringify({}),
      });

      if (response.ok) {
        setFeedback((prev) => ({ ...prev, [id]: type === 'verify' ? 'verified' : 'rejected' }));
      }
    } catch (err) {
      console.error('Failed to send feedback:', err);
    }
  };

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'testified':
      case 'documented':
        return (
          <span title="High Reliability">
            <ShieldCheck className={`${styles.iconSm} ${styles.iconGreen}`} />
          </span>
        );
      case 'alleged':
      case 'denied':
        return (
          <span title="Disputed/Alleged">
            <ShieldAlert className={`${styles.iconSm} ${styles.iconOrange}`} />
          </span>
        );
      case 'inferred':
        return (
          <span title="Inferred by System">
            <HelpCircle className={`${styles.iconSm} ${styles.iconAccent}`} />
          </span>
        );
      default:
        return (
          <span title="Fact">
            <BadgeCheck className={`${styles.iconSm} ${styles.iconMuted}`} />
          </span>
        );
    }
  };

  const modalityClassMap: Record<string, string> = {
    testified: styles.modalityTestified,
    documented: styles.modalityDocumented,
    alleged: styles.modalityAlleged,
    denied: styles.modalityDenied,
    inferred: styles.modalityInferred,
    quoted: styles.modalityQuoted,
    unknown: styles.modalityUnknown,
  };

  const ModalityBadge = ({ modality }: { modality: string }) => {
    const variantClass = modalityClassMap[modality] ?? styles.modalityUnknown;
    return <span className={`${styles.modalityBadge} ${variantClass}`}>{modality}</span>;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.headerTitle}>
          <BadgeCheck className={`${styles.iconMd} ${styles.iconAccent}`} />
          Extracted Facts &amp; Claims
        </h3>
        <span className={styles.headerCount}>{claims.length} items</span>
      </div>
      <ul className={styles.list}>
        {claims.map((claim) => {
          const status = feedback[claim.id];
          const itemClass = [
            styles.listItem,
            status === 'rejected'
              ? styles.listItemRejected
              : status === 'verified'
                ? styles.listItemVerified
                : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={claim.id} className={itemClass}>
              <div className={styles.listItemInner}>
                <div className={styles.claimContent}>
                  <div className={styles.claimMeta}>
                    <ModalityBadge modality={claim.modality} />
                    {getModalityIcon(claim.modality)}
                    <span className={styles.confidenceText}>
                      {(claim.confidence * 100).toFixed(0)}% Conf.
                    </span>
                    {status && (
                      <span
                        className={
                          status === 'verified' ? styles.statusVerified : styles.statusRejected
                        }
                      >
                        &bull; {status}
                      </span>
                    )}
                  </div>
                  <p className={styles.claimText}>
                    <span className={styles.claimSubject}>{claim.subject_name}</span>{' '}
                    <span className={styles.claimPredicate}>
                      {claim.predicate.replace(/_/g, ' ')}
                    </span>{' '}
                    <span className={styles.claimObject}>{claim.object_name}</span>
                  </p>
                </div>
                {!status && (
                  <div className={styles.feedbackGroup}>
                    <Button
                      unstyled
                      onClick={() => handleFeedback(claim.id, 'verify')}
                      className={`${styles.feedbackBtn} ${styles.feedbackBtnVerify}`}
                      title="Verify this fact"
                    >
                      <BadgeCheck className={styles.iconMd} />
                    </Button>
                    <Button
                      unstyled
                      onClick={() => handleFeedback(claim.id, 'reject')}
                      className={`${styles.feedbackBtn} ${styles.feedbackBtnReject}`}
                      title="Reject this fact"
                    >
                      <ShieldAlert className={styles.iconMd} />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
