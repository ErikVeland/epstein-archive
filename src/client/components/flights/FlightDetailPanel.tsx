import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Globe, Users, Plane, Shield, X, MapPin } from 'lucide-react';
import { Surface, Flex, Box, Stack, LqText, Button, cn } from '../../design-system/lib';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { RouteMap } from '../visualizations/RouteMap';
import { useScrollLock } from '../../hooks/useScrollLock';
import { MobileStackHeader } from '../layout/MobileStackHeader';
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
  type FlightPassenger = NonNullable<Flight['passengers']>[number];

  const manifestsByRole = useMemo(() => {
    if (!flight?.passengers) return {};
    return flight.passengers.reduce(
      (acc, p) => {
        const role = p.role || 'Personnel';
        if (!acc[role]) acc[role] = [];
        acc[role].push(p);
        return acc;
      },
      {} as Record<string, FlightPassenger[]>,
    );
  }, [flight]);

  if (!flight) return null;

  const departureCoords = airports[flight.departure_airport];
  const arrivalCoords = airports[flight.arrival_airport];

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (isMobile) {
    return (
      <Box className={styles.fullScreenMobile}>
        <MobileStackHeader
          title={`Flight ${flight.aircraft_tail}`}
          subtitle={formatDate(flight.date)}
          onBack={onClose}
        />
        <Stack gap="lg" className={styles.content}>
          <Flex gap="md" className={styles.routeGrid}>
            <Surface variant="panel" className={styles.infoCard}>
              <Stack gap="xs">
                <Flex align="center" gap="xs">
                  <ArrowUpRight size={14} className={styles.iconDeparture} />
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Departure
                  </LqText>
                </Flex>
                <LqText variant="h2" weight="bold">
                  {flight.departure_airport}
                </LqText>
                <LqText variant="xs" color="muted">
                  {flight.departure_city}
                </LqText>
              </Stack>
            </Surface>

            <Surface variant="panel" className={styles.infoCard}>
              <Stack gap="xs">
                <Flex align="center" gap="xs">
                  <ArrowDownRight size={14} className={styles.iconArrival} />
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Arrival
                  </LqText>
                </Flex>
                <LqText variant="h2" weight="bold">
                  {flight.arrival_airport}
                </LqText>
                <LqText variant="xs" color="muted">
                  {flight.arrival_city}
                </LqText>
              </Stack>
            </Surface>
          </Flex>

          {(departureCoords || arrivalCoords) && (
            <Surface variant="panel" className={styles.mapSection}>
              <Flex align="center" gap="sm" className={styles.sectionHeader}>
                <Globe size={16} color="var(--accent)" />
                <LqText variant="small" weight="bold">
                  Route Visualization
                </LqText>
              </Flex>
              <Box className={styles.mapWrapper}>
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
                  <Flex
                    align="center"
                    justify="center"
                    direction="column"
                    gap="md"
                    className={styles.mapUnavailable}
                  >
                    <MapPin size={32} color="var(--text-muted)" />
                    <LqText variant="xs" color="muted" align="center">
                      Complete route coordinates unavailable for visualization
                    </LqText>
                  </Flex>
                )}
              </Box>
            </Surface>
          )}

          <Surface variant="panel" className={styles.manifestSection}>
            <Flex align="center" justify="between" className={styles.sectionHeader}>
              <Flex align="center" gap="sm">
                <Users size={16} color="var(--accent)" />
                <LqText variant="small" weight="bold">
                  Passenger Manifest
                </LqText>
              </Flex>
              <LqText variant="xs" weight="bold" color="muted">
                {flight.passengers?.length || 0} Entities
              </LqText>
            </Flex>
            <Stack gap="lg" className={styles.passengerList}>
              {Object.entries(manifestsByRole).map(([role, passengers]) => (
                <Stack key={role} gap="xs">
                  <div className={styles.roleHeader}>
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="accent"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      {role}
                    </LqText>
                  </div>
                  <Stack gap="xs">
                    {passengers.map((p, i) => (
                      <Surface key={i} variant="glass-strong" className={styles.passengerRow}>
                        <Flex align="center" justify="between">
                          <Flex align="center" gap="sm">
                            <Surface
                              variant="glass-strong"
                              className={cn(styles.roleIcon, styles[p.role.toLowerCase()])}
                            >
                              <Shield size={12} />
                            </Surface>
                            {p.entity_id ? (
                              <Link to={`/entity/${p.entity_id}`} className={styles.passengerLink}>
                                <LqText variant="xs" weight="medium">
                                  {p.passenger_name}
                                </LqText>
                              </Link>
                            ) : (
                              <LqText variant="xs">{p.passenger_name}</LqText>
                            )}
                          </Flex>
                        </Flex>
                      </Surface>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Surface>

          <Surface variant="panel" className={styles.aircraftSection}>
            <Flex align="center" gap="sm" className={styles.sectionHeader}>
              <Plane size={16} color="var(--accent)" />
              <LqText variant="small" weight="bold">
                Aircraft Intelligence
              </LqText>
            </Flex>
            <Flex justify="between" align="stretch" gap="md">
              <Stack gap="xxs" className={styles.aircraftMeta}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Tail Number
                </LqText>
                <LqText variant="small" weight="bold" color="accent">
                  {flight.aircraft_tail}
                </LqText>
              </Stack>
              <Stack gap="xxs" className={styles.aircraftMeta}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Type / Model
                </LqText>
                <LqText variant="xs" weight="medium">
                  {flight.aircraft_type || 'Unknown'}
                </LqText>
              </Stack>
            </Flex>
          </Surface>

          <Box className={styles.actions}>
            <AddToInvestigationButton
              item={{
                id: String(flight.id),
                title: `Flight ${flight.aircraft_tail}: ${flight.departure_airport} → ${flight.arrival_airport}`,
                description: `${formatDate(flight.date)} - ${flight.passengers?.length || 0} passengers manifest`,
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
          </Box>
        </Stack>
      </Box>
    );
  }

  return createPortal(
    <Box className={styles.detailOverlay}>
      <Box className={styles.backdrop} onClick={onClose} />
      <Surface
        variant="glass-strong"
        className={styles.detailPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-details-title"
      >
        <Flex align="center" justify="between" className={styles.header}>
          <Stack gap={1}>
            <LqText variant="h3" weight="bold" id="flight-details-title">
              Flight Details
            </LqText>
            <LqText variant="xs" color="muted">
              {formatDate(flight.date)}
            </LqText>
          </Stack>
          <Button variant="ghost" size="sm" onClick={onClose} className={styles.closeBtn}>
            <X size={18} />
          </Button>
        </Flex>

        <Stack gap="lg" className={styles.content}>
          <Flex gap="md" className={styles.routeGrid}>
            <Surface variant="panel" className={styles.infoCard}>
              <Stack gap="xs">
                <Flex align="center" gap="xs">
                  <ArrowUpRight size={14} className={styles.iconDeparture} />
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Departure
                  </LqText>
                </Flex>
                <LqText variant="h2" weight="bold">
                  {flight.departure_airport}
                </LqText>
                <LqText variant="xs" color="muted">
                  {flight.departure_city}
                </LqText>
              </Stack>
            </Surface>

            <Surface variant="panel" className={styles.infoCard}>
              <Stack gap="xs">
                <Flex align="center" gap="xs">
                  <ArrowDownRight size={14} className={styles.iconArrival} />
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Arrival
                  </LqText>
                </Flex>
                <LqText variant="h2" weight="bold">
                  {flight.arrival_airport}
                </LqText>
                <LqText variant="xs" color="muted">
                  {flight.arrival_city}
                </LqText>
              </Stack>
            </Surface>
          </Flex>

          {(departureCoords || arrivalCoords) && (
            <Surface variant="panel" className={styles.mapSection}>
              <Flex align="center" gap="sm" className={styles.sectionHeader}>
                <Globe size={16} color="var(--accent)" />
                <LqText variant="small" weight="bold">
                  Route Visualization
                </LqText>
              </Flex>
              <Box className={styles.mapWrapper}>
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
                  <Flex
                    align="center"
                    justify="center"
                    direction="column"
                    gap="md"
                    className={styles.mapUnavailable}
                  >
                    <MapPin size={32} color="var(--text-muted)" />
                    <LqText variant="xs" color="muted" align="center">
                      Complete route coordinates unavailable for visualization
                    </LqText>
                  </Flex>
                )}
              </Box>
            </Surface>
          )}

          <Surface variant="panel" className={styles.manifestSection}>
            <Flex align="center" justify="between" className={styles.sectionHeader}>
              <Flex align="center" gap="sm">
                <Users size={16} color="var(--accent)" />
                <LqText variant="small" weight="bold">
                  Passenger Manifest
                </LqText>
              </Flex>
              <LqText variant="xs" weight="bold" color="muted">
                {flight.passengers?.length || 0} Entities
              </LqText>
            </Flex>
            <Stack gap="lg" className={styles.passengerList}>
              {Object.entries(manifestsByRole).map(([role, passengers]) => (
                <Stack key={role} gap="xs">
                  <div className={styles.roleHeader}>
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="accent"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    >
                      {role}
                    </LqText>
                  </div>
                  <Stack gap="xs">
                    {passengers.map((p, i) => (
                      <Surface key={i} variant="glass-strong" className={styles.passengerRow}>
                        <Flex align="center" justify="between">
                          <Flex align="center" gap="sm">
                            <Surface
                              variant="glass-strong"
                              className={cn(styles.roleIcon, styles[p.role.toLowerCase()])}
                            >
                              <Shield size={12} />
                            </Surface>
                            {p.entity_id ? (
                              <Link to={`/entity/${p.entity_id}`} className={styles.passengerLink}>
                                <LqText variant="xs" weight="medium">
                                  {p.passenger_name}
                                </LqText>
                              </Link>
                            ) : (
                              <LqText variant="xs">{p.passenger_name}</LqText>
                            )}
                          </Flex>
                        </Flex>
                      </Surface>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Surface>

          <Surface variant="panel" className={styles.aircraftSection}>
            <Flex align="center" gap="sm" className={styles.sectionHeader}>
              <Plane size={16} color="var(--accent)" />
              <LqText variant="small" weight="bold">
                Aircraft Intelligence
              </LqText>
            </Flex>
            <Flex justify="between" align="stretch" gap="md">
              <Stack gap="xxs" className={styles.aircraftMeta}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Tail Number
                </LqText>
                <LqText variant="small" weight="bold" color="accent">
                  {flight.aircraft_tail}
                </LqText>
              </Stack>
              <Stack gap="xxs" className={styles.aircraftMeta}>
                <LqText
                  variant="xs"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Type / Model
                </LqText>
                <LqText variant="xs" weight="medium">
                  {flight.aircraft_type || 'Unknown'}
                </LqText>
              </Stack>
            </Flex>
          </Surface>

          <Box className={styles.actions}>
            <AddToInvestigationButton
              item={{
                id: String(flight.id),
                title: `Flight ${flight.aircraft_tail}: ${flight.departure_airport} → ${flight.arrival_airport}`,
                description: `${formatDate(flight.date)} - ${flight.passengers?.length || 0} passengers manifest`,
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
          </Box>
        </Stack>
      </Surface>
    </Box>,
    document.body,
  );
};
