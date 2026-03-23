import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import type { CoOccurrence } from './types';

interface FlightNetworkViewProps {
  coOccurrences: CoOccurrence[];
  networkLoading: boolean;
}

export const FlightNetworkView: React.FC<FlightNetworkViewProps> = ({
  coOccurrences,
  networkLoading,
}) => {
  const nodes = useMemo(() => {
    const nodeMap = new Map<string, { name: string; connections: number; entityId?: number }>();
    coOccurrences.forEach((co) => {
      if (!nodeMap.has(co.passenger1)) {
        nodeMap.set(co.passenger1, {
          name: co.passenger1,
          connections: 0,
          entityId: co.entity_id1,
        });
      }
      if (!nodeMap.has(co.passenger2)) {
        nodeMap.set(co.passenger2, {
          name: co.passenger2,
          connections: 0,
          entityId: co.entity_id2,
        });
      }
      const node1 = nodeMap.get(co.passenger1);
      const node2 = nodeMap.get(co.passenger2);
      if (node1) node1.connections += co.flights_together;
      if (node2) node2.connections += co.flights_together;
    });
    return Array.from(nodeMap.values()).sort((a, b) => b.connections - a.connections);
  }, [coOccurrences]);

  const topConnections = useMemo(() => coOccurrences.slice(0, 30), [coOccurrences]);

  if (networkLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner">
          <div className="radar-sweep" />
          <span>Analyzing passenger connections...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="network-view">
      <div className="network-header">
        <h3>
          <Icon name="Users" size="sm" /> Passenger Co-Occurrence Network
        </h3>
        <p className="network-description">
          Shows which passengers frequently flew together. Stronger connections indicate more shared
          flights.
        </p>
      </div>

      {/* Top Co-Travelers */}
      <div className="co-occurrence-list">
        <h4>Top Co-Travelers</h4>
        <div className="co-occurrence-grid">
          {topConnections.map((co, i) => (
            <div key={i} className="co-occurrence-card">
              <div className="co-passengers">
                <span className="passenger-name">
                  {co.entity_id1 ? (
                    <Link to={`/entity/${co.entity_id1}`}>{co.passenger1}</Link>
                  ) : (
                    co.passenger1
                  )}
                </span>
                <span className="connection-indicator">
                  <Icon name="Link" size="sm" />
                  <span className="flight-count">{co.flights_together}</span>
                </span>
                <span className="passenger-name">
                  {co.entity_id2 ? (
                    <Link to={`/entity/${co.entity_id2}`}>{co.passenger2}</Link>
                  ) : (
                    co.passenger2
                  )}
                </span>
              </div>
              <div className="connection-bar">
                <div
                  className="connection-fill"
                  style={{
                    width: `${Math.min((co.flights_together / (topConnections[0]?.flights_together || 1)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Connected Passengers */}
      <div className="connected-passengers">
        <h4>Most Connected Passengers</h4>
        <div className="passenger-connections-grid">
          {nodes.slice(0, 15).map((node, i) => (
            <div key={i} className="passenger-connection-card">
              <span className="rank">#{i + 1}</span>
              <span className="name">
                {node.entityId ? (
                  <Link to={`/entity/${node.entityId}`}>{node.name}</Link>
                ) : (
                  node.name
                )}
              </span>
              <span className="connection-count">{node.connections} shared flights</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .network-view {
          padding: 20px;
        }
        .network-header {
          margin-bottom: 24px;
        }
        .network-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 8px 0;
        }
        .network-description {
          color: #888;
          margin: 0;
        }
        .co-occurrence-list, .connected-passengers {
          background: #1a1a2e;
          border: 1px solid #2a2a4a;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .co-occurrence-list h4, .connected-passengers h4 {
          margin: 0 0 16px 0;
          font-size: 1rem;
        }
        .co-occurrence-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .co-occurrence-card {
          background: #0a0a1a;
          border-radius: 8px;
          padding: 12px 16px;
        }
        .co-passengers {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .passenger-name {
          flex: 1;
        }
        .passenger-name a {
          color: #6366f1;
          text-decoration: none;
        }
        .passenger-name a:hover {
          text-decoration: underline;
        }
        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #10b981;
          font-weight: 600;
        }
        .flight-count {
          background: #10b981;
          color: #000;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.85rem;
        }
        .connection-bar {
          height: 4px;
          background: #2a2a4a;
          border-radius: 2px;
          overflow: hidden;
        }
        .connection-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #10b981);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
        .passenger-connections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 12px;
        }
        .passenger-connection-card {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #0a0a1a;
          padding: 12px 16px;
          border-radius: 8px;
        }
        .passenger-connection-card .rank {
          font-weight: 700;
          color: #6366f1;
          min-width: 30px;
        }
        .passenger-connection-card .name {
          flex: 1;
        }
        .passenger-connection-card .name a {
          color: #6366f1;
          text-decoration: none;
        }
        .passenger-connection-card .connection-count {
          color: #888;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};
