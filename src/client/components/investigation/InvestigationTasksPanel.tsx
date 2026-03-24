import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { CheckCircle2, Clock, Flag, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CloseButton } from '../common/CloseButton';

interface InvestigationTasksPanelProps {
  investigationId: string;
  onClose: () => void;
}

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

interface InvestigationTask {
  id: number;
  uuid: string;
  investigationId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  evidenceIds?: number[];
  relatedEntities?: number[];
  progress?: number;
}

interface TaskSummary {
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  overdueTasks: number;
  averageProgress: number;
  assignmentBreakdown: { assigned_to: string; count: number }[];
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

  const loadTasks = useCallback(async () => {
    if (!investigationId) return;
    setIsLoading(true);
    try {
      const [tasksResult, summaryResult] = await Promise.all([
        apiClient.getInvestigativeTasksByInvestigation(investigationId),
        apiClient.getInvestigativeTaskSummary(investigationId),
      ]);
      setTasks(tasksResult.data as InvestigationTask[]);
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

  const statusColor = (status: TaskStatus) => {
    if (status === 'completed') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40';
    if (status === 'in_progress')
      return 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/40';
    if (status === 'pending')
      return 'bg-[var(--glass-bg-highlight)]/10 text-[var(--text-primary)] border-[var(--glass-border)]';
    if (status === 'on_hold') return 'bg-amber-500/10 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/10 text-rose-300 border-rose-500/40';
  };

  const priorityColor = (priority: TaskPriority) => {
    if (priority === 'critical') return 'bg-rose-500/10 text-rose-300 border-rose-500/40';
    if (priority === 'high') return 'bg-amber-500/10 text-amber-300 border-amber-500/40';
    if (priority === 'medium')
      return 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/40';
    return 'bg-[var(--glass-bg-highlight)]/10 text-[var(--text-primary)] border-[var(--glass-border)]';
  };

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-[var(--glass-bg)] backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--glass-bg-strong)] border-l border-[var(--glass-border)] shadow-[var(--glass-shadow)] flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" />
              Investigation Tasks
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">
              Track work items and progress for this investigation
            </p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close tasks panel" />
        </div>

        {summary && (
          <div className="px-4 sm:px-6 py-3 border-b border-[var(--glass-border)] flex gap-3 text-xs sm:text-sm">
            <div className="flex-1">
              <div className="text-[var(--text-muted)]">Total</div>
              <div className="text-[var(--text-primary)] font-medium">
                {Object.values(summary.statusBreakdown).reduce((a, b) => a + b, 0)}
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[var(--text-muted)]">Overdue</div>
              <div className="text-rose-300 font-medium">{summary.overdueTasks}</div>
            </div>
            <div className="flex-1">
              <div className="text-[var(--text-muted)]">Avg Progress</div>
              <div className="text-emerald-300 font-medium">
                {Math.round(summary.averageProgress)}%
              </div>
            </div>
          </div>
        )}

        <div className="px-4 sm:px-6 py-3 border-b border-[var(--glass-border)] flex gap-2 text-xs sm:text-sm">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className="flex-1 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-2 py-1.5 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
            className="flex-1 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-2 py-1.5 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading tasks
            </div>
          )}

          {!isLoading && filteredTasks.length === 0 && (
            <div className="border border-dashed border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No tasks yet for this investigation.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Use the form below to create the first task.
              </p>
            </div>
          )}

          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]/60 p-3 sm:p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className="mt-0.5 p-1 rounded-full border border-[var(--glass-border)] hover:border-emerald-500/60 hover:bg-emerald-500/10 text-[var(--text-muted)] hover:text-emerald-300 transition-colors"
                  >
                    <CheckCircle2
                      className={`w-4 h-4 ${
                        task.status === 'completed'
                          ? 'text-emerald-400'
                          : 'text-[var(--text-muted)]'
                      }`}
                    />
                  </button>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-3">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${statusColor(
                      task.status,
                    )}`}
                  >
                    {statusLabel(task.status)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${priorityColor(
                      task.priority,
                    )}`}
                  >
                    {task.priority === 'critical'
                      ? 'Critical'
                      : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  {task.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  {task.assignedTo && (
                    <span className="inline-flex items-center gap-1">
                      Assigned to
                      <span className="text-[var(--text-primary)] font-medium">
                        {task.assignedTo}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>{Math.round(task.progress ?? 0)}%</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--glass-bg)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-emerald-400"
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
                  className="w-24 accent-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleCreateTask}
          className="border-t border-[var(--glass-border)] px-4 sm:px-6 py-4 space-y-3 bg-[var(--glass-bg-strong)]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-3 h-3 text-[var(--accent)]" />
              New task
            </h3>
          </div>
          <input
            type="text"
            value={newTask.title}
            onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
            placeholder="Task title"
            className="w-full px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <textarea
            value={newTask.description}
            onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
            placeholder="Optional description"
            rows={2}
            className="w-full px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <div className="flex gap-2">
            <select
              value={newTask.priority}
              onChange={(e) =>
                setNewTask((t) => ({ ...t, priority: e.target.value as TaskPriority }))
              }
              className="flex-1 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-2 py-1.5 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
              className="flex-1 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-2 py-1.5 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newTask.title.trim() || isCreating}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-[var(--radius-lg)] text-xs sm:text-sm font-medium bg-[var(--accent)] text-[var(--text-primary)] hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
