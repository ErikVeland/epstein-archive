import React, { useReducer, useCallback, useEffect } from 'react';
import { UndoAction, UndoActionType, UndoContext, UndoState } from './undoContext';
import { CloseButton } from './common/CloseButton';

// Create reducer for undo state
const undoReducer = (state: UndoState, action: UndoActionType): UndoState => {
  switch (action.type) {
    case 'ADD_ACTION':
      return {
        ...state,
        actions: [action.payload, ...state.actions].slice(0, 10), // Keep only last 10 actions
      };
    case 'REMOVE_ACTION':
      return {
        ...state,
        actions: state.actions.filter((a) => a.id !== action.payload),
      };
    case 'SHOW_NOTIFICATION':
      return {
        ...state,
        notification: {
          message: action.payload.message,
          visible: true,
          action: action.payload.action,
        },
      };
    case 'HIDE_NOTIFICATION':
      return {
        ...state,
        notification: null,
      };
    case 'CLEAR_ALL':
      return {
        actions: [],
        notification: null,
      };
    default:
      return state;
  }
};

// Provider component
export const UndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(undoReducer, {
    actions: [],
    notification: null,
  });

  // Hide notification after 5 seconds
  useEffect(() => {
    if (state.notification?.visible) {
      const timer = setTimeout(() => {
        dispatch({ type: 'HIDE_NOTIFICATION' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  const showNotification = useCallback((message: string, action?: UndoAction) => {
    dispatch({
      type: 'SHOW_NOTIFICATION',
      payload: { message, action },
    });
  }, []);

  const hideNotification = useCallback(() => {
    dispatch({ type: 'HIDE_NOTIFICATION' });
  }, []);

  const addUndoAction = useCallback(
    (action: Omit<UndoAction, 'id' | 'timestamp'>) => {
      const undoAction: UndoAction = {
        ...action,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_ACTION', payload: undoAction });
      showNotification(`${action.description} completed.`, undoAction);
    },
    [showNotification],
  );

  const performUndo = useCallback(
    async (actionId: string) => {
      const action = state.actions.find((a) => a.id === actionId);
      if (action) {
        try {
          await action.undo();
          dispatch({ type: 'REMOVE_ACTION', payload: actionId });
          showNotification('Action undone successfully.');
        } catch (error) {
          showNotification('Failed to undo action.');
          console.error('Undo failed:', error);
        }
      }
    },
    [state.actions, showNotification],
  );

  const value = {
    state,
    dispatch,
    addUndoAction,
    performUndo,
    showNotification,
    hideNotification,
  };

  return (
    <UndoContext.Provider value={value}>
      {children}
      {state.notification?.visible && (
        <div className="fixed bottom-4 right-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4 shadow-[var(--glass-shadow)] z-50 max-w-md">
          <div className="flex items-center justify-between">
            <p className="text-[var(--text-primary)] text-sm">{state.notification.message}</p>
            {state.notification.action && (
              <button
                onClick={() => performUndo(state.notification!.action!.id)}
                className="ml-4 px-3 py-1 bg-[var(--accent)] hover:bg-blue-700 text-[var(--text-primary)] text-sm rounded transition-colors"
              >
                Undo
              </button>
            )}
            <CloseButton
              onClick={hideNotification}
              size="sm"
              label="Close notification"
              className="ml-2 bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            />
          </div>
        </div>
      )}
    </UndoContext.Provider>
  );
};

export default UndoProvider;
