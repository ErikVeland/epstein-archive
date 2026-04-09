import React from 'react';
import { Users } from 'lucide-react';
import { Surface, Flex, Box, LqText, cn } from '../../design-system/lib';
import type { Flight } from './types';
import styles from './FlightCard.module.css';

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  formatDate: (dateStr: string) => string;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, onSelect, formatDate }) => (
  <Surface
    variant="panel"
    className={styles.cardRoot}
    onClick={() => onSelect(flight)}
    aria-label={`Open flight details for ${flight.departure_airport} to ${flight.arrival_airport} on ${formatDate(flight.date)}`}
  >
    <Flex align="center" justify="between" className={styles.topRow}>
      <Flex align="center" gap="sm">
        <LqText variant="xs" weight="medium" color="muted" className={styles.dateLabel}>
          {formatDate(flight.date)}
        </LqText>
        <LqText variant="xs" color="muted" className={styles.tailNumber}>
          {flight.aircraft_tail}
        </LqText>
      </Flex>
      <Flex align="center" gap="xs" className={styles.passengerCount}>
        <Users size={12} className={styles.mutedIcon} />
        <LqText variant="xs" weight="bold" color="muted">
          {flight.passengers?.length || 0}
        </LqText>
      </Flex>
    </Flex>

    <Flex align="center" justify="between" className={styles.routeContainer}>
      <Box className={styles.airport}>
        <LqText variant="h4" weight="bold" className={styles.airportCode}>
          {flight.departure_airport}
        </LqText>
        <LqText variant="xs" color="muted" className={styles.airportCity}>
          {flight.departure_city}
        </LqText>
      </Box>

      <Flex align="center" className={styles.flightLineWrap}>
        <Box className={styles.dashedLine} />
        <LqText className={styles.planeIcon}>✈</LqText>
        <Box className={styles.dashedLine} />
      </Flex>

      <Box className={styles.airport} style={{ textAlign: 'right' }}>
        <LqText variant="h4" weight="bold" className={styles.airportCode}>
          {flight.arrival_airport}
        </LqText>
        <LqText variant="xs" color="muted" className={styles.airportCity}>
          {flight.arrival_city}
        </LqText>
      </Box>
    </Flex>

    <Flex wrap="wrap" gap="xs" className={styles.passengers}>
      {flight.passengers?.slice(0, 4).map((p, i) => (
        <Surface
          key={i}
          variant="panel"
          className={cn(styles.passengerTag, styles[p.role.toLowerCase()])}
        >
          <LqText variant="xs" weight="bold">
            {p.passenger_name}
          </LqText>
        </Surface>
      ))}
      {(flight.passengers?.length || 0) > 4 && (
        <LqText variant="xs" color="muted" weight="medium">
          +{(flight.passengers?.length || 0) - 4} more
        </LqText>
      )}
    </Flex>
  </Surface>
);
