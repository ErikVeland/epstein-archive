import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { CheckCircle2, Clock, Loader2, Plus, XCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';

// UI Library
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Input,
  LqText,
  NativeSelect,
  Skeleton,
  Stack,
  Surface,
  cn,
} from '../../design-system/lib';
import styles from './InvestigationTasksPanel.module.css';
const css = <T,>(style: T) => style;

import {
  InvestigationTaskDto as InvestigationTask,
  InvestigationTaskSummaryDto as TaskSummary,
  TaskPriority,
  TaskStatus,
} from '@shared/dto/investigations';

interface InvestigationTasksPanelProps {
  investigationId: string;
  onClose: () => void;
}

const STATUS_VARIANT: Record<TaskStatus, 'success' | 'accent' | 'glass' | 'warning'> = {
  completed: 'success',
  in_progress: 'accent',
  pending: 'glass',
  on_hold: 'warning',
  cancelled: 'glass',
};

const PRIORITY_VARIANT: Record<TaskPriority, 'danger' | 'warning' | 'accent' | 'glass'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'accent',
  low: 'glass',
};

export const InvestigationTasksPanel: React.FC<InvestigationTasksPanelProps> = ({
  investigationId,
  onClose,
}) => {
  const [tasks, setTasks] = useState<InvestigationTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    dueDate: '',
  });
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const { addToast } = useToasts();
  const { user } = useAuth();

  useScrollLock(true);

  const loadTasks = useCallback(async () => {
    if (!investigationId) return;
    setIsLoading(true);
    try {
      const [tasksResult, summaryResult] = await Promise.all([
        apiClient.getInvestigativeTasksByInvestigation(investigationId),
        apiClient.getInvestigativeTaskSummary(investigationId),
      ]);
      setTasks(tasksResult.data);
      setSummary(summaryResult);
    } catch {
      addToast({ text: 'Failed to synchronize task state', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, investigationId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setIsCreating(true);
    try {
      await apiClient.createInvestigativeTask({
        investigationId: parseInt(investigationId, 10),
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        priority: newTask.priority,
        dueDate: newTask.dueDate || undefined,
        assignedTo: user?.id ?? undefined,
      });
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
      await loadTasks();
      addToast({ text: 'Investigative task initialized', type: 'success' });
      window.dispatchEvent(new CustomEvent('investigation-item-added'));
    } catch {
      addToast({ text: 'Task creation failed', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (task: InvestigationTask) => {
    try {
      const next: TaskStatus = task.status === 'completed' ? 'in_progress' : 'completed';
      await apiClient.updateInvestigativeTask(task.id, {
        status: next,
        progress: next === 'completed' ? 100 : (task.progress ?? 0),
      });
      await loadTasks();
    } catch {
      addToast({ text: 'Sync failure', type: 'error' });
    }
  };

  return (
    <Box className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Surface
        variant="glass"
        p="none"
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap="none" style={css({ height: '100%' })}>
          {/* Header */}
          <Surface variant="glass" p="lg" className={styles.section}>
            <Flex justify="between" align="center">
              <Stack gap="none">
                <Flex align="center" gap="sm">
                  <BarChart3 size={20} />
                  <LqText variant="h3" weight="bold">
                    Mission Control
                  </LqText>
                </Flex>
                <LqText
                  variant="xs"
                  color="muted"
                  style={css({ textTransform: 'uppercase' })}
                  weight="bold"
                >
                  Task Orchestration • Progress Analytics
                </LqText>
              </Stack>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <XCircle size={18} />
              </Button>
            </Flex>
          </Surface>

          <Box className={styles.scrollArea}>
            {/* Summary HUD */}
            {summary && (
              <Box>
                <Grid cols={3} gap="md">
                  <Surface variant="glass-highlight" p="md">
                    <LqText variant="h3" weight="bold">
                      {Object.values(summary.statusBreakdown).reduce((a, b) => a + b, 0)}
                    </LqText>
                    <LqText variant="xs" color="muted" style={css({ textTransform: 'uppercase' })}>
                      Total Tasks
                    </LqText>
                  </Surface>
                  <Surface variant="glass-highlight" p="md">
                    <LqText variant="h3" weight="bold" color="danger">
                      {summary.overdueTasks}
                    </LqText>
                    <LqText variant="xs" color="muted" style={css({ textTransform: 'uppercase' })}>
                      Overdue
                    </LqText>
                  </Surface>
                  <Surface variant="glass-highlight" p="md">
                    <LqText variant="h3" weight="bold" color="success">
                      {Math.round(summary.averageProgress)}%
                    </LqText>
                    <LqText variant="xs" color="muted" style={css({ textTransform: 'uppercase' })}>
                      Avg Progress
                    </LqText>
                  </Surface>
                </Grid>
              </Box>
            )}

            {/* Filtering Hub */}
            <Flex gap="sm">
              <Box style={css({ flex: 1 })}>
                <NativeSelect
                  style={css({
                    width: '100%',
                    background: 'var(--lq-surface-3)',
                    border: '1px solid var(--lq-surface-4)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--lq-text-primary)',
                    outline: 'none',
                  })}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                >
                  <option value="all">Any Status</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </NativeSelect>
              </Box>
              <Box style={css({ flex: 1 })}>
                <NativeSelect
                  style={css({
                    width: '100%',
                    background: 'var(--lq-surface-3)',
                    border: '1px solid var(--lq-surface-4)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--lq-text-primary)',
                    outline: 'none',
                  })}
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                >
                  <option value="all">Any Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                </NativeSelect>
              </Box>
            </Flex>

            {/* Task Stream */}
            <Box>
              {isLoading ? (
                <Stack gap="md">
                  <Skeleton height={120} />
                  <Skeleton height={120} />
                  <Skeleton height={120} />
                </Stack>
              ) : filteredTasks.length === 0 ? (
                <Stack align="center" justify="center" gap="lg" py="xxxl" textAlign="center">
                  <CheckCircle2 size={48} />
                  <LqText
                    variant="xs"
                    color="muted"
                    style={css({ textTransform: 'uppercase' })}
                    weight="bold"
                  >
                    Clearance 100% • No Active Tasks
                  </LqText>
                </Stack>
              ) : (
                <Stack gap="md">
                  {filteredTasks.map((task) => (
                    <Surface key={task.id} variant="glass-highlight" p="lg">
                      <Stack gap="md">
                        <Flex justify="between" align="start">
                          <Flex gap="md" align="start">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleComplete(task)}
                            >
                              <CheckCircle2
                                size={18}
                                className={cn(
                                  task.status === 'completed'
                                    ? 'text-[var(--lq-success)]'
                                    : 'text-[var(--lq-text-dim)]',
                                )}
                              />
                            </Button>
                            <Stack gap="none">
                              <LqText
                                variant="small"
                                weight="bold"
                                className={
                                  task.status === 'completed' ? 'line-through opacity-50' : ''
                                }
                              >
                                {task.title}
                              </LqText>
                              {task.description && (
                                <LqText variant="xs" color="muted" mt="xxs">
                                  {task.description}
                                </LqText>
                              )}
                            </Stack>
                          </Flex>
                          <Flex direction="column" align="end" gap="xs">
                            <Badge
                              variant={STATUS_VARIANT[task.status]}
                              label={task.status.replace('_', ' ').toUpperCase()}
                              size="sm"
                            />
                            <Badge
                              variant={PRIORITY_VARIANT[task.priority]}
                              label={task.priority.toUpperCase()}
                              size="sm"
                            />
                          </Flex>
                        </Flex>

                        <Stack gap="xs">
                          <Flex justify="between" align="center">
                            <Flex align="center" gap="xs">
                              <Clock size={10} />
                              <LqText variant="xs" color="muted">
                                Due:{' '}
                                {task.dueDate
                                  ? new Date(task.dueDate).toLocaleDateString()
                                  : 'Unset'}
                              </LqText>
                            </Flex>
                            <LqText variant="xs" weight="bold">
                              {Math.round(task.progress ?? 0)}%
                            </LqText>
                          </Flex>
                          <Box className={styles.progressTrack}>
                            <Box
                              className={styles.progressFill}
                              style={css({ width: `${task.progress ?? 0}%` })}
                            />
                          </Box>
                        </Stack>
                      </Stack>
                    </Surface>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>

          {/* Rapid Task Entry */}
          <Surface variant="glass" p="lg" className={styles.footer}>
            <form onSubmit={handleCreateTask}>
              <Stack gap="md">
                <Flex align="center" gap="sm">
                  <Plus size={14} />
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={css({ textTransform: 'uppercase' })}
                  >
                    Queue New Task
                  </LqText>
                </Flex>
                <Input
                  style={css({
                    width: '100%',
                    background: 'var(--lq-surface-3)',
                    border: '1px solid var(--lq-surface-4)',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.875rem',
                    color: 'var(--lq-text-primary)',
                    outline: 'none',
                  })}
                  placeholder="Task designation..."
                  value={newTask.title}
                  onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                />
                <Grid cols={2} gap="md">
                  <NativeSelect
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    })}
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask((t) => ({ ...t, priority: e.target.value as TaskPriority }))
                    }
                  >
                    {['critical', 'high', 'medium', 'low'].map((p) => (
                      <option key={p} value={p}>
                        {p.toUpperCase()}
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    type="date"
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    })}
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask((t) => ({ ...t, dueDate: e.target.value }))}
                  />
                </Grid>
                <Button
                  variant="primary"
                  onClick={handleCreateTask}
                  disabled={!newTask.title.trim() || isCreating}
                >
                  {isCreating ? <Loader2 className="animate-spin" size={14} /> : 'Initialize Task'}
                </Button>
              </Stack>
            </form>
          </Surface>
        </Stack>
      </Surface>
    </Box>
  );
};
