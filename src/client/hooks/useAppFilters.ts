import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export type SortBy = 'name' | 'mentions' | 'red_flag' | 'risk';
export type SortOrder = 'asc' | 'desc';
export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | null;

export interface UseAppFiltersReturn {
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (value: SortOrder) => void;
  entityType: string;
  setEntityType: (value: string) => void;
  selectedRiskLevel: RiskLevel;
  setSelectedRiskLevel: (value: RiskLevel) => void;
}

const VALID_SORT_VALUES = ['name', 'mentions', 'red_flag', 'risk'] as const;
const VALID_ORDER_VALUES = ['asc', 'desc'] as const;
const VALID_RISK_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const;

function getInitialSortBy(): SortBy {
  const v = new URLSearchParams(window.location.search).get('sort');
  return VALID_SORT_VALUES.includes(v as SortBy) ? (v as SortBy) : 'red_flag';
}

function getInitialSortOrder(): SortOrder {
  const v = new URLSearchParams(window.location.search).get('order');
  return VALID_ORDER_VALUES.includes(v as SortOrder) ? (v as SortOrder) : 'desc';
}

function getInitialEntityType(): string {
  return new URLSearchParams(window.location.search).get('type') ?? 'all';
}

function getInitialRiskLevel(): RiskLevel {
  const v = new URLSearchParams(window.location.search).get('risk');
  return VALID_RISK_VALUES.includes(v as (typeof VALID_RISK_VALUES)[number])
    ? (v as RiskLevel)
    : null;
}

export function useAppFilters(): UseAppFiltersReturn {
  const [sortBy, setSortBy] = useState<SortBy>(getInitialSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(getInitialSortOrder);
  const [entityType, setEntityType] = useState<string>(getInitialEntityType);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<RiskLevel>(getInitialRiskLevel);

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    entityType,
    setEntityType,
    selectedRiskLevel,
    setSelectedRiskLevel,
  };
}

export interface NavigationState {
  activeTab: string;
  location: ReturnType<typeof useLocation>;
}

export interface UseNavigationStateReturn {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileSearchOpen: boolean;
  setIsMobileSearchOpen: (open: boolean) => void;
  showDateRangePicker: boolean;
  setShowDateRangePicker: (show: boolean) => void;
  location: ReturnType<typeof useLocation>;
}

export function useNavigationState(initialTab: string): UseNavigationStateReturn {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const location = useLocation();

  return {
    activeTab,
    setActiveTab,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    showDateRangePicker,
    setShowDateRangePicker,
    location,
  };
}
