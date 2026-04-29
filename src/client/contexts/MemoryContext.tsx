import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { MemoryEntry, MemorySearchFilters } from '@client/types/memory';

// Define the context state and actions
interface MemoryState {
  memoryEntries: MemoryEntry[];
  selectedMemoryEntry: MemoryEntry | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalEntries: number;
}

type MemoryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | {
      type: 'SET_MEMORY_ENTRIES';
      payload: { data: MemoryEntry[]; page: number; totalPages: number; total: number };
    }
  | { type: 'ADD_MEMORY_ENTRY'; payload: MemoryEntry }
  | { type: 'UPDATE_MEMORY_ENTRY'; payload: MemoryEntry }
  | { type: 'DELETE_MEMORY_ENTRY'; payload: number }
  | { type: 'SET_SELECTED_MEMORY_ENTRY'; payload: MemoryEntry | null };

const initialState: MemoryState = {
  memoryEntries: [],
  selectedMemoryEntry: null,
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 0,
  totalEntries: 0,
};

const memoryReducer = (state: MemoryState, action: MemoryAction): MemoryState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_MEMORY_ENTRIES':
      return {
        ...state,
        memoryEntries: action.payload.data,
        currentPage: action.payload.page,
        totalPages: action.payload.totalPages,
        totalEntries: action.payload.total,
        loading: false,
        error: null,
      };
    case 'ADD_MEMORY_ENTRY':
      return {
        ...state,
        memoryEntries: [action.payload, ...state.memoryEntries],
        totalEntries: state.totalEntries + 1,
      };
    case 'UPDATE_MEMORY_ENTRY':
      return {
        ...state,
        memoryEntries: state.memoryEntries.map((entry) =>
          entry.id === action.payload.id ? action.payload : entry,
        ),
        selectedMemoryEntry:
          state.selectedMemoryEntry?.id === action.payload.id
            ? action.payload
            : state.selectedMemoryEntry,
      };
    case 'DELETE_MEMORY_ENTRY':
      return {
        ...state,
        memoryEntries: state.memoryEntries.filter((entry) => entry.id !== action.payload),
        totalEntries: Math.max(0, state.totalEntries - 1),
      };
    case 'SET_SELECTED_MEMORY_ENTRY':
      return { ...state, selectedMemoryEntry: action.payload };
    default:
      return state;
  }
};

// Create the context
interface MemoryContextType {
  state: MemoryState;
  loadMemoryEntries: (
    filters?: MemorySearchFilters,
    page?: number,
    limit?: number,
  ) => Promise<void>;
  createMemoryEntry: (input: {
    memoryType: 'declarative' | 'episodic' | 'working' | 'procedural';
    content: string;
    contextTags?: string[];
    importanceScore?: number;
    sourceId?: number;
    sourceType?: string;
    provenance?: Record<string, unknown>;
  }) => Promise<void>;
  updateMemoryEntry: (
    id: number,
    input: {
      content?: string;
      contextTags?: string[];
      importanceScore?: number;
      status?: 'active' | 'archived' | 'deprecated';
      provenance?: Record<string, unknown>;
    },
  ) => Promise<void>;
  deleteMemoryEntry: (id: number) => Promise<void>;
  selectMemoryEntry: (entry: MemoryEntry | null) => void;
  searchMemoryEntries: (query: string) => Promise<void>;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

// Create the provider component
export const MemoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(memoryReducer, initialState);

  const loadMemoryEntries = async (
    filters?: MemorySearchFilters,
    page: number = 1,
    limit: number = 20,
  ): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const queryParams = new URLSearchParams();
      if (page) queryParams.append('page', page.toString());
      if (limit) queryParams.append('limit', limit.toString());
      if (filters?.memoryType) queryParams.append('memoryType', filters.memoryType);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.searchQuery) queryParams.append('q', filters.searchQuery);

      const response = await fetch(`/api/memory?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch memory entries');

      const result = await response.json();
      dispatch({
        type: 'SET_MEMORY_ENTRIES',
        payload: {
          data: result.data,
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load memory entries';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createMemoryEntry = async (input: {
    memoryType: 'declarative' | 'episodic' | 'working' | 'procedural';
    content: string;
    contextTags?: string[];
    importanceScore?: number;
    sourceId?: number;
    sourceType?: string;
    provenance?: Record<string, unknown>;
  }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) throw new Error('Failed to create memory entry');

      const newEntry = await response.json();
      dispatch({ type: 'ADD_MEMORY_ENTRY', payload: newEntry });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create memory entry';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateMemoryEntry = async (
    id: number,
    input: {
      content?: string;
      contextTags?: string[];
      importanceScore?: number;
      status?: 'active' | 'archived' | 'deprecated';
      provenance?: Record<string, unknown>;
    },
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`/api/memory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) throw new Error('Failed to update memory entry');

      const updatedEntry = await response.json();
      dispatch({ type: 'UPDATE_MEMORY_ENTRY', payload: updatedEntry });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update memory entry';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteMemoryEntry = async (id: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch(`/api/memory/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete memory entry');

      dispatch({ type: 'DELETE_MEMORY_ENTRY', payload: id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete memory entry';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const selectMemoryEntry = (entry: MemoryEntry | null) => {
    dispatch({ type: 'SET_SELECTED_MEMORY_ENTRY', payload: entry });
  };

  const searchMemoryEntries = async (query: string) => {
    return loadMemoryEntries({ searchQuery: query });
  };

  const value = {
    state,
    loadMemoryEntries,
    createMemoryEntry,
    updateMemoryEntry,
    deleteMemoryEntry,
    selectMemoryEntry,
    searchMemoryEntries,
  };

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
};

// Custom hook to use the memory context
// eslint-disable-next-line react-refresh/only-export-components
export const useMemory = (): MemoryContextType => {
  const context = useContext(MemoryContext);
  if (context === undefined) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};
