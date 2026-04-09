import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Shield,
  User,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useScrollLock } from '../../hooks/useScrollLock';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import styles from './InteractiveEntityMap.module.css';

// Fix for default marker icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapEntity {
  id: number | string;
  label: string;
  lat: number;
  lng: number;
  mentions: number;
  risk_level: string;
  risk_score: number;
  type: string;
}

interface InteractiveEntityMapProps {
  className?: string;
  onEntitySelect?: (entityId: number) => void;
  minRiskLevel?: number;
}

// Map Controller for auto-zoom
const MapController: React.FC<{ entities: MapEntity[] }> = ({ entities }) => {
  const map = useMap();

  useEffect(() => {
    map.setMinZoom(2);
    map.setMaxBounds([
      [-90, -180],
      [90, 180],
    ]);

    if (entities.length > 0) {
      const bounds = L.latLngBounds(entities.map((e) => [e.lat, e.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    } else {
      map.setView([20, 0], 2); // World view
    }
  }, [map, entities]);

  return null;
};

export const InteractiveEntityMap: React.FC<InteractiveEntityMapProps> = ({
  className = '',
  onEntitySelect,
  minRiskLevel = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  useScrollLock(isExpanded);

  const {
    data: entities = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery<MapEntity[]>({
    queryKey: ['map-entities', minRiskLevel],
    queryFn: async () => {
      const res = await apiClient.get<MapEntity[]>(`/map/entities?minRisk=${minRiskLevel}`, {
        useCache: true,
      });

      const entityRows = Array.isArray(res) ? res : [];
      if (entityRows.length > 0) return entityRows;

      // Real-data fallback: show airport locations from flight logs when entity geo coords are absent.
      const airports = await apiClient.get<
        Record<string, { lat: number; lng: number; city: string }>
      >('/flights/airports', { useCache: true });

      const airportEntities: MapEntity[] = Object.entries(airports || {}).map(([code, value]) => ({
        id: `airport-${code}`,
        label: `${code} (${value.city})`,
        lat: Number(value.lat),
        lng: Number(value.lng),
        mentions: 0,
        risk_level: 'LOW',
        risk_score: 0,
        type: 'Airport',
      }));

      if (airportEntities.length > 0) return airportEntities;

      throw new Error('No geospatial coordinates available for entities or flights');
    },
  });

  const loading = isLoading;
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load map data'
    : null;
  const fetchMapEntities = refetch;

  const getMarkerIcon = (riskScore: number) => {
    // Dynamic color based on risk
    const color = riskScore >= 4 ? 'red' : riskScore >= 2 ? 'orange' : 'blue';

    // Custom DIV icon for performant rendering
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="
        background-color: ${color};
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  };

  const mapContent = (
    <div className={styles.mapShell}>
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
        </div>
      )}

      {error && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorCard}>
            <AlertTriangle className={styles.alertIconLg} />
            <p className={styles.errorText}>{error}</p>
            <button onClick={() => void fetchMapEntities()} className={styles.errorRetry}>
              Retry
            </button>
          </div>
        </div>
      )}

      <ScopedErrorBoundary
        fallback={
          <div className={styles.fallback}>
            <div className={styles.fallbackCard}>
              <AlertTriangle className={styles.alertIconLg} />
              <p className={styles.fallbackTitle}>Map Rendering Failed</p>
              <p className={styles.fallbackBody}>Entity markers may be corrupted.</p>
            </div>
          </div>
        }
      >
        <MapContainer
          center={[20, 0]}
          zoom={2}
          maxBoundsViscosity={1.0}
          className={styles.mapContainer}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <MapController entities={entities} />

          {entities.map((entity) => (
            <Marker
              key={entity.id}
              position={[entity.lat, entity.lng]}
              icon={getMarkerIcon(entity.risk_score)}
              eventHandlers={{
                click: () => {
                  // Determine functionality
                },
              }}
            >
              <Popup className="custom-popup">
                <div className={styles.popupCard}>
                  <div className={styles.popupHeader}>
                    <h4 className={styles.popupTitle}>{entity.label}</h4>
                    <div
                      className={`${styles.riskBadge} ${
                        entity.risk_score >= 4 ? styles.riskBadgeHigh : styles.riskBadgeLow
                      }`}
                    >
                      {entity.risk_level}
                    </div>
                  </div>

                  <div className={styles.popupMeta}>
                    <div className={styles.popupRow}>
                      <User className={styles.popupIcon} />
                      <span>{entity.type}</span>
                    </div>
                    <div className={styles.popupRow}>
                      <Shield className={styles.popupIcon} />
                      <span>{entity.mentions} Mentions</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (typeof entity.id === 'number') onEntitySelect?.(entity.id);
                    }}
                    className={styles.profileButton}
                  >
                    View Profile <Navigation className={styles.buttonIcon} />
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </ScopedErrorBoundary>

      {/* Stats Overlay */}
      <div className={styles.statsOverlay}>
        <div className={styles.statsRow}>
          <MapPin className={styles.statsIcon} />
          <span className={styles.statsValue}>{entities.length} Locations</span>
        </div>
        {entities.length >= 500 && <div className={styles.statsWarning}>Cap Reached (Top 500)</div>}
      </div>
    </div>
  );

  if (isExpanded) {
    return (
      <div className={styles.expandedShell}>
        <div className={styles.expandedHeader}>
          <h2 className={styles.expandedTitle}>
            <MapPin className={styles.headerIcon} />
            Global Entity Map
          </h2>
          <button onClick={() => setIsExpanded(false)} className={styles.collapseButton}>
            <Minimize2 className={styles.headerIcon} />
          </button>
        </div>
        <div className={styles.expandedBody}>{mapContent}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.cardShell} ${className}`}>
      <div className={styles.expandButtonWrap}>
        <button
          onClick={() => setIsExpanded(true)}
          className={styles.expandButton}
          title="Expand Map"
          aria-label="Expand map"
        >
          <Maximize2 className={styles.expandIcon} />
        </button>
      </div>
      {mapContent}
    </div>
  );
};
