import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';

export function usePeopleFiltersUrlSync(params: {
  pathname: string;
  search: string;
  navigate: NavigateFunction;
  sortBy: string;
  sortOrder: string;
  entityType: string;
  selectedRiskLevel: string | null;
}) {
  useEffect(() => {
    const isPeoplePath =
      params.pathname === '/' ||
      params.pathname === '/people' ||
      params.pathname.startsWith('/entity/');
    if (!isPeoplePath) return;

    const next = new URLSearchParams(params.search);
    ['sort', 'order', 'type', 'risk'].forEach((k) => next.delete(k));
    if (params.sortBy !== 'red_flag') next.set('sort', params.sortBy);
    if (params.sortOrder !== 'desc') next.set('order', params.sortOrder);
    if (params.entityType !== 'all') next.set('type', params.entityType);
    if (params.selectedRiskLevel) next.set('risk', params.selectedRiskLevel);

    const newSearch = next.toString();
    const currentSearch = new URLSearchParams(params.search).toString();
    if (newSearch !== currentSearch) {
      params.navigate(`${params.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [
    params.entityType,
    params.navigate,
    params.pathname,
    params.search,
    params.selectedRiskLevel,
    params.sortBy,
    params.sortOrder,
  ]);
}
