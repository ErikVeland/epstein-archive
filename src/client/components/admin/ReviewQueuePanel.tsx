import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Textarea } from '@client/design-system/lib';
import Icon from '@client/components/common/Icon';
import { ProvenanceBadge } from '@client/components/common/ProvenanceBadge';
import type { ExtractionMethod, ReviewState } from '@shared/dto/provenance';
import styles from './ReviewQueuePanel.module.css';

type ReviewStatus = ReviewState;

interface ReviewItem {
  id: string;
  type:
    | 'alias_conflict'
    | 'duplicate_entity'
    | 'conflicting_dates'
    | 'weak_confidence'
    | 'missing_provenance'
    | 'unreviewed_claim';
  subjectId: string;
  subjectName?: string;
  ingestRunId: string;
  status: ReviewStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
  payloadJson: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    confidence?: number;
    sourceHash?: string;
    extractionMethod?: ExtractionMethod;
  };
  notes?: string;
  rejectionReason?: string;
  assignedTo?: string;
  deferredUntil?: string;
  createdAt: string;
}

const getItemDescription = (item: ReviewItem): string => {
  switch (item.type) {
    case 'alias_conflict':
      return `Multiple names may refer to the same entity`;
    case 'duplicate_entity':
      return `${item.subjectName || 'Entity'} may be a duplicate`;
    case 'conflicting_dates':
      return 'Multiple sources give different dates';
    case 'weak_confidence':
      return `Extraction has only ${Math.round((item.payloadJson.confidence || 0) * 100)}% confidence`;
    case 'missing_provenance':
      return 'No linked source document';
    case 'unreviewed_claim':
      return `Claim about ${item.subjectName || 'entity'} needs review`;
    default:
      return 'Needs review';
  }
};

