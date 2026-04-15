import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Surface, Flex, Box, Stack, LqText, Button, cn } from '../../design-system/lib';
import type { Flight, AirportCoords, FlightStats } from './types';
import styles from './FlightTracker.module.css';

interface FlightMapViewProps {
  flights: Flight[];
  airports: AirportCoords;
  stats: FlightStats | null;
}

export const FlightMapView: React.FC<FlightMapViewProps> = ({ flights, airports, stats }) => {
  const [mapTransform, setMapTransform] = useState({ scale: 1, x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDistRef = useRef<number>(0);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const prev = pointersRef.current.get(e.pointerId)!;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setMapTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const scaleDelta = dist / pinchDistRef.current;
      pinchDistRef.current = dist;
      setMapTransform((t) => ({
        ...t,
        scale: Math.max(0.5, Math.min(5, t.scale * scaleDelta)),
      }));
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
  }, []);

  const resetTransform = useCallback(() => {
    setMapTransform({ scale: 1, x: 0, y: 0 });
  }, []);

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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          touchAction: 'none',
          cursor: 'grab',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${mapTransform.x}px, ${mapTransform.y}px) scale(${mapTransform.scale})`,
            transformOrigin: '50% 50%',
            willChange: 'transform',
          }}
        >
          <svg viewBox="0 0 800 400" className={styles.flightMap}>
            {/* Simple world background */}
            <rect
              x="0"
              y="0"
              width="800"
              height="400"
              fill="color-mix(in srgb, var(--bg-dark) 40%, transparent)"
            />

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
        </div>
      </div>

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

      {mapTransform.scale !== 1 || mapTransform.x !== 0 || mapTransform.y !== 0 ? (
        <Button
          onClick={resetTransform}
          variant="glass"
          size="sm"
          className={styles.resetViewButton}
        >
          Reset view
        </Button>
      ) : null}
    </Surface>
  );
};
