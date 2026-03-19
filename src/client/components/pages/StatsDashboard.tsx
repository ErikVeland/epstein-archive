import React from 'react';
import { Users, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import { Person } from '../../types';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="surface-glass-card p-6 group">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                {card.title}
              </p>
              <h3
                className={`data-emphasis mt-1 ${card.valueColor || 'text-[var(--text-primary)]'}`}
              >
                {card.value}
              </h3>
            </div>
            <div
              className={`p-3 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] ${card.iconColor} bg-opacity-10 ring-1 ring-[var(--glass-border)]`}
            >
              <card.icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--glass-border)]">
            <p className="text-xs text-[var(--text-muted)] font-medium">{card.description}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]">
              {card.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsDashboard;
