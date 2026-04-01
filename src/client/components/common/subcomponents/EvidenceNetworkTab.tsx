import React from 'react';
import { Search } from 'lucide-react';
import { NetworkGraph } from '../../visualizations/NetworkGraph';
import s from './EvidenceNetworkTab.module.css';

export interface GraphNode {
  id: string | number;
  name?: string;
  role?: string;
  type?: string;
  riskLevel?: number;
  connectionCount?: number;
  [key: string]: unknown;
}

export interface GraphRelationship {
  sourceId: string | number;
  targetId: string | number;
  source?: string;
  target?: string;
  type?: string;
  weight?: number;
  [key: string]: unknown;
}

interface EvidenceEntity {
  id?: string | number;
}

interface EvidenceNetworkTabProps {
  networkLoading: boolean;
  relationships: GraphRelationship[];
  graphData: { entities: GraphNode[]; relationships: GraphRelationship[] };
  entity: EvidenceEntity | null;
  onEntityClick?: (node: GraphNode) => void;
}

export const EvidenceNetworkTab: React.FC<EvidenceNetworkTabProps> = ({
  networkLoading,
  relationships,
  graphData,
  entity,
  onEntityClick,
}) => {
  const handleDefaultEntityClick = (node: GraphNode) => {
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
          entities={graphData.entities as Parameters<typeof NetworkGraph>[0]['entities']}
          relationships={
            graphData.relationships as Parameters<typeof NetworkGraph>[0]['relationships']
          }
          onEntityClick={
            (onEntityClick as Parameters<typeof NetworkGraph>[0]['onEntityClick']) ||
            (handleDefaultEntityClick as Parameters<typeof NetworkGraph>[0]['onEntityClick'])
          }
          maxNodes={50}
        />
      )}
    </div>
  );
};
