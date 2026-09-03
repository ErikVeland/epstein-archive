import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiClient } from '@client/services/apiClient';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { Button, Skeleton } from '@client/design-system/lib';
import { mapLocationsSchema, airportLocationsSchema } from '@shared/contracts/analyticsMap';
import type { AnalyticsMapLocation } from '@shared/dto/analyticsMap';
import styles from './InteractiveEntityMap.module.css';

interface InteractiveEntityMapProps {
  className?: string;
  onEntitySelect?: (entityId: number) => void;
  minRiskLevel?: number;
}

function LocationCanvas({
  locations,
  onTileError,
}: {
  locations: AnalyticsMapLocation[];
  onTileError: () => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    // Own the map lifetime so Strict Mode can safely mount, clean up, and mount again.
    const map = L.map(element.current, { minZoom: 0, maxZoom: 18, scrollWheelZoom: false }).setView(
      [20, 0],
      2,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      maxZoom: 19,
    })
      .on('tileerror', onTileError)
      .addTo(map);
    for (const location of locations) {
      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = location.label;
      const context = document.createElement('p');
      context.textContent =
        location.type === 'Airport'
          ? 'Airport reference point, not evidence of a visit.'
          : `${location.type} location record. Coordinates do not establish a visit.`;
      const link = document.createElement('a');
      link.href = location.type === 'Airport' ? '/flights' : `/entity/${location.id}`;
      link.textContent =
        location.type === 'Airport' ? 'Inspect flight records →' : 'Open profile →';
      popup.append(title, context, link);
      L.circleMarker([location.lat, location.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: '#0284c7',
        fillOpacity: 1,
      })
        .bindPopup(popup)
        .addTo(map);
    }
    if (locations.length)
      map.fitBounds(L.latLngBounds(locations.map((location) => [location.lat, location.lng])), {
        padding: [30, 30],
        maxZoom: 8,
      });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(element.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
  }, [locations, onTileError]);
  return (
    <div
      ref={element}
      className={styles.mapContainer}
      style={{ height: 400 }}
      aria-label="Archive location map"
    />
  );
}

export const InteractiveEntityMap: React.FC<InteractiveEntityMapProps> = ({
  className = '',
  onEntitySelect,
  minRiskLevel = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tileError, setTileError] = useState(false);
  const reportTileError = React.useCallback(() => setTileError(true), []);
  useScrollLock(isExpanded);
  const query = useQuery({
    queryKey: ['analytics-map-locations', minRiskLevel],
    queryFn: async () => {
      const rows = mapLocationsSchema.parse(
        await apiClient.get<unknown>(`/map/entities?minRisk=${minRiskLevel}`, { useCache: true }),
      );
      if (rows.length) return rows;
      const airports = airportLocationsSchema.parse(
        await apiClient.get<unknown>('/flights/airports', { useCache: true }),
      );
      return Object.entries(airports).map(([code, airport]) => ({
        id: `airport-${code}`,
        label: `${code} (${airport.city})`,
        lat: airport.lat,
        lng: airport.lng,
        type: 'Airport',
      }));
    },
    staleTime: 60000,
  });
  const locations = query.data ?? [];
  return (
    <div className={`${isExpanded ? styles.expandedShell : styles.cardShell} ${className}`}>
      <div className={styles.expandedHeader}>
        <span>
          {locations.length}{' '}
          {locations.some((row) => row.type === 'Airport')
            ? 'airport reference points · no entity coordinates available'
            : 'entity location records'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label={isExpanded ? 'Collapse map' : 'Expand map'}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      {query.isLoading ? (
        <Skeleton height={400} aria-label="Loading locations" />
      ) : query.isError ? (
        <div role="alert">
          <p>Location data unavailable. No locations have been inferred.</p>
          <Button onClick={() => void query.refetch()}>Retry locations</Button>
        </div>
      ) : !locations.length ? (
        <p>No entity or airport coordinates are available.</p>
      ) : (
        <LocationCanvas locations={locations} onTileError={reportTileError} />
      )}
      {tileError && (
        <p role="status">Some map tiles could not load. Use the location links below.</p>
      )}
      <details>
        <summary>Location records ({locations.length})</summary>
        <ul>
          {locations.map((location) => (
            <li key={location.id}>
              <Link
                to={location.type === 'Airport' ? '/flights' : `/entity/${location.id}`}
                onClick={(event) => {
                  if (location.type !== 'Airport' && onEntitySelect) {
                    event.preventDefault();
                    onEntitySelect(Number(location.id));
                  }
                }}
              >
                {location.label}
              </Link>{' '}
              · {location.type}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};
