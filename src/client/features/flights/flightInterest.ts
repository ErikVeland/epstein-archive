import type { Flight } from './types';

export type FlightInterestLevel = 'high' | 'notable' | 'context';

export interface FlightInterest {
  score: number;
  level: FlightInterestLevel;
  label: string;
  reasons: string[];
}

const KEY_ARCHIVE_NAMES = new Set([
  'Alan Dershowitz',
  'Bill Clinton',
  'Donald Trump',
  'Jean-Luc Brunel',
  'Les Wexner',
  'Prince Andrew',
  'Virginia Roberts',
]);

const ROUTE_CONTEXT: Record<string, string> = {
  TIST: 'USVI route',
  TJSJ: 'Puerto Rico route',
  TNCM: 'Caribbean route',
};

export function assessFlightInterest(flight: Flight): FlightInterest {
  let score = 0;
  const reasons: string[] = [];
  const passengers = flight.passengers || [];
  const namedProfiles = passengers
    .map((passenger) => passenger.passenger_name)
    .filter((name) => KEY_ARCHIVE_NAMES.has(name));

  if (flight.notes?.trim()) {
    score += 22;
    reasons.push('Source note flags this record');
  }

  if (namedProfiles.length > 0) {
    score += 12 + Math.min(namedProfiles.length - 1, 2) * 6;
    reasons.push(
      `${namedProfiles.length} key archive ${namedProfiles.length === 1 ? 'person' : 'people'}`,
    );
  }

  const routeContext =
    ROUTE_CONTEXT[flight.departure_airport] || ROUTE_CONTEXT[flight.arrival_airport];
  if (routeContext) {
    score += 12;
    reasons.push(routeContext);
  }

  if (
    flight.departure_country &&
    flight.arrival_country &&
    flight.departure_country !== flight.arrival_country
  ) {
    score += 8;
    reasons.push('International leg');
  }

  if (passengers.length >= 4) {
    score += 8;
    reasons.push(`${passengers.length}-person manifest`);
  }

  if (flight.aircraft_tail && flight.aircraft_tail !== 'N908JE') {
    score += 4;
    reasons.push(`Alternate aircraft ${flight.aircraft_tail}`);
  }

  if (score >= 34) {
    return { score, level: 'high', label: 'High interest', reasons: reasons.slice(0, 3) };
  }
  if (score >= 18) {
    return { score, level: 'notable', label: 'Notable', reasons: reasons.slice(0, 3) };
  }
  return {
    score,
    level: 'context',
    label: 'Route context',
    reasons: reasons.length > 0 ? reasons.slice(0, 3) : ['Baseline manifest record'],
  };
}
