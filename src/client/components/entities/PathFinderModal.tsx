import React from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@client/services/apiClient';
import type { GraphPathDto, IcebergEntityRefDto, GraphPathEdgeDto } from '@shared/dto/iceberg';
import styles from './PathFinderModal.module.css';

interface PathFinderModalProps {
  sourceEntityId: string;
  sourceEntityName: string;
  targetEntityId: string;
  targetEntityName: string;
  onClose: () => void;
}

interface PathsApiResponse {
  data: GraphPathDto[];
  total: number;
  limit: number;
}

function isPathsApiResponse(value: unknown): value is PathsApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v['data']) && typeof v['total'] === 'number';
}

export const PathFinderModal: React.FC<PathFinderModalProps> = ({
  sourceEntityId,
  sourceEntityName,
  targetEntityId,
  targetEntityName,
  onClose,
}) => {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shortestPath', sourceEntityId, targetEntityId],
    queryFn: () => apiClient.getShortestPath(sourceEntityId, targetEntityId),
    staleTime: 60_000,
  });

  const paths: GraphPathDto[] = isPathsApiResponse(data) ? data.data : [];
  const bestPath: GraphPathDto | null = paths.length > 0 ? paths[0] : null;

  const handleNodeClick = (node: IcebergEntityRefDto) => {
    navigate(`/people/${encodeURIComponent(String(node.id))}`);
    onClose();
  };

  const modal = (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()} role="document">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.titleLabel}>Path:</span>{' '}
            <span className={styles.titleEntity}>{sourceEntityName}</span>
            <span className={styles.titleArrow}>&rarr;</span>
            <span className={styles.titleEntity}>{targetEntityName}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            aria-label="Close path finder"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {isLoading && (
            <div className={styles.statusRow}>
              <span className={styles.spinner} aria-hidden="true" />
              <span className={styles.statusText}>Finding shortest path&hellip;</span>
            </div>
          )}

          {!isLoading && (isError || !bestPath) && (
            <p className={styles.noPath}>No path found between these entities.</p>
          )}

          {!isLoading && bestPath !== null && (
            <div className={styles.pathRow} role="list" aria-label="Path nodes">
              {bestPath.nodes.map((node: IcebergEntityRefDto, idx: number) => {
                const edge: GraphPathEdgeDto | undefined = bestPath.edges[idx - 1];
                return (
                  <React.Fragment key={node.id}>
                    {idx > 0 && edge !== undefined && (
                      <div className={styles.edgeConnector} aria-hidden="true">
                        <div className={styles.edgeLine} />
                        {edge.type ? <span className={styles.edgeLabel}>{edge.type}</span> : null}
                        <div className={styles.edgeLine} />
                      </div>
                    )}
                    <button
                      type="button"
                      role="listitem"
                      className={styles.nodeBtn}
                      onClick={() => handleNodeClick(node)}
                      title={`Navigate to ${node.name}`}
                    >
                      {node.name}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {!isLoading && bestPath !== null && (
            <p className={styles.meta}>
              {bestPath.pathLength === 1 ? '1 hop' : `${bestPath.pathLength} hops`}
              {' · '}
              score {Math.round(bestPath.score)}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default PathFinderModal;
