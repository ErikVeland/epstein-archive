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
      iconColor: 'text-primary-400',
      description: 'Individuals tracked in the archive',
      trend: 'Updated daily',
    },
    {
      title: 'High Risk Targets',
      value: stats.highRisk.toLocaleString(),
      icon: AlertTriangle,
      iconColor: 'text-danger-400',
      valueColor: 'text-danger-400',
      description: 'Red Flag Index 4+',
      trend: `${Math.round((stats.highRisk / stats.total) * 100)}% of total`,
    },
    {
      title: 'Total Mentions',
      value: stats.totalMentions.toLocaleString(),
      icon: FileText,
      iconColor: 'text-emerald-400',
      description: 'Cross-referenced citations',
      trend: 'Across 2,000+ docs',
    },
    {
      title: 'Avg. Mentions',
      value: stats.avgMentions.toLocaleString(),
      icon: TrendingUp,
      iconColor: 'text-amber-400',
      description: 'Per individual entity',
      trend: 'Relevance metric',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all duration-300 group"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                {card.title}
              </p>
              <h3 className={`text-3xl font-bold mt-1 ${card.valueColor || 'text-white'}`}>
                {card.value}
              </h3>
            </div>
            <div
              className={`p-3 rounded-lg bg-slate-800/80 ${card.iconColor} bg-opacity-10 ring-1 ring-white/5`}
            >
              <card.icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 font-medium">{card.description}</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400">
              {card.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsDashboard;
