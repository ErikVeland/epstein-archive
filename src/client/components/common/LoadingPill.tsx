import React, { useState, useCallback, ReactNode } from 'react';
import { Surface } from '@client/design-system/lib';
import { LoadingContext, LoadingTask } from './loadingContext';
import s from './LoadingPill.module.css';

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
      className={s.container}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={s.pill}>
        <div className={s.spinner} aria-hidden />
        <span className={s.label} aria-live="polite">
          {tasks.length === 1 ? mainTask.label : `${tasks.length} tasks`}
        </span>
        <div
          className={s.track}
          role="progressbar"
          aria-valuenow={Math.round(totalProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading progress"
        >
          <div className={s.fill} style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      {hovered && tasks.length > 0 && (
        <Surface variant="glass-strong" className={s.panel}>
          <div className={s.panelHeading}>Active Tasks</div>
          <div className={s.taskList}>
            {tasks.map((task) => (
              <div key={task.id} className={s.taskRow}>
                <div className={s.taskSpinner} aria-hidden />
                <span className={s.taskLabel}>{task.label}</span>
                {task.progress !== undefined && (
                  <span className={s.taskProgress}>{Math.round(task.progress)}%</span>
                )}
              </div>
            ))}
          </div>
        </Surface>
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
    <div className={s.container}>
      <div className={s.pill}>
        <div className={s.spinner} aria-hidden />
        <span className={s.label} aria-live="polite">
          {label || 'Loading'}
        </span>
        {pct !== undefined && (
          <div
            className={s.track}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={s.fill} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingPill;
