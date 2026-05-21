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
  const { pathname, search, navigate, sortBy, sortOrder, entityType, selectedRiskLevel } = params;

  useEffect(() => {
    const isPeoplePath =
      pathname === '/' || pathname === '/people' || pathname.startsWith('/entity/');
    if (!isPeoplePath) return;

    const next = new URLSearchParams(search);
    ['sort', 'order', 'type', 'risk'].forEach((k) => next.delete(k));
    if (sortBy !== 'red_flag') next.set('sort', sortBy);
    if (sortOrder !== 'desc') next.set('order', sortOrder);
    if (entityType !== 'all') next.set('type', entityType);
    if (selectedRiskLevel) next.set('risk', selectedRiskLevel);

    const newSearch = next.toString();
    const currentSearch = new URLSearchParams(search).toString();
    if (newSearch !== currentSearch) {
      navigate(`${pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }
  }, [entityType, navigate, pathname, search, selectedRiskLevel, sortBy, sortOrder]);
}
