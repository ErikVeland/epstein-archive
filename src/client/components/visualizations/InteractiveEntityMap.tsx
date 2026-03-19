import React, { useEffect, useState, useCallback } from 'react';
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
    map.options.maxBoundsViscosity = 1.0;

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
  const [entities, setEntities] = useState<MapEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchMapEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<MapEntity[]>(`/map/entities?minRisk=${minRiskLevel}`, {
        useCache: true,
      });

      const entityRows = Array.isArray(res) ? res : [];
      if (entityRows.length > 0) {
        setEntities(entityRows);
        return;
      }

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

      if (airportEntities.length > 0) {
        setEntities(airportEntities);
      } else {
        setEntities([]);
        setError('No geospatial coordinates available for entities or flights');
      }
    } catch (err) {
      console.error('Failed to fetch map entities:', err);
      setError('Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, [minRiskLevel]);

  useEffect(() => {
    fetchMapEntities();
  }, [fetchMapEntities]);

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
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[var(--glass-bg-strong)]/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[var(--glass-bg-strong)]/80 backdrop-blur-sm">
          <div className="text-center p-4">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={fetchMapEntities}
              className="mt-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <MapContainer
        center={[20, 0]}
        zoom={2}
        className="h-full w-full z-0 bg-[var(--glass-bg-strong)]"
        style={{ height: '100%', width: '100%', minHeight: '300px' }}
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
              <div className="p-2 min-w-[200px]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-[var(--text-primary)] text-sm">{entity.label}</h4>
                  <div
                    className={`
                    px-1.5 py-0.5 rounded text-[10px] font-bold uppercase
                    ${entity.risk_score >= 4 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                  `}
                  >
                    {entity.risk_level}
                  </div>
                </div>

                <div className="text-xs text-[var(--text-primary)] mb-2">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{entity.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>{entity.mentions} Mentions</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (typeof entity.id === 'number') onEntitySelect?.(entity.id);
                  }}
                  className="w-full mt-2 px-3 py-1.5 bg-[var(--glass-bg-strong)] text-[var(--text-primary)] text-xs rounded hover:bg-[var(--glass-bg-highlight)] transition-colors flex items-center justify-center gap-1"
                >
                  View Profile <Navigation className="w-3 h-3" />
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Stats Overlay */}
      <div className="absolute top-4 right-4 z-[400] bg-[var(--glass-bg-strong)]/90 backdrop-blur border border-[var(--glass-border)] p-2 rounded-[var(--radius-lg)] text-xs shadow-[var(--glass-shadow)]">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-3 h-3 text-[var(--accent)]" />
          <span className="text-[var(--text-primary)] font-mono">{entities.length} Locations</span>
        </div>
        {entities.length >= 500 && (
          <div className="text-orange-400 text-[10px]">Cap Reached (Top 500)</div>
        )}
      </div>
    </div>
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--accent)]" />
            Global Entity Map
          </h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] text-[var(--text-primary)]"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 relative">{mapContent}</div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-[var(--radius-xl)] overflow-hidden border border-[var(--glass-border)] shadow-[var(--glass-shadow)] ${className}`}
    >
      <div className="absolute bottom-4 left-4 z-[400]">
        <button
          onClick={() => setIsExpanded(true)}
          className="p-2 bg-[var(--glass-bg-strong)]/90 backdrop-blur hover:bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] transition-colors"
          title="Expand Map"
          aria-label="Expand map"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      {mapContent}
    </div>
  );
};
