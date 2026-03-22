import React, { useState } from 'react';
import { MapPin, Maximize2, Minimize2, ExternalLink, Navigation } from 'lucide-react';

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
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[var(--glass-bg-strong)]/95 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h3 className="text-[var(--text-primary)] font-semibold">{title}</h3>
              <p className="text-sm text-[var(--text-muted)]">
                {latDisplay}, {lngDisplay}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={isAppleDevice ? appleMapsUrl : googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] text-sm font-medium transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Open in Maps
            </a>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full map */}
        <div className="flex-1">
          <iframe
            src={osmLargeUrl}
            className="w-full h-full border-0"
            title={`Map of ${title}`}
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[var(--glass-bg)]/60 backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-xl)] overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--accent)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Location</span>
        </div>
        <button
          onClick={() => setIsExpanded(true)}
          className="p-1.5 hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          title="Expand map"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mini map */}
      <button
        type="button"
        className="relative h-32 w-full bg-transparent text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset"
        onClick={() => setIsExpanded(true)}
        aria-label={`Expand map for ${title}`}
      >
        <iframe
          src={osmEmbedUrl}
          className="w-full h-full border-0 pointer-events-none"
          title={`Map of ${title}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
      </button>

      {/* Coordinates & Links */}
      <div className="p-3 space-y-2">
        <div className="text-xs text-[var(--text-muted)] font-mono">
          {latDisplay}, {lngDisplay}
        </div>
        <div className="flex gap-2">
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--glass-bg-highlight)]/50 hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-lg)] text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Apple Maps
          </a>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[var(--glass-bg-highlight)]/50 hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-lg)] text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Google Maps
          </a>
        </div>
      </div>
    </div>
  );
};

export default LocationMap;
