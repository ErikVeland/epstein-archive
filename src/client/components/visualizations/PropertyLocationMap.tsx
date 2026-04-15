import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import styles from './PropertyLocationMap.module.css';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyLocationMapProps {
  address: string;
  ownerName: string;
}

interface Coords {
  lat: number;
  lng: number;
}

async function geocode(address: string): Promise<Coords | null> {
  const query = encodeURIComponent(`${address}, Palm Beach, FL`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EpsteinArchive/1.0 (investigative-research-tool)' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export const PropertyLocationMap: React.FC<PropertyLocationMapProps> = ({ address, ownerName }) => {
  const [result, setResult] = useState<{
    address: string;
    coords: Coords | null;
    status: 'loading' | 'found' | 'not_found';
  }>({
    address,
    coords: null,
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;

    geocode(address)
      .then((result) => {
        if (cancelled) return;
        setResult({
          address,
          coords: result,
          status: result ? 'found' : 'not_found',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({
            address,
            coords: null,
            status: 'not_found',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  const isAddressPending = result.address !== address;
  const isLoading = isAddressPending || result.status === 'loading';

  if (isLoading) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.spinner} />
        <span className={styles.placeholderText}>Locating address...</span>
      </div>
    );
  }

  if (result.status === 'not_found' || !result.coords) {
    return (
      <div className={styles.placeholder}>
        <span className={styles.placeholderText}>Location unavailable for this address</span>
      </div>
    );
  }

  return (
    <div className={styles.mapShell}>
      <ScopedErrorBoundary
        fallback={
          <div className={styles.placeholder}>
            <span className={styles.placeholderText}>Map failed to render</span>
          </div>
        }
      >
        <MapContainer
          key={address}
          center={[result.coords.lat, result.coords.lng]}
          zoom={16}
          scrollWheelZoom={false}
          className={styles.map}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[result.coords.lat, result.coords.lng]}>
            <Popup>
              <strong>{ownerName}</strong>
              <br />
              {address}
            </Popup>
          </Marker>
        </MapContainer>
      </ScopedErrorBoundary>
    </div>
  );
};
