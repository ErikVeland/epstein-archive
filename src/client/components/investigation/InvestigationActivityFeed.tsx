import React, { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon, { type IconName } from '../common/Icon';
import styles from './InvestigationActivityFeed.module.css';
// import { Link } from 'react-router-dom';

interface ActivityItem {
  id: number;
  investigationId: number;
  userId: string;
  userName: string;
  actionType: string;
  targetType: string | null;
  targetId: string | null;
  targetTitle: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface InvestigationActivityFeedProps {
  investigationId: number | string;
  maxItems?: number;
  refreshInterval?: number; // ms, 0 to disable
  compact?: boolean;
}

const actionLabels: Record<string, string> = {
  evidence_added: 'added evidence',
  evidence_removed: 'removed evidence',
  hypothesis_added: 'created hypothesis',
  hypothesis_updated: 'updated hypothesis',
  hypothesis_deleted: 'deleted hypothesis',
  timeline_event_added: 'added timeline event',
  timeline_event_updated: 'updated timeline event',
  timeline_event_deleted: 'deleted timeline event',
  investigation_created: 'created investigation',
  investigation_updated: 'updated investigation',
  collaborator_added: 'added collaborator',
  collaborator_removed: 'removed collaborator',
  status_changed: 'changed status',
  notebook_updated: 'updated notebook',
};

const targetTypeIcons: Record<string, string> = {
  entity: 'User',
  document: 'FileText',
  flight_log: 'Navigation',
  property_record: 'Building',
  email: 'Mail',
  evidence: 'Target',
  hypothesis: 'Lightbulb',
  timeline_event: 'Calendar',
};

const getActionIcon = (actionType: string): string => {
  if (actionType.includes('added') || actionType.includes('created')) return 'Plus';
  if (actionType.includes('removed') || actionType.includes('deleted')) return 'Trash2';
  if (actionType.includes('updated') || actionType.includes('changed')) return 'Edit3';
  return 'Activity';
};

const getActionColor = (actionType: string): string => {
  if (actionType.includes('added') || actionType.includes('created')) return styles.actionPositive;
  if (actionType.includes('removed') || actionType.includes('deleted'))
    return styles.actionNegative;
  if (actionType.includes('updated') || actionType.includes('changed')) return styles.actionNeutral;
  return styles.actionMuted;
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

const readRelevance = (value: unknown): 'high' | 'medium' | 'low' | null => {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return null;
};

export const InvestigationActivityFeed: React.FC<InvestigationActivityFeedProps> = ({
  investigationId,
  maxItems = 20,
  refreshInterval = 30000, // 30 seconds default
  compact = false,
}) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['investigation-activity', investigationId, maxItems] as const,
    [investigationId, maxItems],
  );

  const {
    data: activities = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/investigations/${investigationId}/activity?limit=${maxItems}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      return res.json() as Promise<ActivityItem[]>;
    },
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
  });

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Listen for new items added via custom event
  React.useEffect(() => {
    const handleItemAdded = () => {
      // Refresh after a short delay to allow the server to process
      setTimeout(refetch, 500);
    };

    window.addEventListener('investigation-item-added', handleItemAdded);
    return () => window.removeEventListener('investigation-item-added', handleItemAdded);
  }, [refetch]);

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'Failed to load activity'
        : null;

  const getActivityItemClassName = (isCompact: boolean) =>
    `${styles.activityItem} ${isCompact ? styles.activityItemCompact : styles.activityItemExpanded}`;

  const getContentTextClassName = (isCompact: boolean) =>
    `${styles.contentText} ${isCompact ? styles.contentTextCompact : styles.contentTextRegular}`;

  const getTimestampClassName = (isCompact: boolean) =>
    `${styles.timestamp} ${isCompact ? styles.timestampCompact : styles.timestampRegular}`;

  const getRelevanceClassName = (relevance: 'high' | 'medium' | 'low') =>
    `${styles.relevanceBadge} ${
      relevance === 'high'
        ? styles.relevanceHigh
        : relevance === 'medium'
          ? styles.relevanceMedium
          : styles.relevanceLow
    }`;

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <Icon name="AlertCircle" size="md" className={styles.errorIcon} />
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon name="Activity" size="lg" className={styles.emptyIcon} />
        <p className={styles.emptyTitle}>No activity yet</p>
        <p className={styles.emptyText}>Actions will appear here as the team works</p>
      </div>
    );
  }

  return (
    <div className={`${styles.feed} ${compact ? styles.feedCompact : styles.feedRegular}`}>
      {activities.map((activity) => {
        const relevance = readRelevance(activity.metadata?.relevance);
        return (
          <div key={activity.id} className={getActivityItemClassName(compact)}>
            {/* Action icon */}
            <div className={`${styles.actionIconWrap} ${getActionColor(activity.actionType)}`}>
              <Icon name={getActionIcon(activity.actionType) as IconName} size="sm" />
            </div>

            {/* Content */}
            <div className={styles.content}>
              <div className={getContentTextClassName(compact)}>
                <span className={styles.userName}>{activity.userName}</span>{' '}
                <span className={styles.actionText}>
                  {actionLabels[activity.actionType] || activity.actionType.replace(/_/g, ' ')}
                </span>
                {activity.targetTitle && (
                  <>
                    {' '}
                    <span className={styles.targetTitle}>
                      {activity.targetType && (
                        <Icon
                          name={(targetTypeIcons[activity.targetType] || 'File') as IconName}
                          size="xs"
                          className={styles.targetIcon}
                        />
                      )}
                      {activity.targetTitle}
                    </span>
                  </>
                )}
              </div>

              {/* Metadata details */}
              {!compact && activity.metadata && (
                <div className={styles.metadataRow}>
                  {relevance && (
                    <span className={getRelevanceClassName(relevance)}>{relevance} relevance</span>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className={getTimestampClassName(compact)}>
                {formatTimeAgo(activity.createdAt)}
              </div>
            </div>
          </div>
        );
      })}

      {/* Refresh indicator */}
      {refreshInterval > 0 && (
        <div className={styles.refreshIndicator}>
          <Icon name="RefreshCw" size="xs" className={styles.refreshIcon} />
          Auto-refreshes every {Math.floor(refreshInterval / 1000)}s
        </div>
      )}
    </div>
  );
};

export default InvestigationActivityFeed;
