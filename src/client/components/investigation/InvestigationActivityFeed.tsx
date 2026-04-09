import React, { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Edit3,
  Activity,
  User,
  FileText,
  Navigation,
  Building,
  Mail,
  Target,
  Lightbulb,
  Calendar,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

// UI Library
import { Surface, Flex, Box, Stack, LqText, cn, Badge, Skeleton } from '../../design-system/lib';
import styles from './InvestigationActivityFeed.module.css';

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

const targetTypeIcons: Record<string, any> = {
  entity: User,
  document: FileText,
  flight_log: Navigation,
  property_record: Building,
  email: Mail,
  evidence: Target,
  hypothesis: Lightbulb,
  timeline_event: Calendar,
};

const getActionIcon = (actionType: string) => {
  if (actionType.includes('added') || actionType.includes('created')) return Plus;
  if (actionType.includes('removed') || actionType.includes('deleted')) return Trash2;
  if (actionType.includes('updated') || actionType.includes('changed')) return Edit3;
  return Activity;
};

const getActionVariant = (actionType: string): any => {
  if (actionType.includes('added') || actionType.includes('created')) return 'success';
  if (actionType.includes('removed') || actionType.includes('deleted')) return 'error';
  if (actionType.includes('updated') || actionType.includes('changed')) return 'warning';
  return 'accent';
};

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
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
  refreshInterval = 30000,
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

  useEffect(() => {
    const handleItemAdded = () => setTimeout(refetch, 500);
    window.addEventListener('investigation-item-added', handleItemAdded);
    return () => window.removeEventListener('investigation-item-added', handleItemAdded);
  }, [refetch]);

  if (isLoading) {
    return (
      <Stack gap="md" p="md">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height={compact ? 40 : 64} variant="rect" />
        ))}
      </Stack>
    );
  }

  if (queryError) {
    return (
      <Surface variant="glass" p="xl">
        <Stack align="center" gap="sm">
          <AlertCircle className={styles.autoGen145} size={24} />
          <LqText variant="xs" color="muted">
            Investigation activity feed unavailable.
          </LqText>
        </Stack>
      </Surface>
    );
  }

  if (activities.length === 0) {
    return (
      <Surface variant="glass" p="xxl">
        <Stack align="center" gap="md">
          <Activity size={32} className={styles.autoGen146} />
          <Stack gap="none">
            <LqText variant="small" weight="bold">
              No Activity Detected
            </LqText>
            <LqText variant="xs" color="muted">
              Forensic signals appear here as investigators work.
            </LqText>
          </Stack>
        </Stack>
      </Surface>
    );
  }

  return (
    <Stack gap={compact ? 'xs' : 'sm'} style={{ width: '100%' }}>
      {activities.map((activity) => {
        const relevance = readRelevance(activity.metadata?.relevance);
        const ActionIcon = getActionIcon(activity.actionType);
        const variant = getActionVariant(activity.actionType);
        const TargetIcon = activity.targetType
          ? targetTypeIcons[activity.targetType] || FileText
          : null;

        return (
          <Surface key={activity.id} variant="glass-highlight" p={compact ? 'sm' : 'md'}>
            <Flex gap="md" align="center">
              <Box p="xs" className={cn('rounded', `bg-[var(--lq-${variant})]`, 'text-white')}>
                <ActionIcon size={compact ? 12 : 16} />
              </Box>

              <Stack grow gap="none">
                <Flex wrap="wrap" align="center" gap="xs">
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="accent"
                    style={{ textTransform: 'uppercase' }}
                  >
                    {activity.userName}
                  </LqText>
                  <LqText variant="xs" color="muted">
                    {actionLabels[activity.actionType] || activity.actionType.replace(/_/g, ' ')}
                  </LqText>
                  {activity.targetTitle && (
                    <Flex align="center" gap="xs" className={styles.autoGen147}>
                      {TargetIcon && <TargetIcon size={12} className={styles.autoGen148} />}
                      <LqText variant="xs" weight="medium">
                        {activity.targetTitle}
                      </LqText>
                    </Flex>
                  )}
                </Flex>

                {!compact && activity.metadata && relevance && (
                  <Box mt="xs">
                    <Badge
                      variant={
                        relevance === 'high'
                          ? 'error'
                          : relevance === 'medium'
                            ? 'warning'
                            : 'glass'
                      }
                      label={`${relevance.toUpperCase()} RELEVANCE`}
                      size="sm"
                    />
                  </Box>
                )}
              </Stack>

              <Flex align="center" gap="xs" className="ml-auto opacity-60">
                <Clock size={10} />
                <LqText variant="xs" style={{ textTransform: 'uppercase' }} weight="bold">
                  {formatTimeAgo(activity.createdAt)}
                </LqText>
              </Flex>
            </Flex>
          </Surface>
        );
      })}

      {refreshInterval > 0 && (
        <Flex justify="center" align="center" gap="xs" mt="md" className="opacity-40">
          <RefreshCw size={10} className="animate-spin-slow" />
          <LqText variant="xs" weight="bold" style={{ textTransform: 'uppercase' }}>
            Signal check every {Math.floor(refreshInterval / 1000)}s
          </LqText>
        </Flex>
      )}
    </Stack>
  );
};

export default InvestigationActivityFeed;