export const ReviewQueuePanel: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<ReviewItem[]>({
    queryKey: ['admin-review-queue'],
    queryFn: async () => {
      const res = await fetch('/api/admin/review-queue');
      return res.json() as Promise<ReviewItem[]>;
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: ReviewStatus;
      reason?: string;
    }) => {
      const res = await fetch(`/api/admin/review-queue/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason, notes: reviewNote }),
      });
      if (!res.ok) throw new Error('Decision failed');
    },
    onSuccess: () => {
      setSelectedId(null);
      setReviewNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-review-queue'] });
    },
  });

  const handleDecision = (id: string, status: ReviewStatus, reason?: string) => {
    decisionMutation.mutate({ id, status, reason });
  };

  const getListItemClassName = (selected: boolean) =>
    `${styles.listItem} ${selected ? styles.listItemSelected : ''}`;

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    return labels[priority] || 'Medium';
  };

  const reviewCounts = {
    unreviewed: items.filter((i) => i.status === 'unreviewed').length,
    accepted: items.filter((i) => i.status === 'accepted').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
    deferred: items.filter((i) => i.status === 'deferred').length,
  };

  if (isLoading) return <div className={styles.loadingState}>Loading review queue...</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <Icon name="Shield" className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>Review Queue ({items.length} items)</h2>
        </div>
        <div className={styles.countBadges}>
          <span className={`${styles.countBadge} ${styles.unreviewedBadge}`}>
            {reviewCounts.unreviewed} Unreviewed
          </span>
          {reviewCounts.deferred > 0 && (
            <span className={`${styles.countBadge} ${styles.deferredBadge}`}>
              {reviewCounts.deferred} Deferred
            </span>
          )}
          <Button
            unstyled
            onClick={() => void refetch()}
            title="Refresh queue"
            className={styles.refreshButton}
          >
            <Icon name="RefreshCw" size="sm" />
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summaryBar}>
        <span>
          Conflicts:{' '}
          {items.filter((i) => i.type === 'alias_conflict' || i.type === 'duplicate_entity').length}
        </span>
        <span>
          Missing Provenance: {items.filter((i) => i.type === 'missing_provenance').length}
        </span>
        <span>Low Confidence: {items.filter((i) => i.type === 'weak_confidence').length}</span>
      </div>

      <div className={styles.layout}>
        {/* List Pane */}
        <div className={styles.listPane}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <Icon name="CheckCircle" className={styles.emptyIcon} />
              <p>
                All caught up! No unresolved conflicts, missing provenance, or weak-confidence
                items.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <Button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
                variant="ghost"
                size="sm"
                className={getListItemClassName(selectedId === item.id)}
              >
                <div className={styles.listItemHeader}>
                  <span className={styles.listItemType}>{item.type.replace(/_/g, ' ')}</span>
                  <ProvenanceBadge
                    sourceHash={item.payloadJson.sourceHash}
                    reviewState={item.status}
                    confidence={item.payloadJson.confidence}
                    extractionMethod={item.payloadJson.extractionMethod}
                    showLabel={false}
                  />
                  {item.priority === 'critical' || item.priority === 'high' ? (
                    <span className={styles.priorityLabel}>{getPriorityLabel(item.priority)}</span>
                  ) : null}
                </div>
                <div className={styles.listItemSubject}>{item.subjectName || item.subjectId}</div>
                <div className={styles.listItemDescription}>{getItemDescription(item)}</div>
                <div className={styles.listItemTimestamp}>
                  <Icon name="Clock" className={styles.timestampIcon} />
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </Button>
            ))
          )}
        </div>

        {/* Detail Pane */}
        <div className={styles.detailPane}>
          {selectedId ? (
            (() => {
              const item = items.find((i) => i.id === selectedId);
              if (!item) return null;
              return (
                <div className={styles.detailContent}>
                  <div className={styles.detailHeader}>
                    <div>
                      <h3 className={styles.detailTitle}>
                        {item.type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </h3>
                      <div className={styles.detailBadges}>
                        <ProvenanceBadge
                          sourceHash={item.payloadJson.sourceHash}
                          reviewState={item.status}
                          confidence={item.payloadJson.confidence}
                          showLabel={true}
                        />
                        <span className={styles.priorityBadge}>
                          {getPriorityLabel(item.priority)}
                        </span>
                      </div>
                    </div>
                    <Button
                      unstyled
                      onClick={() => setSelectedId(null)}
                      className={styles.closeButton}
                    >
                      <Icon name="X" size="sm" />
                    </Button>
                  </div>

                  {/* Description */}
                  <div className={styles.detailDescription}>{getItemDescription(item)}</div>

                  {/* Payload Comparison */}
                  <div className={styles.payloadGrid}>
                    <div className={styles.payloadSection}>
                      <label className={styles.payloadLabel}>Before</label>
                      <pre className={styles.payloadPre}>
                        {JSON.stringify(item.payloadJson.before, null, 2)}
                      </pre>
                    </div>
                    <div className={styles.payloadSection}>
                      <label className={`${styles.payloadLabel} ${styles.payloadLabelAccent}`}>
                        After (Agentic Output)
                      </label>
                      <pre className={`${styles.payloadPre} ${styles.payloadPreAccent}`}>
                        {JSON.stringify(item.payloadJson.after, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Notes */}
                  {(item.notes || item.rejectionReason) && (
                    <div className={styles.notesCard}>
                      <h4 className={styles.notesTitle}>
                        {item.rejectionReason ? 'Rejection Reason' : 'Review Notes'}
                      </h4>
                      <p className={styles.notesBody}>"{item.rejectionReason || item.notes}"</p>
                    </div>
                  )}

                  {/* Audit Log */}
                  {item.assignedTo && (
                    <div className={styles.auditInfo}>
                      <Icon name="User" size="sm" />
                      <span>Assigned to: {item.assignedTo}</span>
                    </div>
                  )}
                  {item.deferredUntil && (
                    <div className={styles.auditInfo}>
                      <Icon name="Clock" size="sm" />
                      <span>
                        Deferred until: {new Date(item.deferredUntil).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={styles.decisionSection}>
                    <Textarea
                      placeholder="Add review notes or rejection reason... (optional)"
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className={styles.reviewTextarea}
                    />

                    <div className={styles.decisionButtons}>
                      <div className={styles.decisionGroup}>
                        <span className={styles.decisionGroupLabel}>Accept</span>
                        <Button
                          onClick={() => handleDecision(item.id, 'accepted')}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={`${styles.decisionButton} ${styles.decisionApprove}`}
                          disabled={decisionMutation.isPending}
                        >
                          <Icon name="CheckCircle" className={styles.decisionIcon} />
                          Verify & Accept
                        </Button>
                      </div>

                      <div className={styles.decisionGroup}>
                        <span className={styles.decisionGroupLabel}>Reject</span>
                        <Button
                          onClick={() => {
                            handleDecision(item.id, 'rejected', reviewNote || undefined);
                          }}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={`${styles.decisionButton} ${styles.decisionReject}`}
                          disabled={decisionMutation.isPending}
                        >
                          <Icon name="XCircle" className={styles.decisionIcon} />
                          Reject
                        </Button>
                      </div>

                      <div className={styles.decisionGroup}>
                        <span className={styles.decisionGroupLabel}>Defer</span>
                        <Button
                          onClick={() => handleDecision(item.id, 'deferred')}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={`${styles.decisionButton} ${styles.decisionDefer}`}
                          disabled={decisionMutation.isPending}
                        >
                          <Icon name="Clock" className={styles.decisionIcon} />
                          Defer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className={styles.placeholder}>
              <Icon name="Eye" className={styles.placeholderIcon} />
              <p>Select an item to begin review</p>
              <p className={styles.placeholderHint}>
                Review queue items include alias conflicts, duplicate entities, missing provenance,
                and low-confidence extractions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
