import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import Icon from '../common/Icon';
import type { CoOccurrence } from './types';
import s from './FlightNetworkView.module.css';

interface FlightNetworkViewProps {
  coOccurrences: CoOccurrence[];
  networkLoading: boolean;
}

export const FlightNetworkView: React.FC<FlightNetworkViewProps> = ({
  coOccurrences,
  networkLoading,
}) => {
  const backLinkState = useBackLinkState();
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
      <div className={s.loadingState}>
        <div className={s.loadingSpinner}>
          <div className={s.radarSweep} />
          <span>Analyzing passenger connections...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={s.networkView}>
      <div className={s.networkHeader}>
        <h3>
          <Icon name="Users" size="sm" /> Passenger Co-Occurrence Network
        </h3>
        <p className={s.networkDescription}>
          Shows which passengers frequently flew together. Stronger connections indicate more shared
          flights.
        </p>
      </div>

      {/* Top Co-Travelers */}
      <div className={s.coOccurrenceList}>
        <h4>Top Co-Travelers</h4>
        <div className={s.coOccurrenceGrid}>
          {topConnections.map((co, i) => (
            <div key={i} className={s.coOccurrenceCard}>
              <div className={s.coPassengers}>
                <span className={s.passengerName}>
                  {co.entity_id1 ? (
                    <Link to={`/entity/${co.entity_id1}`} state={backLinkState}>
                      {co.passenger1}
                    </Link>
                  ) : (
                    co.passenger1
                  )}
                </span>
                <span className={s.connectionIndicator}>
                  <Icon name="Link" size="sm" />
                  <span className={s.flightCount}>{co.flights_together}</span>
                </span>
                <span className={s.passengerName}>
                  {co.entity_id2 ? (
                    <Link to={`/entity/${co.entity_id2}`} state={backLinkState}>
                      {co.passenger2}
                    </Link>
                  ) : (
                    co.passenger2
                  )}
                </span>
              </div>
              <div className={s.connectionBar}>
                <div
                  className={s.connectionFill}
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
      <div className={s.connectedPassengers}>
        <h4>Most Connected Passengers</h4>
        <div className={s.passengerConnectionsGrid}>
          {nodes.slice(0, 15).map((node, i) => (
            <div key={i} className={s.passengerConnectionCard}>
              <span className={s.rank}>#{i + 1}</span>
              <span className={s.name}>
                {node.entityId ? (
                  <Link to={`/entity/${node.entityId}`} state={backLinkState}>
                    {node.name}
                  </Link>
                ) : (
                  node.name
                )}
              </span>
              <span className={s.connectionCount}>{node.connections} shared flights</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
