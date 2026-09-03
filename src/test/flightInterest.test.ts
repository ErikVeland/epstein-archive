import { describe, expect, it } from 'vitest';
import { assessFlightInterest } from '../client/features/flights/flightInterest';
import type { Flight } from '../client/features/flights/types';

function flight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 1,
    date: '2000-01-01',
    departure_airport: 'KPBI',
    departure_city: 'Palm Beach',
    departure_country: 'US',
    arrival_airport: 'KTEB',
    arrival_city: 'Teterboro',
    arrival_country: 'US',
    aircraft_tail: 'N908JE',
    aircraft_type: 'Boeing 727',
    passengers: [],
    ...overrides,
  };
}

describe('flight evidence-interest assessment', () => {
  it('promotes source-annotated flights with key archive people', () => {
    const result = assessFlightInterest(
      flight({
        notes: 'Source record identifies this as an important trip.',
        passengers: [
          { passenger_name: 'Jeffrey Epstein', role: 'Passenger' },
          { passenger_name: 'Prince Andrew', role: 'Passenger' },
        ],
      }),
    );

    expect(result.level).toBe('high');
    expect(result.score).toBe(34);
    expect(result.reasons).toContain('Source note flags this record');
    expect(result.reasons).toContain('1 key archive person');
  });

  it('adds review context for USVI and international routes', () => {
    const result = assessFlightInterest(
      flight({
        arrival_airport: 'TIST',
        arrival_city: 'St. Thomas',
        arrival_country: 'VI',
      }),
    );

    expect(result.level).toBe('notable');
    expect(result.score).toBe(20);
    expect(result.reasons).toEqual(['USVI route', 'International leg']);
  });

  it('keeps an ordinary manifest record as route context', () => {
    expect(assessFlightInterest(flight())).toEqual({
      score: 0,
      level: 'context',
      label: 'Route context',
      reasons: ['Baseline manifest record'],
    });
  });
});
