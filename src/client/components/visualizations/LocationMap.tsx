import React, { useState } from 'react';
import { MapPin, Maximize2, Minimize2, ExternalLink, Navigation } from 'lucide-react';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import { useScrollLock } from '../../hooks/useScrollLock';
import styles from './LocationMap.module.css';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  title?: string;
  className?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  latitude,
  longitude,
  title = 'Location',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  useScrollLock(isExpanded);

  // Round coordinates for display
  const latDisplay = Math.abs(latitude).toFixed(5) + '° ' + (latitude >= 0 ? 'N' : 'S');
  const lngDisplay = Math.abs(longitude).toFixed(5) + '° ' + (longitude >= 0 ? 'E' : 'W');

  // Generate map URLs
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const appleMapsUrl = `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(title)}`;

  // OpenStreetMap embed URL (free, no API key needed)
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01},${latitude - 0.01},${longitude + 0.01},${latitude + 0.01}&layer=mapnik&marker=${latitude},${longitude}`;
  const osmLargeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.05},${latitude - 0.05},${longitude + 0.05},${latitude + 0.05}&layer=mapnik&marker=${latitude},${longitude}`;

  // Detect if user is on Apple device
  const isAppleDevice = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

  if (isExpanded) {
    return (
      <ScopedErrorBoundary>
        <div className={styles.fullscreenOverlay}>
          {/* Header */}
          <div className={styles.fullscreenHeader}>
            <div className={styles.fullscreenTitleGroup}>
              <MapPin className={styles.fullscreenTitleIcon} />
              <div>
                <h3 className={styles.fullscreenTitle}>{title}</h3>
                <p className={styles.fullscreenCoordinates}>
                  {latDisplay}, {lngDisplay}
                </p>
              </div>
            </div>
            <div className={styles.fullscreenActions}>
              <a
                href={isAppleDevice ? appleMapsUrl : googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openMapsButton}
              >
                <Navigation className={styles.buttonIcon} />
                Open in Maps
              </a>
              <button onClick={() => setIsExpanded(false)} className={styles.collapseButton}>
                <Minimize2 className={styles.fullscreenTitleIcon} />
              </button>
            </div>
          </div>

          {/* Full map */}
          <div className={styles.fullscreenMap}>
            <iframe
              src={osmLargeUrl}
              className={styles.mapFrame}
              title={`Map of ${title}`}
              loading="lazy"
            />
          </div>
        </div>
      </ScopedErrorBoundary>
    );
  }

  return (
    <ScopedErrorBoundary>
      <div className={`${styles.mapCard} ${className}`}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLabel}>
            <MapPin className={styles.cardHeaderIcon} />
            <span className={styles.cardHeaderText}>Location</span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className={styles.expandButton}
            title="Expand map"
          >
            <Maximize2 className={styles.cardHeaderIcon} />
          </button>
        </div>

        {/* Mini map */}
        <button
          type="button"
          className={styles.miniMapButton}
          onClick={() => setIsExpanded(true)}
          aria-label={`Expand map for ${title}`}
        >
          <iframe
            src={osmEmbedUrl}
            className={styles.miniMapFrame}
            title={`Map of ${title}`}
            loading="lazy"
          />
          <div className={styles.miniMapOverlay} />
        </button>

        {/* Coordinates & Links */}
        <div className={styles.footer}>
          <div className={styles.coordinates}>
            {latDisplay}, {lngDisplay}
          </div>
          <div className={styles.linkRow}>
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapLink}
            >
              <ExternalLink className={styles.linkIcon} />
              Apple Maps
            </a>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapLink}
            >
              <ExternalLink className={styles.linkIcon} />
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </ScopedErrorBoundary>
  );
};

export default LocationMap;
