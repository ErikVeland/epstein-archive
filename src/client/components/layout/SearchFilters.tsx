import React from 'react';
import { Filter, Users, Calendar, AlertTriangle } from 'lucide-react';
import { SearchFilters as ISearchFilters } from '../../types';
import s from './SearchFilters.module.css';

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
        <Filter className={s.headerIcon} size={20} />
        <h3 className={s.heading}>Filters</h3>
      </div>

      <div className={s.grid}>
        <div className={s.field}>
          <label className={s.label}>
            <AlertTriangle className={s.labelIcon} size={16} />
            Likelihood Level
          </label>
          <select
            value={filters.likelihood}
            onChange={(e) => handleFilterChange('likelihood', e.target.value)}
            className={s.select}
          >
            <option value="all">All Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>
            <Users className={s.labelIcon} size={16} />
            Min Mentions
          </label>
          <input
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
          <select
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
          </select>
        </div>

        <div className={s.field}>
          <label className={s.label}>
            <Calendar className={s.labelIcon} size={16} />
            Current Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={s.select}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="convicted">Convicted</option>
            <option value="deceased">Deceased</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
