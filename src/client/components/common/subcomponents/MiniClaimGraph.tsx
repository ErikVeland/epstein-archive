import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
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

    // Spread horizontally to prevent vertical congestion
    const centerX = 160; // Half of 320
    const centerY = 60; // Half of 120
    const radiusX = 120;
    const radiusY = 40;

    const mappedNodes = nodeArr.map((node, i) => {
      const angle = (i / Math.max(1, nodeArr.length)) * 2 * Math.PI - Math.PI / 2;
      // Use elliptic distribution
      return {
        ...node,
        x: centerX + radiusX * Math.cos(angle),
        y: centerY + radiusY * Math.sin(angle),
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
    <div className={styles.wrapper} style={{ cursor: 'grab' }}>
      <svg viewBox="0 0 320 120" className={styles.svg} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="24" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill="var(--accent)" opacity="0.8" />
          </marker>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Native Pan via Framer Motion Drag */}
        <motion.g drag dragMomentum={true} dragElastic={0.2} whileDrag={{ cursor: 'grabbing' }}>
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
              <circle
                cx={(edge.sourceNode.x + edge.targetNode.x) / 2}
                cy={(edge.sourceNode.y + edge.targetNode.y) / 2}
                r="1.8"
                fill="var(--glass-bg-highlight)"
                stroke="var(--accent)"
                strokeWidth="0.5"
              />
              <text
                x={(edge.sourceNode.x + edge.targetNode.x) / 2}
                y={(edge.sourceNode.y + edge.targetNode.y) / 2 - 3}
                textAnchor="middle"
                className={styles.edgeLabel}
              >
                {edge.predicate}
              </text>
            </g>
          ))}

          {/* Draw Nodes */}
          {nodes.map((node) => (
            <g key={node.id} className={styles.nodeGroup}>
              <circle
                cx={node.x}
                cy={node.y}
                r="4.5"
                className={styles.nodeCircle}
                filter="url(#nodeGlow)"
              />
              <text x={node.x} y={node.y + 10} className={styles.label} textAnchor="middle">
                {node.label.length > 28 ? node.label.slice(0, 25) + '…' : node.label}
              </text>
            </g>
          ))}
        </motion.g>
      </svg>
      <div className={styles.hint}>Drag background to navigate</div>
    </div>
  );
};
