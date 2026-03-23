import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Don't forget to import CSS in your main app entry or here
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';

// Fix for default marker icon issues with webpack/cra
// See: https://github.com/PaulLeCam/react-leaflet/issues/453
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface RouteMapProps {
  departure: {
    lat: number;
    lng: number;
    name: string;
    code?: string;
  };
  arrival: {
    lat: number;
    lng: number;
    name: string;
    code?: string;
  };
  className?: string;
}

// Component to handle auto-zooming to bounds
const BoundsController: React.FC<{ bounds: L.LatLngBoundsExpression }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
};

export const RouteMap: React.FC<RouteMapProps> = ({ departure, arrival, className = '' }) => {
  // Calculate bounds to include both points
  const bounds = useMemo(() => {
    return L.latLngBounds([
      [departure.lat, departure.lng],
      [arrival.lat, arrival.lng],
    ]);
  }, [departure, arrival]);

  // Check if coordinates are valid
  if (
    !departure.lat ||
    !departure.lng ||
    !arrival.lat ||
    !arrival.lng ||
    departure.lat === 0 ||
    arrival.lat === 0
  ) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] h-64 ${className}`}
      >
        <p className="text-[var(--text-muted)]">Map data unavailable for this route</p>
      </div>
    );
  }

  // Calculate center (though fitBounds will override this)
  const center: L.LatLngExpression = [
    (departure.lat + arrival.lat) / 2,
    (departure.lng + arrival.lng) / 2,
  ];

  return (
    <div
      className={`h-[400px] w-full rounded-[var(--radius-xl)] overflow-hidden border border-[var(--glass-border)] shadow-[var(--glass-shadow)] ${className}`}
    >
      <ScopedErrorBoundary
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-[var(--glass-bg-strong)] p-4 text-center">
            <p className="text-[var(--accent-danger)] text-sm">Failed to render the route map.</p>
          </div>
        }
      >
        <MapContainer
          center={center}
          zoom={4}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
          style={{ height: '100%', width: '100%', minHeight: '300px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Departure Marker */}
          <Marker position={[departure.lat, departure.lng]}>
            <Popup>
              <strong>Departure:</strong>
              <br />
              {departure.name} {departure.code && `(${departure.code})`}
            </Popup>
          </Marker>

          {/* Arrival Marker */}
          <Marker position={[arrival.lat, arrival.lng]}>
            <Popup>
              <strong>Arrival:</strong>
              <br />
              {arrival.name} {arrival.code && `(${arrival.code})`}
            </Popup>
          </Marker>

          {/* Flight Path Line */}
          <Polyline
            positions={[
              [departure.lat, departure.lng],
              [arrival.lat, arrival.lng],
            ]}
            color="#3b82f6" // Blue-500
            weight={4}
            opacity={0.7}
            dashArray="10, 10" // Dashed line for effect
          />

          <BoundsController bounds={bounds} />
        </MapContainer>
      </ScopedErrorBoundary>
    </div>
  );
};
