import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { CheckCircle2, Clock, Flag, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import styles from './InvestigationTasksPanel.module.css';

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

export const InvestigationTasksPanel: React.FC<InvestigationTasksPanelProps> = ({
  investigationId,
  onClose,
}) => {
  const [tasks, setTasks] = useState<InvestigationTask[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    dueDate: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
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
    } catch (error) {
      console.error('Error loading investigative tasks', error);
      addToast({ text: 'Failed to load tasks', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [addToast, investigationId]);

  useEffect(() => {
    loadTasks();
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
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
      });
      await loadTasks();
      addToast({ text: 'Task created', type: 'success' });
    } catch (error) {
      console.error('Error creating investigative task', error);
      addToast({ text: 'Failed to create task', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleComplete = async (task: InvestigationTask) => {
    try {
      const nextStatus: TaskStatus = task.status === 'completed' ? 'in_progress' : 'completed';
      await apiClient.updateInvestigativeTask(task.id, {
        status: nextStatus,
        progress: nextStatus === 'completed' ? 100 : (task.progress ?? 0),
      });
      await loadTasks();
    } catch (error) {
      console.error('Error updating task status', error);
      addToast({ text: 'Failed to update task', type: 'error' });
    }
  };

  const handleProgressChange = async (task: InvestigationTask, progress: number) => {
    try {
      await apiClient.updateInvestigativeTaskProgress(task.id, progress);
      await loadTasks();
    } catch (error) {
      console.error('Error updating task progress', error);
      addToast({ text: 'Failed to update progress', type: 'error' });
    }
  };

  const statusLabel = (status: TaskStatus) => {
    if (status === 'pending') return 'Pending';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    if (status === 'on_hold') return 'On Hold';
    return 'Cancelled';
  };

  const statusClassName = (status: TaskStatus) => {
    if (status === 'completed') return styles.statusCompleted;
    if (status === 'in_progress') return styles.statusInProgress;
    if (status === 'pending') return styles.statusPending;
    if (status === 'on_hold') return styles.statusOnHold;
    return styles.statusCancelled;
  };

  const priorityClassName = (priority: TaskPriority) => {
    if (priority === 'critical') return styles.priorityCritical;
    if (priority === 'high') return styles.priorityHigh;
    if (priority === 'medium') return styles.priorityMedium;
    return styles.priorityLow;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={`${styles.section} ${styles.header}`}>
          <div>
            <h2 className={styles.title}>
              <Flag className={styles.flagIcon} />
              Investigation Tasks
            </h2>
            <p className={styles.subtitle}>Track work items and progress for this investigation</p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close tasks panel" />
        </div>

        {summary && (
          <div className={`${styles.section} ${styles.summaryGrid}`}>
            <div className={styles.summaryCell}>
              <div className={styles.summaryLabel}>Total</div>
              <div className={styles.summaryValue}>
                {Object.values(summary.statusBreakdown).reduce((a, b) => a + b, 0)}
              </div>
            </div>
            <div className={styles.summaryCell}>
              <div className={styles.summaryLabel}>Overdue</div>
              <div className={styles.summaryDanger}>{summary.overdueTasks}</div>
            </div>
            <div className={styles.summaryCell}>
              <div className={styles.summaryLabel}>Avg Progress</div>
              <div className={styles.summarySuccess}>{Math.round(summary.averageProgress)}%</div>
            </div>
          </div>
        )}

        <div className={`${styles.section} ${styles.filtersRow}`}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className={styles.select}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            className={styles.select}
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className={styles.scrollArea}>
          <div className={styles.stack}>
            {isLoading && (
              <div className={styles.loadingState}>
                <Loader2 className={styles.spinner} />
                Loading tasks
              </div>
            )}

            {!isLoading && filteredTasks.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>No tasks yet for this investigation.</p>
                <p className={styles.emptySubtext}>Use the form below to create the first task.</p>
              </div>
            )}

            {filteredTasks.map((task) => (
              <div key={task.id} className={styles.taskCard}>
                <div className={styles.taskHeader}>
                  <div className={styles.taskHeaderMain}>
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className={styles.completeButton}
                    >
                      <CheckCircle2
                        className={`${styles.completeIcon} ${
                          task.status === 'completed' ? styles.completeIconDone : ''
                        }`}
                      />
                    </button>
                    <div>
                      <h3 className={styles.taskTitle}>{task.title}</h3>
                      {task.description && (
                        <p className={styles.taskDescription}>{task.description}</p>
                      )}
                    </div>
                  </div>
                  <div className={styles.badgeColumn}>
                    <span className={`${styles.badge} ${statusClassName(task.status)}`}>
                      {statusLabel(task.status)}
                    </span>
                    <span className={`${styles.badge} ${priorityClassName(task.priority)}`}>
                      {task.priority === 'critical'
                        ? 'Critical'
                        : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  </div>
                </div>

                <div className={styles.taskMetaRow}>
                  <div className={styles.dueMeta}>
                    {task.dueDate && (
                      <span className={styles.inlineRow}>
                        <Clock className={styles.inlineIcon} />
                        Due {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {task.assignedTo && (
                      <span className={styles.inlineRow}>
                        Assigned to
                        <span className={styles.strongText}>{task.assignedTo}</span>
                      </span>
                    )}
                  </div>
                  <div className={styles.inlineRow}>
                    <span>{Math.round(task.progress ?? 0)}%</span>
                  </div>
                </div>

                <div className={styles.taskProgressRow}>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${Math.max(0, Math.min(100, task.progress ?? 0))}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(task.progress ?? 0)}
                    onChange={(e) => handleProgressChange(task, parseInt(e.target.value, 10))}
                    className={styles.rangeInput}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreateTask} className={styles.formSection}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              <Plus className={styles.plusIcon} />
              New task
            </h3>
          </div>
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
            placeholder="Task title"
            className={styles.input}
          />
          <textarea
            value={newTask.description}
            onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
            placeholder="Optional description"
            rows={2}
            className={styles.textarea}
          />
          <div className={styles.formRow}>
            <select
              value={newTask.priority}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, priority: e.target.value as TaskPriority }))
              }
              className={styles.select}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask((t) => ({ ...t, dueDate: e.target.value }))}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.footerRow}>
            <button
              type="submit"
              disabled={!newTask.title.trim() || isCreating}
              className={styles.submitButton}
            >
              {isCreating && <Loader2 className={styles.buttonSpinner} />}
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
