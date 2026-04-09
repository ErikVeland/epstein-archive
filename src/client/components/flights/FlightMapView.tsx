import React, { useMemo } from 'react';
import { Surface, Flex, Box, Stack, LqText, cn } from '../../design-system/lib';
import type { Flight, AirportCoords, FlightStats } from './types';
import styles from './FlightTracker.module.css';

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
    <Surface variant="panel" className={styles.flightMapContainer}>
      <svg viewBox="0 0 800 400" className={styles.flightMap}>
        {/* Simple world background */}
        <rect x="0" y="0" width="800" height="400" fill="rgba(6, 6, 15, 0.4)" />

        {/* Grid lines */}
        {[...Array(9)].map((_, i) => (
          <line
            key={`h${i}`}
            x1="0"
            y1={i * 50}
            x2="800"
            y2={i * 50}
            stroke="var(--glass-border)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}
        {[...Array(17)].map((_, i) => (
          <line
            key={`v${i}`}
            x1={i * 50}
            y1="0"
            x2={i * 50}
            y2="400"
            stroke="var(--glass-border)"
            strokeWidth="0.5"
            opacity="0.3"
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

          const routeColor = `color-mix(in srgb, var(--accent) ${Math.min(30 + route.count * 10, 90)}%, transparent)`;

          return (
            <g key={i}>
              <path
                d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                fill="none"
                stroke={routeColor}
                strokeWidth={Math.min(1 + route.count * 0.3, 3)}
                strokeDasharray="5,3"
                className={styles.flightRoutePath}
              />
            </g>
          );
        })}

        {/* Draw airports */}
        {Object.entries(airports).map(([code, coords]) => {
          const { x, y } = toSvgCoords(coords.lat, coords.lng);
          const flightCount = stats?.airports.find((a) => a.code === code)?.count || 0;

          return (
            <g key={code} className={styles.airportMarker}>
              <circle
                cx={x}
                cy={y}
                r={Math.min(4 + flightCount * 0.3, 10)}
                fill="var(--accent)"
                opacity="0.8"
              />
              <circle
                cx={x}
                cy={y}
                r={Math.min(4 + flightCount * 0.3, 10)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                className={styles.airportPulse}
              />
              <text
                x={x}
                y={y - 12}
                fill="var(--text-primary)"
                fontSize="8"
                fontWeight="bold"
                textAnchor="middle"
                className={styles.airportLabel}
              >
                {code}
              </text>
            </g>
          );
        })}
      </svg>

      <Surface variant="glass-strong" className={styles.mapLegend}>
        <LqText
          variant="xs"
          weight="bold"
          color="accent"
          style={{ textTransform: 'uppercase' }}
          className={styles.legendTitle}
        >
          Key Locations
        </LqText>
        <Stack gap="xs" className={styles.legendItems}>
          <Flex align="center" gap="xs" className={styles.legendItem}>
            <Box className={cn(styles.legendDot, styles.primary)} />
            <LqText variant="xs" weight="bold">
              Primary Hubs
            </LqText>
          </Flex>
          <Flex align="center" gap="xs" className={styles.legendItem}>
            <Box className={cn(styles.legendDot, styles.secondary)} />
            <LqText variant="xs" weight="bold">
              Destinations
            </LqText>
          </Flex>
        </Stack>
      </Surface>
    </Surface>
  );
};
