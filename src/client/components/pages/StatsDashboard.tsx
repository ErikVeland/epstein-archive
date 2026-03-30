import React from 'react';
import { Users, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { Person } from '../../types';
import s from './StatsDashboard.module.css';

interface StatsDashboardProps {
  people: Person[];
}

const StatsDashboard: React.FC<StatsDashboardProps> = ({ people }) => {
  const stats = {
    total: people.length,
    highRisk: people.filter((p) => p.likelihoodScore === 'HIGH').length,
    totalMentions: people.reduce((sum, p) => sum + p.mentions, 0),
    avgMentions: Math.round(people.reduce((sum, p) => sum + p.mentions, 0) / people.length),
  };

  const cards = [
    {
      title: 'Total People',
      value: stats.total.toLocaleString(),
      icon: Users,
      iconColor: 'text-[var(--accent)]',
      description: 'Individuals tracked in the archive',
      trend: 'Updated daily',
    },
    {
      title: 'High Risk Targets',
      value: stats.highRisk.toLocaleString(),
      icon: AlertTriangle,
      iconColor: 'text-[var(--accent-danger)]',
      valueColor: 'text-[var(--accent-danger)]',
      description: 'Red Flag Index 4+',
      trend: `${Math.round((stats.highRisk / stats.total) * 100)}% of total`,
    },
    {
      title: 'Total Mentions',
      value: stats.totalMentions.toLocaleString(),
      icon: FileText,
      iconColor: 'text-[var(--accent-success)]',
      description: 'Cross-referenced citations',
      trend: 'Across 2,000+ docs',
    },
    {
      title: 'Avg. Mentions',
      value: stats.avgMentions.toLocaleString(),
      icon: TrendingUp,
      iconColor: 'text-[var(--accent-warning)]',
      description: 'Per individual entity',
      trend: 'Relevance metric',
    },
  ];

  return (
    <div className={s.grid}>
      {cards.map((card, index) => (
        <div key={index} className="surface-glass-card">
          <div className={s.cardInner}>
            <div className={s.cardHeader}>
              <div>
                <p className={s.cardTitle}>{card.title}</p>
                <h3
                  className={`data-emphasis ${s.cardValue} ${card.valueColor || 'text-[var(--text-primary)]'}`}
                >
                  {card.value}
                </h3>
              </div>
              <div className={`${s.iconBox} ${card.iconColor}`}>
                <card.icon className={`${s.icon} ${card.iconColor}`} />
              </div>
            </div>

            <div className={s.cardFooter}>
              <p className={s.description}>{card.description}</p>
              <span className={s.trendBadge}>{card.trend}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsDashboard;
