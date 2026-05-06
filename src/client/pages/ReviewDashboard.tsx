import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { apiClient } from '@client/services/apiClient';
import { useToasts } from '@client/components/common/useToasts';
import {
  Surface,
  Flex,
  Box,
  LqText,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Textarea,
} from '@client/design-system/lib';
import type { SpaceValue } from '@client/design-system/lib/resolveSpace';
import styles from './ReviewDashboard.module.css';

interface MentionQueueItem {
  id: number;
  entity_name: string;
  document_id: number;
  file_name: string;
  mention_context: string;
  confidence_score: number;
  signal_score: number;
}

interface ClaimQueueItem {
  id: number;
  subject_entity_id: number;
  subject_entity_name: string | null;
  predicate: string;
  object_text: string;
  confidence: number;
  signal_score: number;
  file_name: string;
}

interface RejectState {
  id: number;
  type: 'mentions' | 'claims';
  reason: string;
}

export function ReviewDashboard() {
  const { addToast } = useToasts();
  const [activeTab, setActiveTab] = useState<'mentions' | 'claims'>('mentions');
  const [mentions, setMentions] = useState<MentionQueueItem[]>([]);
  const [claims, setClaims] = useState<ClaimQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectState, setRejectState] = useState<RejectState | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'mentions') {
        const json = await apiClient.get<MentionQueueItem[]>('/review/mentions/queue?limit=50');
        setMentions(Array.isArray(json) ? json : []);
      } else {
        const json = await apiClient.get<ClaimQueueItem[]>('/review/claims/queue?limit=50');
        setClaims(Array.isArray(json) ? json : []);
      }
    } catch (e) {
      addToast({ text: 'Failed to load review queue', type: 'error' });
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, addToast]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const verifyItem = async (id: number, type: 'mentions' | 'claims') => {
    try {
      await apiClient.post(`/review/${type}/${id}/verify`, {});
      if (type === 'mentions') setMentions((p) => p.filter((x) => x.id !== id));
      else setClaims((p) => p.filter((x) => x.id !== id));
      addToast({ text: 'Item verified', type: 'success' });
    } catch (e) {
      addToast({ text: 'Failed to verify item', type: 'error' });
      console.error(e);
    }
  };

  const openRejectDialog = (id: number, type: 'mentions' | 'claims') => {
    setRejectState({ id, type, reason: '' });
  };

  const submitRejection = async () => {
    if (!rejectState || !rejectState.reason.trim()) return;
    setIsRejecting(true);
    try {
      await apiClient.post(`/review/${rejectState.type}/${rejectState.id}/reject`, {
        rejection_reason: rejectState.reason.trim(),
      });
      if (rejectState.type === 'mentions') {
        setMentions((p) => p.filter((x) => x.id !== rejectState.id));
      } else {
        setClaims((p) => p.filter((x) => x.id !== rejectState.id));
      }
      addToast({ text: 'Item rejected', type: 'success' });
      setRejectState(null);
    } catch (e) {
      addToast({ text: 'Failed to reject item', type: 'error' });
      console.error(e);
    } finally {
      setIsRejecting(false);
    }
  };

  const confidenceClassName = (value: number) =>
    value > 0.8 ? styles.scorePillHigh : styles.scorePillMedium;

  return (
    <Box className={`app-backdrop ${styles.page}`}>
      <Box className={styles.pageInner}>
        <Flex align="center" justify="between" className={styles.header}>
          <Box>
            <LqText as="h1" variant="h1" color="accent" className={styles.title}>
              <Icon name="Shield" className={styles.titleIcon} />
              Active Learning Review
            </LqText>
            <LqText as="p" variant="body" color="muted" weight="light" className={styles.subtitle}>
              Verify high-signal extractions to train the system.
            </LqText>
          </Box>
        </Flex>

        {/* Tabs */}
        <Flex gap={8} className={styles.tabs}>
          <Button
            unstyled
            onClick={() => setActiveTab('mentions')}
            className={`${styles.tabButton} ${
              activeTab === 'mentions' ? styles.tabButtonActive : styles.tabButtonIdle
            }`}
          >
            Entity Mentions
            {activeTab === 'mentions' && <div className={styles.tabUnderline} />}
          </Button>
          <Button
            unstyled
            onClick={() => setActiveTab('claims')}
            className={`${styles.tabButton} ${
              activeTab === 'claims' ? styles.tabButtonActive : styles.tabButtonIdle
            }`}
          >
            Claims & Facts
            {activeTab === 'claims' && <div className={styles.tabUnderline} />}
          </Button>
        </Flex>

        <Surface variant="glass" className={styles.surfaceShell}>
          {loading ? (
            <Box className={styles.loadingState}>Loading queue...</Box>
          ) : (
            <Flex direction="column" className={styles.queueList}>
              {activeTab === 'mentions' &&
                mentions.map((item) => (
                  <Flex gap={4} key={item.id} className={styles.queueItem}>
                    <Box className={styles.queueItemAccent} />
                    <Box className={styles.queueItemContent}>
                      <Flex align="center" gap={3} className={styles.rowHeader}>
                        <span className={styles.entityName}>{item.entity_name}</span>
                        <span
                          className={`${styles.scorePill} ${confidenceClassName(item.confidence_score)}`}
                        >
                          Conf: {(item.confidence_score * 100).toFixed(0)}%
                        </span>
                        <span className={styles.signalPill}>
                          Signal: {(item.signal_score * 100).toFixed(0)}
                        </span>
                      </Flex>
                      <LqText as="p" variant="body" color="primary" className={styles.quoteBlock}>
                        &ldquo;...{item.mention_context}...&rdquo;
                      </LqText>
                      <Flex align="center" gap={1.5 as SpaceValue} className={styles.metaRow}>
                        Source: <span className={styles.metaValue}>{item.file_name}</span>
                        <Link to={`/evidence/${item.document_id}`} className={styles.sourceLink}>
                          <Icon name="ExternalLink" size="sm" className={styles.sourceLinkIcon} />
                        </Link>
                      </Flex>
                    </Box>
                    <Flex direction="column" gap={3} className={styles.actions}>
                      <Button
                        unstyled
                        onClick={() => verifyItem(item.id, 'mentions')}
                        className={`${styles.iconButton} ${styles.iconButtonApprove}`}
                        title="Verify"
                      >
                        <Icon name="Check" className={styles.actionIcon} />
                      </Button>
                      <Button
                        unstyled
                        onClick={() => openRejectDialog(item.id, 'mentions')}
                        className={`${styles.iconButton} ${styles.iconButtonReject}`}
                        title="Reject"
                      >
                        <Icon name="X" className={styles.actionIcon} />
                      </Button>
                    </Flex>
                  </Flex>
                ))}

              {activeTab === 'claims' &&
                claims.map((item) => (
                  <Flex gap={4} key={item.id} className={styles.queueItem}>
                    <Box className={styles.queueItemAccent} />
                    <Box className={styles.queueItemContent}>
                      <Flex align="center" gap={3} className={styles.rowHeader}>
                        <span className={styles.predicate}>{item.predicate}</span>
                        <span
                          className={`${styles.scorePill} ${confidenceClassName(item.confidence)}`}
                        >
                          Conf: {(item.confidence * 100).toFixed(0)}%
                        </span>
                      </Flex>
                      <LqText
                        as="p"
                        variant="body"
                        color="primary"
                        className={styles.claimStatement}
                      >
                        <span className={styles.claimSubject}>
                          {item.subject_entity_name ?? `Entity #${item.subject_entity_id}`}
                        </span>{' '}
                        <span className={styles.claimPredicate}>
                          {item.predicate.toLowerCase().replace(/_/g, ' ')}
                        </span>{' '}
                        <span className={styles.claimObject}>{item.object_text}</span>
                      </LqText>
                      <Flex align="center" gap={1.5 as SpaceValue} className={styles.metaRow}>
                        Source: <span className={styles.metaValue}>{item.file_name}</span>
                      </Flex>
                    </Box>
                    <Flex direction="column" gap={3} className={styles.actions}>
                      <Button
                        unstyled
                        onClick={() => verifyItem(item.id, 'claims')}
                        className={`${styles.iconButton} ${styles.iconButtonApprove}`}
                        title="Verify"
                      >
                        <Icon name="Check" className={styles.actionIcon} />
                      </Button>
                      <Button
                        unstyled
                        onClick={() => openRejectDialog(item.id, 'claims')}
                        className={`${styles.iconButton} ${styles.iconButtonReject}`}
                        title="Reject"
                      >
                        <Icon name="X" className={styles.actionIcon} />
                      </Button>
                    </Flex>
                  </Flex>
                ))}

              {(activeTab === 'mentions' ? mentions : claims).length === 0 && (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  className={styles.emptyState}
                >
                  <Flex align="center" justify="center" className={styles.emptyBadge}>
                    <Icon name="Check" className={styles.emptyBadgeIcon} />
                  </Flex>
                  <LqText as="h3" variant="h3" color="primary" className={styles.emptyTitle}>
                    Queue is Empty
                  </LqText>
                  <LqText as="p" variant="body" color="muted" className={styles.emptyBody}>
                    All pending items for this queue have been verified or rejected. Great work.
                  </LqText>
                </Flex>
              )}
            </Flex>
          )}
        </Surface>
      </Box>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectState !== null}
        onOpenChange={(open) => {
          if (!open) setRejectState(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Extraction</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. This helps calibrate the extraction model.
            </DialogDescription>
          </DialogHeader>
          <Flex direction="column" gap="md" style={{ marginTop: 'var(--space-4)' }}>
            <Textarea
              value={rejectState?.reason ?? ''}
              onChange={(e) =>
                setRejectState((prev) => (prev ? { ...prev, reason: e.target.value } : prev))
              }
              placeholder="e.g. Entity name mismatch, out of context, incorrect attribution..."
              rows={4}
              autoFocus
            />
            <Flex gap="sm" justify="end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectState(null)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={submitRejection}
                disabled={isRejecting || !rejectState?.reason.trim()}
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </Button>
            </Flex>
          </Flex>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
