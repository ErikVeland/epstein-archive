import React from 'react';
import Icon from '../common/Icon';
import { formatNumber } from '@client/utils/formatters';
import type { PropertyStats } from './types';

interface PropertyStatsHeaderProps {
  stats: PropertyStats;
}

export function PropertyStatsHeader({ stats }: PropertyStatsHeaderProps): React.ReactElement {
  return (
    <div className="browser-header">
      <div className="header-content">
        <h1>
          <Icon name="Home" size="lg" />
          Palm Beach Property Records
        </h1>
        <p className="subtitle">
          Explore {formatNumber(stats.totalProperties)} properties from Palm Beach County public
          records
        </p>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <Icon name="Home" size="md" />
          <div className="stat-value">{formatNumber(stats.totalProperties)}</div>
          <div className="stat-label">Total Properties</div>
        </div>
        <div className="stat-card">
          <Icon name="DollarSign" size="md" />
          <div className="stat-value">{formatNumber(stats.maxTaxValue)}</div>
          <div className="stat-label">Max Value</div>
        </div>
        <div className="stat-card">
          <Icon name="TrendingUp" size="md" />
          <div className="stat-value">{formatNumber(stats.avgTaxValue)}</div>
          <div className="stat-label">Average Value</div>
        </div>
        <div className="stat-card flagged">
          <Icon name="AlertTriangle" size="md" />
          <div className="stat-value">{stats.knownAssociateProperties}</div>
          <div className="stat-label">Known Associates</div>
        </div>
      </div>
    </div>
  );
}
