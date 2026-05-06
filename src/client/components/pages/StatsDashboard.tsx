import React from 'react';
import { Person } from '@client/types';
import Icon from '@client/components/common/Icon';
import { Surface } from '@client/design-system/lib';
import s from './StatsDashboard.module.css';

interface StatsDashboardProps {
  people: Person[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ people }) => {
  const stats = {
    total: people.length,
    highRisk: people.filter((p) => p.likelihoodScore === 'HIGH').length,
    totalMentions: people.reduce((sum, p) => sum + p.mentions, 0),
    avgMentions:
      people.length > 0
        ? Math.round(people.reduce((sum, p) => sum + p.mentions, 0) / people.length)
        : 0,
  };

  const cards = [
    {
      title: 'Total People',
      value: stats.total.toLocaleString(),
      iconName: 'Users',
      iconColor: s.colorAccent,
      description: 'Individuals tracked in the archive',
      trend: 'Updated daily',
    },
    {
      title: 'High Risk Targets',
      value: stats.highRisk.toLocaleString(),
      iconName: 'AlertTriangle',
      iconColor: s.colorDanger,
      valueColor: s.colorDanger,
      description: 'Red Flag Index 4+',
      trend: `${Math.round((stats.highRisk / stats.total) * 100)}% of total`,
    },
    {
      title: 'Total Mentions',
      value: stats.totalMentions.toLocaleString(),
      iconName: 'FileText',
      iconColor: s.colorSuccess,
      description: 'Cross-referenced citations',
      trend: 'Across 2,000+ docs',
    },
    {
      title: 'Avg. Mentions',
      value: stats.avgMentions.toLocaleString(),
      iconName: 'TrendingUp',
      iconColor: s.colorWarning,
      description: 'Per individual entity',
      trend: 'Relevance metric',
    },
  ];

  return (
    <div className={s.grid}>
      {cards.map((card, index) => (
        <Surface key={index} variant="panel">
          <div className={s.cardInner}>
            <div className={s.cardHeader}>
              <div>
                <p className={s.cardTitle}>{card.title}</p>
                <h3 className={`data-emphasis ${s.cardValue} ${card.valueColor || s.colorPrimary}`}>
                  {card.value}
                </h3>
              </div>
              <div className={`${s.iconBox} ${card.iconColor}`}>
                <Icon name={card.iconName} className={`${s.icon} ${card.iconColor}`} />
              </div>
            </div>

            <div className={s.cardFooter}>
              <p className={s.description}>{card.description}</p>
              <span className={s.trendBadge}>{card.trend}</span>
            </div>
          </div>
        </Surface>
      ))}
    </div>
  );
};

export default StatsDashboard;
