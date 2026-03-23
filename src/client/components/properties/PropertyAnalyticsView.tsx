import React from 'react';
import { formatCurrency, formatNumber } from '@client/utils/formatters';
import type { PropertyStats, ValueDistribution, TopOwner } from './types';

interface PropertyAnalyticsViewProps {
  stats: PropertyStats;
  valueDistribution: ValueDistribution[];
  topOwners: TopOwner[];
  propertyTypes: PropertyStats['propertyTypes'];
}

export function PropertyAnalyticsView({
  stats,
  valueDistribution,
  topOwners,
  propertyTypes,
}: PropertyAnalyticsViewProps): React.ReactElement {
  const maxCount =
    valueDistribution.length > 0 ? Math.max(...valueDistribution.map((v) => v.count)) : 1;

  return (
    <div className="analytics-view">
      {/* Value Distribution */}
      <div className="analytics-section">
        <h3>Property Value Distribution</h3>
        <div className="value-chart">
          {valueDistribution.map((bucket, i) => {
            const height = (bucket.count / maxCount) * 100;
            return (
              <div key={i} className="chart-bar">
                <div
                  className="bar-fill"
                  style={{ height: `${height}%` }}
                  title={`${bucket.count} properties`}
                />
                <span className="bar-label">{bucket.range}</span>
                <span className="bar-count">{formatNumber(bucket.count)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Owners */}
      <div className="analytics-section">
        <h3>Top Property Owners</h3>
        <div className="top-owners-list">
          {topOwners.slice(0, 20).map((owner, i) => (
            <div key={i} className="owner-row">
              <span className="rank">#{i + 1}</span>
              <span className="owner-name">{owner.owner_name}</span>
              <span className="property-count">{owner.property_count} properties</span>
              <span className="total-value">{formatCurrency(owner.total_value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Property Types */}
      <div className="analytics-section">
        <h3>Property Types</h3>
        <div className="type-breakdown">
          {propertyTypes.slice(0, 10).map((pt) => (
            <div key={pt.type} className="type-item">
              <span className="type-name">{pt.type || 'Unknown'}</span>
              <div className="type-bar">
                <div
                  className="type-fill"
                  style={{
                    width: `${(pt.count / (stats.totalProperties || 1)) * 100}%`,
                  }}
                />
              </div>
              <span className="type-count">{formatNumber(pt.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
