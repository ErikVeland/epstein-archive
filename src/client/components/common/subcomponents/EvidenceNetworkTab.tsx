import React, { useState } from 'react';
import { Search, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NetworkGraph } from '../../visualizations/NetworkGraph';
import { useIsTouch } from '../../../hooks/useIsTouch';
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
  const isTouch = useIsTouch();
  const navigate = useNavigate();
  const [showGraph, setShowGraph] = useState(false);

  const handleDefaultEntityClick = (node: GraphNode) => {
    if (String(node.id) !== String(entity?.id)) {
      window.open(`/entities/${node.id}`, '_blank');
    }
  };

  if (networkLoading) {
    return (
      <div className={s.container} data-testid="entity-modal-tab-network">
        <div className={s.loadingState}>
          <Search size={32} className={s.loadingIcon} />
          <p>Loading network graph...</p>
        </div>
      </div>
    );
  }

  if (relationships.length === 0) {
    return (
      <div className={s.container} data-testid="entity-modal-tab-network">
        <div className={s.emptyState}>
          <Search size={32} className={s.emptyIcon} />
          <p>No connections found.</p>
        </div>
      </div>
    );
  }

  // On touch: show relationship list; "View Graph" toggles to graph mode
  if (isTouch && !showGraph) {
    const peers = graphData.entities.filter((n) => String(n.id) !== String(entity?.id));
    return (
      <div className={s.container} data-testid="entity-modal-tab-network">
        <div className={s.listHeader}>
          <span className={s.listCount}>{peers.length} connections</span>
          <button
            type="button"
            className={s.viewGraphBtn}
            onClick={() => setShowGraph(true)}
            aria-label="View network graph"
          >
            <Share2 size={14} />
            View Graph
          </button>
        </div>
        <div className={s.list}>
          {peers.map((node) => {
            const rel = relationships.find(
              (r) =>
                String(r.sourceId) === String(node.id) || String(r.targetId) === String(node.id),
            );
            const handleTap = () => {
              if (onEntityClick) {
                onEntityClick(node);
              } else {
                navigate(`/entity/${node.id}`);
              }
            };
            return (
              <button
                key={String(node.id)}
                type="button"
                className={s.listRow}
                onClick={handleTap}
                aria-label={`View ${node.name ?? node.id}`}
              >
                <div className={s.listRowContent}>
                  <span className={s.listName}>{node.name ?? String(node.id)}</span>
                  {node.role && <span className={s.listRole}>{String(node.role)}</span>}
                </div>
                {rel?.type && <span className={s.listRelType}>{String(rel.type)}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={s.container} data-testid="entity-modal-tab-network">
      {isTouch && (
        <button
          type="button"
          className={s.backToListBtn}
          onClick={() => setShowGraph(false)}
          aria-label="Back to relationship list"
        >
          ← List
        </button>
      )}
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
    </div>
  );
};
