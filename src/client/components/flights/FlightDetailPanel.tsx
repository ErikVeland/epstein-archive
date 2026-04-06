import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { CloseButton } from '../common/CloseButton';
import { RouteMap } from '../visualizations/RouteMap';
import { useScrollLock } from '../../hooks/useScrollLock';
import type { Flight, AirportCoords } from './types';
import styles from './FlightDetailPanel.module.css';

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
  useScrollLock(!!flight);

  if (!flight) return null;

  const departureCoords = airports[flight.departure_airport];
  const arrivalCoords = airports[flight.arrival_airport];

  return createPortal(
    <div className="flight-modal-overlay">
      <button
        type="button"
        className={styles.backdropButton}
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
          className={`modal-close-btn ${styles.closeBtn}`}
        />

        <div className="modal-header" style={{ paddingRight: '3rem' }}>
          <h2 id="flight-details-title">Flight Details</h2>
          <span className="flight-date">{formatDate(flight.date)}</span>
        </div>

        {/* Flight Route Map & Info */}
        <div className={styles.routeGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <Icon name="ArrowUpRight" className={styles.infoCardIconAccent} size="sm" />
              <span className={styles.infoCardLabel}>Departure</span>
            </div>
            <div className={styles.infoCardAirport}>{flight.departure_airport}</div>
            <div className={styles.infoCardDate}>{new Date(flight.date).toLocaleString()}</div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <Icon name="ArrowDown" className={styles.infoCardIconEmerald} size="sm" />
              <span className={styles.infoCardLabel}>Arrival</span>
            </div>
            <div className={styles.infoCardAirport}>{flight.arrival_airport}</div>
            <div className={styles.infoCardDate}>{new Date(flight.date).toLocaleString()}</div>
          </div>
        </div>

        {/* Flight Route Map */}
        {(departureCoords || arrivalCoords) && (
          <div className={styles.mapSection}>
            <h4 className={styles.mapSectionTitle}>
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
              <div className={styles.mapUnavailable}>
                <Icon name="MapPin" size="lg" className={styles.mapUnavailableIcon} />
                <p className={styles.mapUnavailableText}>
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
