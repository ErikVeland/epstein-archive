import React, { useMemo } from 'react';
import type { Flight, AirportCoords, FlightStats } from './types';

interface FlightMapViewProps {
  flights: Flight[];
  airports: AirportCoords;
  stats: FlightStats | null;
}

export const FlightMapView: React.FC<FlightMapViewProps> = ({ flights, airports, stats }) => {
  const uniqueRoutes = useMemo(() => {
    const routeMap = new Map<string, number>();
    flights.forEach((f) => {
      const key = `${f.departure_airport}-${f.arrival_airport}`;
      routeMap.set(key, (routeMap.get(key) || 0) + 1);
    });
    return Array.from(routeMap.entries()).map(([key, count]) => {
      const [from, to] = key.split('-');
      return { from, to, count };
    });
  }, [flights]);

  const toSvgCoords = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 800;
    const y = ((90 - lat) / 180) * 400;
    return { x, y };
  };

  return (
    <div className="flight-map-container">
      <svg viewBox="0 0 800 400" className="flight-map">
        {/* Simple world background */}
        <rect x="0" y="0" width="800" height="400" fill="#0a0a1a" />

        {/* Grid lines */}
        {[...Array(9)].map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={i * 50}
            x2="800"
            y2={i * 50}
            stroke="#1a1a2e"
            strokeWidth="0.5"
          />
        ))}
        {[...Array(17)].map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 50}
            y1="0"
            x2={i * 50}
            y2="400"
            stroke="#1a1a2e"
            strokeWidth="0.5"
          />
        ))}

        {/* Draw routes */}
        {uniqueRoutes.map((route, i) => {
          const fromCoords = airports[route.from];
          const toCoords = airports[route.to];
          if (!fromCoords || !toCoords) return null;

          const from = toSvgCoords(fromCoords.lat, fromCoords.lng);
          const to = toSvgCoords(toCoords.lat, toCoords.lng);

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 - 30;

          return (
            <g key={i}>
              <path
                d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke={`rgba(0, 200, 255, ${Math.min(0.3 + route.count * 0.1, 0.9)})`}
                strokeWidth={Math.min(1 + route.count * 0.3, 3)}
                strokeDasharray="5,3"
                className="flight-route"
              />
            </g>
          );
        })}

        {/* Draw airports */}
        {Object.entries(airports).map(([code, coords]) => {
          const { x, y } = toSvgCoords(coords.lat, coords.lng);
          const flightCount = stats?.airports.find((a) => a.code === code)?.count || 0;

          return (
            <g key={code} className="airport-marker">
              <circle
                cx={x}
                cy={y}
                r={Math.min(4 + flightCount * 0.3, 10)}
                fill="#00c8ff"
                opacity="0.8"
              />
              <circle
                cx={x}
                cy={y}
                r={Math.min(4 + flightCount * 0.3, 10)}
                fill="none"
                stroke="#00c8ff"
                strokeWidth="2"
                className="airport-pulse"
              />
              <text
                x={x}
                y={y - 12}
                fill="#fff"
                fontSize="8"
                textAnchor="middle"
                className="airport-label"
              >
                {code}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="map-legend">
        <h4>Key Locations</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot primary" /> Primary Hubs
          </div>
          <div className="legend-item">
            <span className="legend-dot secondary" /> Destinations
          </div>
        </div>
      </div>
    </div>
  );
};
