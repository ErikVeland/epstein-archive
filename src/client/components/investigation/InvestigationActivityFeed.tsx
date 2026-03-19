import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../common/Icon';
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
  metadata: any;
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
  if (actionType.includes('added') || actionType.includes('created')) return 'text-emerald-400';
  if (actionType.includes('removed') || actionType.includes('deleted')) return 'text-red-400';
  if (actionType.includes('updated') || actionType.includes('changed'))
    return 'text-[var(--accent)]';
  return 'text-[var(--text-muted)]';
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

export const InvestigationActivityFeed: React.FC<InvestigationActivityFeedProps> = ({
  investigationId,
  maxItems = 20,
  refreshInterval = 30000, // 30 seconds default
  compact = false,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/investigations/${investigationId}/activity?limit=${maxItems}`);
      if (!res.ok) throw new Error('Failed to fetch activity');
      const data = await res.json();
      setActivities(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [investigationId, maxItems]);

  useEffect(() => {
    fetchActivity();

    // Set up refresh interval if enabled
    if (refreshInterval > 0) {
      const interval = setInterval(fetchActivity, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchActivity, refreshInterval]);

  // Listen for new items added via custom event
  useEffect(() => {
    const handleItemAdded = () => {
      // Refresh after a short delay to allow the server to process
      setTimeout(fetchActivity, 500);
    };

    window.addEventListener('investigation-item-added', handleItemAdded);
    return () => window.removeEventListener('investigation-item-added', handleItemAdded);
  }, [fetchActivity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-400">
        <Icon name="AlertCircle" size="md" className="mx-auto mb-2" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <Icon name="Activity" size="lg" className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Actions will appear here as the team works
        </p>
      </div>
    );
  }

  return (
    <div className={`activity-feed ${compact ? 'space-y-2' : 'space-y-3'}`}>
      {activities.map((activity) => (
        <div
          key={activity.id}
          className={`flex items-start gap-3 ${compact ? 'py-1' : 'py-2 px-3 bg-[var(--glass-bg)]/30 rounded-[var(--radius-lg)]'}`}
        >
          {/* Action icon */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full bg-[var(--glass-bg-highlight)]/50 flex items-center justify-center ${getActionColor(activity.actionType)}`}
          >
            <Icon name={getActionIcon(activity.actionType) as any} size="sm" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className={`${compact ? 'text-xs' : 'text-sm'} text-[var(--text-primary)]`}>
              <span className="font-medium text-[var(--accent)]">{activity.userName}</span>{' '}
              <span className="text-[var(--text-muted)]">
                {actionLabels[activity.actionType] || activity.actionType.replace(/_/g, ' ')}
              </span>
              {activity.targetTitle && (
                <>
                  {' '}
                  <span className="text-[var(--text-primary)] font-medium">
                    {activity.targetType && (
                      <Icon
                        name={(targetTypeIcons[activity.targetType] || 'File') as any}
                        size="xs"
                        className="inline mr-1 opacity-60"
                      />
                    )}
                    {activity.targetTitle}
                  </span>
                </>
              )}
            </div>

            {/* Metadata details */}
            {!compact && activity.metadata && (
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                {activity.metadata.relevance && (
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded mr-2 ${
                      activity.metadata.relevance === 'high'
                        ? 'bg-red-900/30 text-red-300'
                        : activity.metadata.relevance === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-300'
                          : 'bg-green-900/30 text-green-300'
                    }`}
                  >
                    {activity.metadata.relevance} relevance
                  </span>
                )}
              </div>
            )}

            {/* Timestamp */}
            <div
              className={`${compact ? 'text-[10px]' : 'text-xs'} text-[var(--text-muted)] mt-0.5`}
            >
              {formatTimeAgo(activity.createdAt)}
            </div>
          </div>
        </div>
      ))}

      {/* Refresh indicator */}
      {refreshInterval > 0 && (
        <div className="text-center text-xs text-[var(--text-primary)] py-2">
          <Icon name="RefreshCw" size="xs" className="inline mr-1" />
          Auto-refreshes every {Math.floor(refreshInterval / 1000)}s
        </div>
      )}
    </div>
  );
};

export default InvestigationActivityFeed;
