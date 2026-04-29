import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { Surface, Flex, Box, Stack, LqText, cn, Button } from '@client/design-system/lib';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { MobileStackHeader } from '@client/components/layout/MobileStackHeader';
import { useIsTouch } from '@client/hooks/useIsTouch';
const RouteMap = React.lazy(() =>
  import('@client/components/visualizations/RouteMap').then((m) => ({ default: m.RouteMap })),
);
import type { Flight, AirportCoords } from '@client/components/flights/types';
import panelStyles from '@client/components/flights/FlightDetailPanel.module.css';
import styles from './FlightDetailPage.module.css';

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const FlightDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isTouch = useIsTouch();
  const [showMap, setShowMap] = useState(false);

  const {
    data: flight,
    isLoading,
    isError,
  } = useQuery<Flight>({
    queryKey: ['flight', id],
    queryFn: async () => {
      const res = await fetch(`/api/flights/${id}`);
      if (!res.ok) throw new Error('Flight not found');
      return (await res.json()) as Flight;
    },
    enabled: !!id,
    staleTime: 60_000,
  });

  const { data: airports = {} } = useQuery<AirportCoords>({
    queryKey: ['flights-airports'],
    queryFn: async () => {
      const res = await fetch('/api/flights/airports');
      if (!res.ok) throw new Error('Failed to load airports');
      return (await res.json()) as AirportCoords;
    },
    staleTime: 5 * 60_000,
  });

  type Passenger = NonNullable<Flight['passengers']>[number];
  const passengers = flight?.passengers;

  const manifestsByRole = useMemo((): Record<string, Passenger[]> => {
    if (!passengers) return {};
    return passengers.reduce<Record<string, Passenger[]>>((acc, p) => {
      const role = p.role || 'Personnel';
      if (!acc[role]) acc[role] = [];
      acc[role].push(p);
      return acc;
    }, {});
  }, [passengers]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <MobileStackHeader title="Flight Details" onBack={() => navigate(-1)} />
        <div className={styles.stateMessage}>Loading flight data…</div>
      </div>
    );
  }

  if (isError || !flight) {
    return (
      <div className={styles.page}>
        <MobileStackHeader title="Flight Details" onBack={() => navigate(-1)} />
        <div className={styles.stateMessage}>Flight record not found.</div>
      </div>
    );
  }

  const departureCoords = airports[flight.departure_airport];
  const arrivalCoords = airports[flight.arrival_airport];

  return (
    <div className={styles.page}>
      <MobileStackHeader
        title={`Flight ${flight.aircraft_tail}`}
        subtitle={formatDate(flight.date)}
        onBack={() => navigate(-1)}
        breadcrumbItems={[
          { label: 'Flights', onClick: () => navigate('/flights') },
          { label: flight.aircraft_tail },
        ]}
      />

      <div className={styles.body}>
        <Stack gap="lg">
          <Flex gap="md" className={panelStyles.routeGrid}>
            <Surface variant="panel" className={panelStyles.infoCard}>
              <Stack gap="xs">
                <Flex align="center" gap="xs">
                  <Icon name="ArrowUpRight" size="xs" className={panelStyles.iconDeparture} />
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

            <Surface variant="panel" className={panelStyles.infoCard}>
              <Stack gap="xs">
                <Flex align="center" gap="xs">
                  <Icon name="ArrowDownRight" size="xs" className={panelStyles.iconArrival} />
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
            <Surface variant="panel" className={panelStyles.mapSection}>
              <Flex align="center" justify="between" gap="sm" className={panelStyles.sectionHeader}>
                <Flex align="center" gap="sm">
                  <Icon name="Globe" size="sm" color="accent" />
                  <LqText variant="small" weight="bold">
                    Route Visualization
                  </LqText>
                </Flex>
                {isTouch && !showMap && departureCoords && arrivalCoords && (
                  <Button variant="glass" size="sm" onClick={() => setShowMap(true)}>
                    <Icon name="MapPin" size="xs" />
                    Load Map
                  </Button>
                )}
              </Flex>
              {isTouch && !showMap ? (
                <Flex align="center" gap="md" className={panelStyles.routeTextSummary}>
                  <Stack align="center" gap="xs">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={{ textTransform: 'uppercase' }}
                    >
                      From
                    </LqText>
                    <LqText variant="small" weight="bold">
                      {flight.departure_airport}
                    </LqText>
                    <LqText variant="xs" color="muted">
                      {flight.departure_city}
                    </LqText>
                  </Stack>
                  <LqText variant="small" color="muted">
                    →
                  </LqText>
                  <Stack align="center" gap="xs">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={{ textTransform: 'uppercase' }}
                    >
                      To
                    </LqText>
                    <LqText variant="small" weight="bold">
                      {flight.arrival_airport}
                    </LqText>
                    <LqText variant="xs" color="muted">
                      {flight.arrival_city}
                    </LqText>
                  </Stack>
                </Flex>
              ) : (
                <Box className={panelStyles.mapWrapper}>
                  {departureCoords && arrivalCoords ? (
                    <React.Suspense
                      fallback={
                        <Flex
                          align="center"
                          justify="center"
                          className={panelStyles.mapUnavailable}
                        >
                          <LqText variant="xs" color="muted">
                            Loading map…
                          </LqText>
                        </Flex>
                      }
                    >
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
                    </React.Suspense>
                  ) : (
                    <Flex
                      align="center"
                      justify="center"
                      direction="column"
                      gap="md"
                      className={panelStyles.mapUnavailable}
                    >
                      <Icon name="MapPin" size="lg" color="gray" />
                      <LqText variant="xs" color="muted" align="center">
                        Complete route coordinates unavailable for visualization
                      </LqText>
                    </Flex>
                  )}
                </Box>
              )}
            </Surface>
          )}

          <Surface variant="panel" className={panelStyles.manifestSection}>
            <Flex align="center" justify="between" className={panelStyles.sectionHeader}>
              <Flex align="center" gap="sm">
                <Icon name="Users" size="sm" color="accent" />
                <LqText variant="small" weight="bold">
                  Passenger Manifest
                </LqText>
              </Flex>
              <LqText variant="xs" weight="bold" color="muted">
                {flight.passengers?.length || 0} Entities
              </LqText>
            </Flex>
            <Stack gap="lg" className={panelStyles.passengerList}>
              {Object.entries(manifestsByRole).map(([role, passengers]) => (
                <Stack key={role} gap="xs">
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="accent"
                    style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  >
                    {role}
                  </LqText>
                  <Stack gap="xs">
                    {passengers.map((p, i) => (
                      <Surface key={i} variant="glass-strong" className={panelStyles.passengerRow}>
                        <Flex align="center" gap="sm">
                          <Surface
                            variant="glass-strong"
                            className={cn(
                              panelStyles.roleIcon,
                              panelStyles[(p.role || 'personnel').toLowerCase()],
                            )}
                          >
                            <Icon name="Shield" size="xs" />
                          </Surface>
                          {p.entity_id ? (
                            <Link
                              to={`/entity/${p.entity_id}`}
                              className={panelStyles.passengerLink}
                            >
                              <LqText variant="xs" weight="medium">
                                {p.passenger_name}
                              </LqText>
                            </Link>
                          ) : (
                            <LqText variant="xs">{p.passenger_name}</LqText>
                          )}
                        </Flex>
                      </Surface>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Surface>

          <Surface variant="panel" className={panelStyles.aircraftSection}>
            <Flex align="center" gap="sm" className={panelStyles.sectionHeader}>
              <Icon name="Plane" size="sm" color="accent" />
              <LqText variant="small" weight="bold">
                Aircraft Intelligence
              </LqText>
            </Flex>
            <Flex justify="between" align="stretch" gap="md">
              <Stack gap="xxs" className={panelStyles.aircraftMeta}>
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
              <Stack gap="xxs" className={panelStyles.aircraftMeta}>
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

          <Box className={panelStyles.actions}>
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
      </div>
    </div>
  );
};
