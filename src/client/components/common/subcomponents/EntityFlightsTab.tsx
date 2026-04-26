import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plane, ArrowRight, MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import s from './EntityFlightsTab.module.css';

interface CoPassenger {
  passenger_name: string;
  role: string;
  entity_id: number | null;
}

interface EntityFlight {
  id: number;
  date: string;
  departure_airport: string;
  departure_city: string;
  departure_country: string;
  arrival_airport: string;
  arrival_city: string;
  arrival_country: string;
  aircraft_tail: string;
  aircraft_type: string;
  passenger_role: string;
  co_passengers: CoPassenger[];
}

interface EntityFlightsTabProps {
  entityId: string;
}

export const EntityFlightsTab: React.FC<EntityFlightsTabProps> = ({ entityId }) => {
  const { data, isLoading } = useQuery<{ flights: EntityFlight[] }>({
    queryKey: ['entity-flights', entityId],
    queryFn: async () => {
      const res = await fetch(`/api/entities/${entityId}/flights`);
      if (!res.ok) throw new Error('Failed to fetch flights');
      return res.json() as Promise<{ flights: EntityFlight[] }>;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });

  const flights = data?.flights ?? [];

  const formatDate = (dateStr: string): string =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatCity = (city: string, airport: string): string => city || airport;

  return (
    <div className={s.tabContainer} data-testid="entity-modal-tab-flights">
      <div className={s.header}>
        <h3 className={s.headerTitle}>
          <Plane size={16} className={s.flightIcon} />
          Flight Log
        </h3>
        <div className={s.countBadge}>
          {isLoading ? 'Loading…' : `${flights.length} flight${flights.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className={s.listContainer}>
        {isLoading && (
          <div className={s.skeletonStack}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={s.skeletonCard} />
            ))}
          </div>
        )}

        {!isLoading && flights.length === 0 && (
          <div className={s.emptyState}>
            <Plane size={48} className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>No Flight Records</h4>
            <p className={s.emptyText}>
              No flights are linked to this entity in the flight log corpus.
            </p>
          </div>
        )}

        {!isLoading &&
          flights.map((flight) => (
            <div key={flight.id} className={s.card}>
              <div className={s.cardTop}>
                <div className={s.route}>
                  <span>{formatCity(flight.departure_city, flight.departure_airport)}</span>
                  <ArrowRight size={14} className={s.arrow} />
                  <span>{formatCity(flight.arrival_city, flight.arrival_airport)}</span>
                </div>
                <Link to={`/flights/${flight.id}`} className={s.viewLink}>
                  View →
                </Link>
              </div>

              <div className={s.meta}>
                <span className={s.dateBadge}>{formatDate(flight.date)}</span>
                <span className={s.metaItem}>
                  <MapPin size={11} />
                  {flight.departure_airport} → {flight.arrival_airport}
                </span>
                <span className={s.metaItem}>
                  <Shield size={11} />
                  {flight.aircraft_tail}
                </span>
              </div>

              {flight.co_passengers.length > 0 && (
                <div className={s.coPassengers}>
                  {flight.co_passengers.slice(0, 8).map((p, i) =>
                    p.entity_id ? (
                      <Link
                        key={i}
                        to={`/entity/${p.entity_id}`}
                        className={s.passengerPillLinked}
                        title={p.role}
                      >
                        {p.passenger_name}
                      </Link>
                    ) : (
                      <span key={i} className={s.passengerPill} title={p.role}>
                        {p.passenger_name}
                      </span>
                    ),
                  )}
                  {flight.co_passengers.length > 8 && (
                    <span className={s.passengerPill}>+{flight.co_passengers.length - 8} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};
