import React from 'react';
import { Search } from 'lucide-react';
import { NetworkGraph } from '../../visualizations/NetworkGraph';
import s from './EvidenceNetworkTab.module.css';

interface EvidenceNetworkTabProps {
  networkLoading: boolean;
  relationships: any[];
  graphData: { entities: any[]; relationships: any[] };
  entity: any;
  onEntityClick?: (node: any) => void;
}

export const EvidenceNetworkTab: React.FC<EvidenceNetworkTabProps> = ({
  networkLoading,
  relationships,
  graphData,
  entity,
  onEntityClick,
}) => {
  const handleDefaultEntityClick = (node: any) => {
    if (String(node.id) !== String(entity?.id)) {
      window.open(`/entities/${node.id}`, '_blank');
    }
  };

  return (
    <div className={s.container} data-testid="entity-modal-tab-network">
      {networkLoading ? (
        <div className={s.loadingState}>
          <Search size={32} className={s.loadingIcon} />
          <p>Loading network graph...</p>
        </div>
      ) : relationships.length === 0 ? (
        <div className={s.emptyState}>
          <Search size={32} className={s.emptyIcon} />
          <p>No connections found.</p>
        </div>
      ) : (
        <NetworkGraph
          entities={graphData.entities}
          relationships={graphData.relationships}
          onEntityClick={onEntityClick || handleDefaultEntityClick}
          maxNodes={50}
        />
      )}
    </div>
  );
};
