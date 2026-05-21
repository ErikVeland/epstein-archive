import React from 'react';
import Icon from '@client/components/common/Icon';
import { cn } from '@client/utils/cn';
import { formatNumber } from '@client/utils/formatters';
import type { PropertyStats } from './types';
import styles from './PropertyStatsHeader.module.css';

interface PropertyStatsHeaderProps {
  stats: PropertyStats;
}

export function PropertyStatsHeader({ stats }: PropertyStatsHeaderProps): React.ReactElement {
  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>
          <Icon name="Home" size="lg" />
          Palm Beach Property Records
        </h1>
        <p className={styles.subtitle}>
          Explore {formatNumber(stats.totalProperties)} properties from Palm Beach County public
          records
        </p>
      </div>

      <div className={styles.statsSummary}>
        <div className={styles.statCard}>
          <Icon name="Home" size="md" />
          <div className={styles.statValue}>{formatNumber(stats.totalProperties)}</div>
          <div className={styles.statLabel}>Total Properties</div>
        </div>
        <div className={styles.statCard}>
          <Icon name="DollarSign" size="md" />
          <div className={styles.statValue}>{formatNumber(stats.maxTaxValue)}</div>
          <div className={styles.statLabel}>Max Value</div>
        </div>
        <div className={styles.statCard}>
          <Icon name="TrendingUp" size="md" />
          <div className={styles.statValue}>{formatNumber(stats.avgTaxValue)}</div>
          <div className={styles.statLabel}>Average Value</div>
        </div>
        <div className={cn(styles.statCard, styles.flaggedCard)}>
          <Icon name="AlertTriangle" size="md" />
          <div className={styles.statValue}>{stats.knownAssociateProperties}</div>
          <div className={styles.statLabel}>Known Associates</div>
        </div>
      </div>
    </div>
  );
}
