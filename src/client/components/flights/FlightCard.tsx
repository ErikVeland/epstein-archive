import React from 'react';
import Icon from '../common/Icon';
import type { Flight } from './types';
import styles from './FlightCard.module.css';

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  formatDate: (dateStr: string) => string;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, onSelect, formatDate }) => (
  <button
    type="button"
    className={`flight-card ${styles.buttonRoot}`}
    onClick={() => onSelect(flight)}
    aria-label={`Open flight details for ${flight.departure_airport} to ${flight.arrival_airport} on ${formatDate(flight.date)}`}
  >
    <div className="flight-date">
      <span className="date-badge">{formatDate(flight.date)}</span>
    </div>

    <div className="flight-route">
      <div className="airport departure">
        <span className="airport-code">{flight.departure_airport}</span>
        <span className="airport-city">{flight.departure_city}</span>
      </div>

      <div className="flight-line">
        <div className="plane-icon">✈</div>
        <div className="dashed-line" />
      </div>

      <div className="airport arrival">
        <span className="airport-code">{flight.arrival_airport}</span>
        <span className="airport-city">{flight.arrival_city}</span>
      </div>
    </div>

    <div className="flight-passengers">
      <span className="passenger-count">
        <Icon name="Users" size="sm" /> {flight.passengers?.length || 0} passengers
      </span>
      <div className="passenger-names">
        {flight.passengers?.slice(0, 3).map((p, i) => (
          <span key={i} className={`passenger-tag ${p.role}`}>
            {p.passenger_name}
          </span>
        ))}
        {(flight.passengers?.length || 0) > 3 && (
          <span className="more-passengers">+{(flight.passengers?.length || 0) - 3} more</span>
        )}
      </div>
    </div>

    <div className={`flight-aircraft ${styles.aircraftInfo}`}>
      <span className="tail-number">{flight.aircraft_tail}</span>
      <span className="aircraft-type">{flight.aircraft_type}</span>
    </div>
  </button>
);
