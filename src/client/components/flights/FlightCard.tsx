import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { Surface, Flex, Box, LqText, cn } from '@client/design-system/lib';
import { CardActionSheet } from '../common/CardActionSheet';
import { useLongPress } from '@client/hooks/useLongPress';
import { useInvestigations } from '@client/contexts/InvestigationsContext';
import type { Flight } from './types';
import styles from './FlightCard.module.css';

interface FlightCardProps {
  flight: Flight;
  formatDate: (dateStr: string) => string;
}

export const FlightCard: React.FC<FlightCardProps> = ({ flight, formatDate }) => {
  const navigate = useNavigate();
  const { addToInvestigation, selectedInvestigation, investigations } = useInvestigations();
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    consumeClick,
    onContextMenu: lpContextMenu,
    ...longPressHandlers
  } = useLongPress(() => setMenuOpen(true));

  const handleClick = () => {
    if (consumeClick()) return;
    navigate(`/flights/${flight.id}`);
  };

  const handleQuickAdd = async () => {
    const targetId = selectedInvestigation?.id ?? investigations[0]?.id;
    if (!targetId) return;
    await addToInvestigation(
      targetId,
      {
        id: String(flight.id),
        title: `${flight.departure_airport} → ${flight.arrival_airport}`,
        description: `${formatDate(flight.date)} · ${flight.aircraft_tail}`,
        type: 'flight',
        sourceId: String(flight.id),
      },
      'medium',
    );
  };

  return (
    <>
      <Surface
        variant="panel"
        className={styles.cardRoot}
        onClick={handleClick}
        onContextMenu={lpContextMenu}
        aria-label={`Open flight details for ${flight.departure_airport} to ${flight.arrival_airport} on ${formatDate(flight.date)}`}
        {...longPressHandlers}
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
            <Icon name="Users" size="xs" className={styles.mutedIcon} />
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
            <Icon name="Plane" className={styles.planeIcon} />
            <Box className={styles.dashedLine} />
          </Flex>

          <Box className={cn(styles.airport, styles.airportRight)}>
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
              className={cn(styles.passengerTag, styles[(p.role || 'personnel').toLowerCase()])}
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
      <CardActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={`${flight.departure_airport} → ${flight.arrival_airport}`}
        actions={[
          {
            label: 'View Details',
            icon: 'Navigation',
            onClick: () => navigate(`/flights/${flight.id}`),
          },
          {
            label: 'Add to Investigation',
            icon: 'Plus',
            onClick: () => {
              void handleQuickAdd();
            },
          },
        ]}
      />
    </>
  );
};
