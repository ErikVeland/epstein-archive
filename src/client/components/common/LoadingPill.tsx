import React, { useState, useCallback, ReactNode } from 'react';
import { LoadingContext, LoadingTask } from './loadingContext';

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<LoadingTask[]>([]);

  const addTask = useCallback((id: string, label: string) => {
    setTasks((prev) => {
      // Prevent duplicates
      if (prev.some((t) => t.id === id)) {
        return prev.map((t) => (t.id === id ? { ...t, label, startTime: Date.now() } : t));
      }
      return [...prev, { id, label, startTime: Date.now() }];
    });
  }, []);

  const updateTask = useCallback((id: string, progress: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <LoadingContext.Provider value={{ addTask, updateTask, removeTask, tasks }}>
      {children}
      <LoadingPillDisplay tasks={tasks} />
    </LoadingContext.Provider>
  );
};

interface LoadingPillDisplayProps {
  tasks: LoadingTask[];
}

const LoadingPillDisplay: React.FC<LoadingPillDisplayProps> = ({ tasks }) => {
  const [hovered, setHovered] = useState(false);

  if (tasks.length === 0) return null;

  // Calculate overall progress
  const totalProgress = tasks.reduce((sum, t) => sum + (t.progress ?? 50), 0) / tasks.length;
  const mainTask = tasks[0];

  return (
    <div
      className="fixed top-3 right-3 z-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Main compact pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-sm cursor-pointer transition-all duration-200 hover:bg-[var(--glass-bg-strong)]">
        <div
          className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
        <span
          className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]"
          aria-live="polite"
        >
          {tasks.length === 1 ? mainTask.label : `${tasks.length} tasks`}
        </span>
        <div
          className="w-12 h-1 bg-[var(--glass-bg-strong)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(totalProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading progress"
        >
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${totalProgress}%` }}
          />
        </div>
      </div>

      {/* Hover tooltip with all tasks */}
      {hovered && tasks.length > 0 && (
        <div className="absolute top-full right-0 mt-2 min-w-[200px] glass-panel p-3">
          <div className="text-xs text-[var(--text-muted)] mb-2 font-medium">Active Tasks</div>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <div className="w-2 h-2 border border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-[var(--text-secondary)] flex-1 truncate">
                  {task.label}
                </span>
                {task.progress !== undefined && (
                  <span className="text-xs text-[var(--accent)] font-mono">
                    {Math.round(task.progress)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Legacy simple pill for backward compatibility
interface LoadingPillProps {
  label?: string;
  value?: number;
}

const LoadingPill: React.FC<LoadingPillProps> = ({ label, value }) => {
  const pct = typeof value === 'number' ? Math.min(100, Math.max(0, Math.round(value))) : undefined;
  return (
    <div className="fixed top-3 right-3 z-50">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] backdrop-blur-sm">
        <div
          className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"
          aria-hidden
        />
        <span
          className="text-xs text-[var(--text-secondary)] truncate max-w-[120px]"
          aria-live="polite"
        >
          {label || 'Loading'}
        </span>
        {pct !== undefined && (
          <div
            className="w-12 h-1 bg-[var(--glass-bg-strong)] rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingPill;
