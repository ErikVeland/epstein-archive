import { createContext } from 'react';

export interface FilterState {
  timeRange: [string | null, string | null]; // ISO strings
  docTypes: string[];
  entityTypes: string[];
  riskBands: [number, number]; // [min, max]
  minStrength: number;
  minConnections: number;
  limit: number;
  includeInferred: boolean;
  communityId: string | null;
  searchQuery: string;
  includeJunk: boolean;
}

export const defaultState: FilterState = {
  timeRange: [null, null],
  docTypes: [],
  entityTypes: [],
  riskBands: [0, 5],
  minStrength: 0,
  minConnections: 0,
  limit: 100,
  includeInferred: true,
  communityId: null,
  searchQuery: '',
  includeJunk: false,
};

export interface FilterContextType {
  filters: FilterState;
  setFilters: (update: Partial<FilterState> | ((prev: FilterState) => FilterState)) => void;
  resetFilters: () => void;
}

export const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Helper to serialize state to URL-safe string
export const serializeFilters = (state: FilterState): string => {
  const diff: Partial<FilterState> = {};
  Object.keys(state).forEach((key) => {
    const k = key as keyof FilterState;
    if (JSON.stringify(state[k]) !== JSON.stringify(defaultState[k])) {
      Object.assign(diff, { [k]: state[k] });
    }
  });
  if (Object.keys(diff).length === 0) return '';
  try {
    return btoa(encodeURIComponent(JSON.stringify(diff)));
  } catch {
    return '';
  }
};

// Helper to deserialize from URL string
export const deserializeFilters = (encoded: string | null): Partial<FilterState> => {
  if (!encoded) return {};
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    console.warn('Failed to parse filters from URL');
    return {};
  }
};
