import React from 'react';
import { formatCurrency, formatNumber } from '@client/utils/formatters';
import type { PropertyStats, ValueDistribution, TopOwner } from './types';
import styles from './PropertyAnalyticsView.module.css';

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
    <div className={styles.analyticsView}>
      {/* Value Distribution */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Property Value Distribution</h3>
        <div className={styles.valueChart}>
          {valueDistribution.map((bucket, i) => {
            const height = (bucket.count / maxCount) * 100;
            return (
              <div key={i} className={styles.chartBar}>
                <div
                  className={styles.barFill}
                  style={{ height: `${height}%` }}
                  title={`${bucket.count} properties`}
                />
                <span className={styles.barLabel}>{bucket.range}</span>
                <span className={styles.barCount}>{formatNumber(bucket.count)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Owners */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Top Property Owners</h3>
        <div className={styles.topOwnersList}>
          {topOwners.slice(0, 20).map((owner, i) => (
            <div key={i} className={styles.ownerRow}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.ownerName}>{owner.owner_name}</span>
              <span className={styles.propertyCount}>{owner.property_count} properties</span>
              <span className={styles.totalValue}>{formatCurrency(owner.total_value)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Property Types */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Property Types</h3>
        <div className={styles.typeBreakdown}>
          {propertyTypes.slice(0, 10).map((pt) => (
            <div key={pt.type} className={styles.typeItem}>
              <span className={styles.typeName}>{pt.type || 'Unknown'}</span>
              <div className={styles.typeBar}>
                <div
                  className={styles.typeFill}
                  style={{
                    width: `${(pt.count / (stats.totalProperties || 1)) * 100}%`,
                  }}
                />
              </div>
              <span className={styles.typeCount}>{formatNumber(pt.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
