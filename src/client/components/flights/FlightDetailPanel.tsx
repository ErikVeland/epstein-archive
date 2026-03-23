import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { CloseButton } from '../common/CloseButton';
import { RouteMap } from '../visualizations/RouteMap';
import type { Flight, AirportCoords } from './types';

interface FlightDetailPanelProps {
  flight: Flight | null;
  airports: AirportCoords;
  onClose: () => void;
  formatDate: (dateStr: string) => string;
}

export const FlightDetailPanel: React.FC<FlightDetailPanelProps> = ({
  flight,
  airports,
  onClose,
  formatDate,
}) => {
  if (!flight) return null;

  const departureCoords = airports[flight.departure_airport];
  const arrivalCoords = airports[flight.arrival_airport];

  return createPortal(
    <div className="flight-modal-overlay">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close flight details"
        onClick={onClose}
      />
      <div
        className="flight-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-details-title"
        onClick={(e) => e.stopPropagation()}
      >
        <CloseButton
          onClick={onClose}
          size="sm"
          label="Close flight details"
          className="modal-close-btn border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/80 text-[var(--text-primary)]"
        />

        <div className="modal-header" style={{ paddingRight: '3rem' }}>
          <h2 id="flight-details-title">Flight Details</h2>
          <span className="flight-date">{formatDate(flight.date)}</span>
        </div>

        {/* Flight Route Map & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--glass-bg)]/50 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ArrowUpRight" className="text-[var(--accent)]" size="sm" />
              <span className="text-sm font-medium text-[var(--text-muted)]">Departure</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {flight.departure_airport}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {new Date(flight.date).toLocaleString()}
            </div>
          </div>

          <div className="bg-[var(--glass-bg)]/50 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="ArrowDown" className="text-emerald-400" size="sm" />
              <span className="text-sm font-medium text-[var(--text-muted)]">Arrival</span>
            </div>
            <div className="text-lg font-bold text-[var(--text-primary)] mb-1">
              {flight.arrival_airport}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {new Date(flight.date).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Flight Route Map */}
        {(departureCoords || arrivalCoords) && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[var(--text-muted)] mb-3 flex items-center gap-2">
              <Icon name="Globe" size="sm" />
              Flight Path Visualization
            </h4>
            {departureCoords && arrivalCoords ? (
              <RouteMap
                departure={{
                  lat: departureCoords.lat,
                  lng: departureCoords.lng,
                  name: flight.departure_city || flight.departure_airport,
                  code: flight.departure_airport,
                }}
                arrival={{
                  lat: arrivalCoords.lat,
                  lng: arrivalCoords.lng,
                  name: flight.arrival_city || flight.arrival_airport,
                  code: flight.arrival_airport,
                }}
              />
            ) : (
              <div className="bg-[var(--glass-bg)]/50 p-8 rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-center">
                <Icon name="MapPin" size="lg" className="text-[var(--text-primary)] mb-2 mx-auto" />
                <p className="text-[var(--text-muted)]">
                  Complete route data unavailable for map visualization
                </p>
              </div>
            )}
          </div>
        )}

        <div className="modal-route">
          <div className="route-endpoint">
            <span className="code">{flight.departure_airport}</span>
            <span className="city">{flight.departure_city}</span>
          </div>
          <div className="route-arrow">→</div>
          <div className="route-endpoint">
            <span className="code">{flight.arrival_airport}</span>
            <span className="city">{flight.arrival_city}</span>
          </div>
        </div>

        <div className="modal-section">
          <h3>Aircraft</h3>
          <p>
            {flight.aircraft_type} ({flight.aircraft_tail})
          </p>
        </div>

        <div className="modal-section">
          <h3>Passenger Manifest ({flight.passengers?.length || 0})</h3>
          <div className="passenger-list">
            {flight.passengers?.map((p, i) => (
              <div key={i} className="passenger-row">
                <span className={`role-badge ${p.role}`}>{p.role}</span>
                {p.entity_id ? (
                  <Link to={`/entity/${p.entity_id}`} className="passenger-link">
                    {p.passenger_name}
                  </Link>
                ) : (
                  <span>{p.passenger_name}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add to Investigation */}
        <div
          className="modal-section"
          style={{ borderTop: '1px solid #2a2a4a', paddingTop: '16px' }}
        >
          <AddToInvestigationButton
            item={{
              id: String(flight.id),
              title: `Flight ${flight.aircraft_tail}: ${flight.departure_airport} → ${flight.arrival_airport}`,
              description: `${formatDate(flight.date)} - ${flight.passengers?.length || 0} passengers including ${flight.passengers
                ?.slice(0, 3)
                .map((p) => p.passenger_name)
                .join(', ')}${flight.passengers && flight.passengers.length > 3 ? '...' : ''}`,
              type: 'flight',
              sourceId: String(flight.id),
              metadata: {
                date: flight.date,
                departure: flight.departure_airport,
                arrival: flight.arrival_airport,
                aircraft: flight.aircraft_tail,
                passengerCount: flight.passengers?.length || 0,
              },
            }}
            variant="button"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
