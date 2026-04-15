import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, AlertTriangle, Eye, Clock } from 'lucide-react';
import { Button, Textarea } from '../../design-system/lib';
import styles from './ReviewQueuePanel.module.css';

interface ReviewItem {
  id: string;
  type: string;
  subjectId: string;
  ingestRunId: string;
  status: 'pending' | 'reviewed' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  payloadJson: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  notes?: string;
  createdAt: string;
}

export const ReviewQueuePanel: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

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

  const handleDecision = async (id: string, decision: 'reviewed' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/review-queue/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: decision, notes: reviewNote }),
      });
      if (res.ok) {
        setSelectedId(null);
        setReviewNote('');
        await refetch();
      }
    } catch (err) {
      console.error('Decision failed:', err);
    }
  };

  const getListItemClassName = (selected: boolean) =>
    `${styles.listItem} ${selected ? styles.listItemSelected : ''}`;

  if (isLoading) return <div className={styles.loadingState}>Loading forensics queue...</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <Shield className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>Agentic Review Queue</h2>
        </div>
        <span className={styles.countBadge}>{items.length} PENDING</span>
      </div>

      <div className={styles.layout}>
        {/* List Pane */}
        <div className={styles.listPane}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle className={styles.emptyIcon} />
              <p>Queue Clear. All agentic transformations vetted.</p>
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
                  <span className={styles.listItemType}>{item.type}</span>
                  {item.priority === 'high' && <AlertTriangle className={styles.priorityIcon} />}
                </div>
                <div className={styles.listItemSubject}>{item.subjectId}</div>
                <div className={styles.listItemTimestamp}>
                  <Clock className={styles.timestampIcon} />
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
                        {item.type.replace('_', ' ').toUpperCase()}
                      </h3>
                      <p className={styles.detailId}>ID: {item.id}</p>
                    </div>
                  </div>

                  <div className={styles.payloadGrid}>
                    <div className={styles.payloadSection}>
                      <label className={styles.payloadLabel}>Baseline (Before)</label>
                      <pre className={styles.payloadPre}>
                        {JSON.stringify(item.payloadJson.before, null, 2)}
                      </pre>
                    </div>
                    <div className={styles.payloadSection}>
                      <label className={`${styles.payloadLabel} ${styles.payloadLabelAccent}`}>
                        Agentic Output (After)
                      </label>
                      <pre className={`${styles.payloadPre} ${styles.payloadPreAccent}`}>
                        {JSON.stringify(item.payloadJson.after, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className={styles.notesCard}>
                    <h4 className={styles.notesTitle}>Automated Evidence Notes</h4>
                    <p className={styles.notesBody}>"{item.notes}"</p>
                  </div>

                  <div className={styles.decisionSection}>
                    <Textarea
                      placeholder="Add forensic review notes..."
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      className={styles.reviewTextarea}
                    />
                    <div className={styles.decisionButtons}>
                      <Button
                        onClick={() => handleDecision(item.id, 'reviewed')}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={`${styles.decisionButton} ${styles.decisionApprove}`}
                      >
                        <CheckCircle className={styles.decisionIcon} />
                        VET & COMMIT
                      </Button>
                      <Button
                        onClick={() => handleDecision(item.id, 'rejected')}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className={`${styles.decisionButton} ${styles.decisionReject}`}
                      >
                        <XCircle className={styles.decisionIcon} />
                        REJECT & PURGE
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className={styles.placeholder}>
              <Eye className={styles.placeholderIcon} />
              <p>Select an item to begin forensic review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
