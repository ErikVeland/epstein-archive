import React from 'react';
import Icon from '@client/components/common/Icon';
import { SearchFilters as ISearchFilters } from '@client/types';
import s from './SearchFilters.module.css';

import { Input, NativeSelect } from '@client/design-system/lib';

interface SearchFiltersProps {
  filters: ISearchFilters;
  setFilters: (filters: ISearchFilters) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, setFilters }) => {
  const handleFilterChange = (key: keyof ISearchFilters, value: ISearchFilters[typeof key]) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <Icon name="Filter" className={s.headerIcon} size="md" />
        <h3 className={s.heading}>Filters</h3>
      </div>

      <div className={s.grid}>
        <div className={s.field}>
          <label className={s.label}>
            <Icon name="AlertTriangle" className={s.labelIcon} size="sm" />
            Likelihood Level
          </label>
          <NativeSelect
            value={filters.likelihood}
            onChange={(e) => handleFilterChange('likelihood', e.target.value)}
            className={s.select}
          >
            <option value="all">All Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </NativeSelect>
        </div>

        <div className={s.field}>
          <label className={s.label}>
            <Icon name="Users" className={s.labelIcon} size="sm" />
            Min Mentions
          </label>
          <Input
            type="number"
            min="0"
            value={filters.minMentions}
            onChange={(e) => handleFilterChange('minMentions', parseInt(e.target.value) || 0)}
            className={s.input}
            placeholder="0"
          />
        </div>

        <div className={s.field}>
          <label className={s.label}>Role Type</label>
          <NativeSelect
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className={s.select}
          >
            <option value="all">All Roles</option>
            <option value="president">President/Politician</option>
            <option value="business">Business</option>
            <option value="legal">Legal</option>
            <option value="media">Media</option>
            <option value="victim">Victim</option>
          </NativeSelect>
        </div>

        <div className={s.field}>
          <label className={s.label}>
            <Icon name="Calendar" className={s.labelIcon} size="sm" />
            Current Status
          </label>
          <NativeSelect
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={s.select}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="convicted">Convicted</option>
            <option value="deceased">Deceased</option>
            <option value="retired">Retired</option>
          </NativeSelect>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
