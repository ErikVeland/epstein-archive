import React, { useMemo } from 'react';
import styles from './MiniClaimGraph.module.css';

interface Claim {
  id: string;
  subjectEntityId: string | null;
  objectEntityId: string | null;
  subjectName?: string;
  objectName?: string;
  objectText?: string | null;
  predicate?: string | null;
  verified?: number;
}

interface MiniClaimGraphProps {
  claims: Claim[];
}

export const MiniClaimGraph: React.FC<MiniClaimGraphProps> = ({ claims }) => {
  const { nodes, edges } = useMemo(() => {
    const uniqueNodes = new Map<string, { id: string; label: string }>();
    const connections: Array<{
      id: string;
      source: string;
      target: string;
      predicate: string;
      isRejected: boolean;
    }> = [];

    claims.forEach((c) => {
      const sId = c.subjectEntityId || `text-s-${c.subjectName}`;
      const sLabel = c.subjectName || 'Unknown Entity';
      const oId = c.objectEntityId || `text-o-${c.objectName || c.objectText}`;
      const oLabel = c.objectName || c.objectText || 'Unknown';

      if (!uniqueNodes.has(sId)) uniqueNodes.set(sId, { id: sId, label: sLabel });
      if (!uniqueNodes.has(oId)) uniqueNodes.set(oId, { id: oId, label: oLabel });

      connections.push({
        id: c.id,
        source: sId,
        target: oId,
        predicate: c.predicate || 'related to',
        isRejected: c.verified === 2,
      });
    });

    const nodeArr = Array.from(uniqueNodes.values());

    // Stable Circular Layout Algorithm
    const centerX = 50;
    const centerY = 50;
    const radius = 35;

    const mappedNodes = nodeArr.map((node, i) => {
      const angle = (i / Math.max(1, nodeArr.length)) * 2 * Math.PI - Math.PI / 2;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    const nodePosMap = new Map(mappedNodes.map((n) => [n.id, n]));

    const mappedEdges = connections
      .map((conn) => {
        const s = nodePosMap.get(conn.source);
        const t = nodePosMap.get(conn.target);
        if (!s || !t) return null;
        return { ...conn, sourceNode: s, targetNode: t };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    return { nodes: mappedNodes, edges: mappedEdges };
  }, [claims]);

  if (nodes.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 100 100" className={styles.svg}>
        <defs>
          <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="18" refY="2" orient="auto">
            <polygon points="0 0, 4 2, 0 4" fill="var(--accent)" opacity="0.6" />
          </marker>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Draw Edge Paths */}
        {edges.map((edge) => (
          <g key={edge.id}>
            <line
              x1={edge.sourceNode.x}
              y1={edge.sourceNode.y}
              x2={edge.targetNode.x}
              y2={edge.targetNode.y}
              className={`${styles.edge} ${edge.isRejected ? styles.edgeRejected : ''}`}
              markerEnd="url(#arrowhead)"
            />
            {/* Simple center indicator for hover / labeling */}
            <circle
              cx={(edge.sourceNode.x + edge.targetNode.x) / 2}
              cy={(edge.sourceNode.y + edge.targetNode.y) / 2}
              r="0.8"
              fill="var(--glass-bg-highlight)"
              stroke="var(--accent)"
              strokeWidth="0.1"
            />
          </g>
        ))}

        {/* Draw Nodes */}
        {nodes.map((node) => (
          <g key={node.id} className={styles.nodeGroup}>
            <circle
              cx={node.x}
              cy={node.y}
              r="2.2"
              className={styles.nodeCircle}
              filter="url(#nodeGlow)"
            />
            <text x={node.x} y={node.y + 4.5} className={styles.label} textAnchor="middle">
              {node.label.length > 15 ? node.label.slice(0, 13) + '…' : node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};
