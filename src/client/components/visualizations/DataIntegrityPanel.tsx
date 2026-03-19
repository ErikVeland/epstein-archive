import React from 'react';
import { AlertTriangle, Clock, Database } from 'lucide-react';

interface DataIntegrityStats {
  entitiesWithDocuments: number;
  totalEntities: number;
  documentsWithMetadata: number;
  totalDocuments: number;
  lastRefresh: string;
}

interface DataIntegrityPanelProps {
  stats: DataIntegrityStats;
}

export const DataIntegrityPanel: React.FC<DataIntegrityPanelProps> = ({ stats }) => {
  const entityLinkPercentage =
    stats.totalEntities > 0
      ? Math.round((stats.entitiesWithDocuments / stats.totalEntities) * 100)
      : 0;

  const documentMetadataPercentage =
    stats.totalDocuments > 0
      ? Math.round((stats.documentsWithMetadata / stats.totalDocuments) * 100)
      : 0;

  return (
    <div className="bg-[var(--glass-bg)]/60 backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 shadow-[var(--glass-shadow)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center">
          <Database className="h-5 w-5 mr-2 text-[var(--accent)]" />
          Data Integrity
        </h3>
        <span className="text-xs text-[var(--text-muted)] flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          {stats.lastRefresh}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-5">
        {/* Entities with document links */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Entities with document links</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {entityLinkPercentage}%
            </span>
          </div>
          <div className="w-full bg-[var(--glass-bg-highlight)]/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                entityLinkPercentage >= 95
                  ? 'bg-emerald-500'
                  : entityLinkPercentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
              style={{ width: `${entityLinkPercentage}%` }}
            ></div>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1.5">
            {stats.entitiesWithDocuments.toLocaleString()} of {stats.totalEntities.toLocaleString()}{' '}
            entities linked
          </div>
        </div>

        {/* Documents with complete metadata */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--text-secondary)]">Documents with complete metadata</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {documentMetadataPercentage}%
            </span>
          </div>
          <div className="w-full bg-[var(--glass-bg-highlight)]/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                documentMetadataPercentage >= 95
                  ? 'bg-emerald-500'
                  : documentMetadataPercentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
              style={{ width: `${documentMetadataPercentage}%` }}
            ></div>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1.5">
            {stats.documentsWithMetadata.toLocaleString()} of{' '}
            {stats.totalDocuments.toLocaleString()} documents complete
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-[var(--glass-border)]">
        <button className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center group">
          Methodology & Sources
          <AlertTriangle className="h-3.5 w-3.5 ml-1.5 text-amber-400 group-hover:text-amber-300" />
        </button>
      </div>
    </div>
  );
};
