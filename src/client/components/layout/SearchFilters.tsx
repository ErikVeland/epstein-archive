import React from 'react';
import { Filter, Users, Calendar, AlertTriangle } from 'lucide-react';
import { SearchFilters as ISearchFilters } from '../../types';

interface SearchFiltersProps {
  filters: ISearchFilters;
  setFilters: (filters: ISearchFilters) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ filters, setFilters }) => {
  const handleFilterChange = (key: keyof ISearchFilters, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[var(--glass-bg)]/50 backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-6 mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            Likelihood Level
          </label>
          <select
            value={filters.likelihood}
            onChange={(e) => handleFilterChange('likelihood', e.target.value)}
            className="w-full bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            <Users className="inline h-4 w-4 mr-1" />
            Min Mentions
          </label>
          <input
            type="number"
            min="0"
            value={filters.minMentions}
            onChange={(e) => handleFilterChange('minMentions', parseInt(e.target.value) || 0)}
            className="w-full bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Role Type
          </label>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            className="w-full bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="president">President/Politician</option>
            <option value="business">Business</option>
            <option value="legal">Legal</option>
            <option value="media">Media</option>
            <option value="victim">Victim</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            <Calendar className="inline h-4 w-4 mr-1" />
            Current Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
