import type {
  FlightItemDto,
  FlightPassengerDto,
  FlightsListResponseDto,
} from '@shared/dto/flights';

interface FlightPassengerRowInput {
  id?: unknown;
  entityId?: unknown;
  entity_id?: unknown;
  passengerName?: unknown;
  passenger_name?: unknown;
  role?: unknown;
}

interface FlightItemRowInput {
  id?: unknown;
  date?: unknown;
  departureAirport?: unknown;
  departure_airport?: unknown;
  departureCity?: unknown;
  departure_city?: unknown;
  departureCountry?: unknown;
  departure_country?: unknown;
  arrivalAirport?: unknown;
  arrival_airport?: unknown;
  arrivalCity?: unknown;
  arrival_city?: unknown;
  arrivalCountry?: unknown;
  arrival_country?: unknown;
  aircraftTail?: unknown;
  aircraft_tail?: unknown;
  aircraftType?: unknown;
  aircraft_type?: unknown;
  pilot?: unknown;
  notes?: unknown;
  passengers?: FlightPassengerRowInput[];
}

interface FlightsListRowInput {
  flights?: FlightItemRowInput[];
  total?: unknown;
}

export const mapFlightPassengerDto = (row: FlightPassengerRowInput): FlightPassengerDto => ({
  id: Number(row.id || 0),
  entityId: (row.entityId ?? row.entity_id) != null ? Number(row.entityId ?? row.entity_id) : null,
  passengerName: String(row.passengerName ?? row.passenger_name ?? ''),
  role: String(row.role ?? ''),
});

export const mapFlightItemDto = (row: FlightItemRowInput): FlightItemDto => ({
  id: Number(row.id || 0),
  date: typeof row.date === 'string' ? row.date : null,
  departureAirport: String(row.departureAirport ?? row.departure_airport ?? ''),
  departureCity: String(row.departureCity ?? row.departure_city ?? ''),
  departureCountry: String(row.departureCountry ?? row.departure_country ?? ''),
  arrivalAirport: String(row.arrivalAirport ?? row.arrival_airport ?? ''),
  arrivalCity: String(row.arrivalCity ?? row.arrival_city ?? ''),
  arrivalCountry: String(row.arrivalCountry ?? row.arrival_country ?? ''),
  aircraftTail: String(row.aircraftTail ?? row.aircraft_tail ?? ''),
  aircraftType: String(row.aircraftType ?? row.aircraft_type ?? ''),
  pilot: String(row.pilot ?? ''),
  notes: String(row.notes ?? ''),
  passengers: Array.isArray(row.passengers) ? row.passengers.map(mapFlightPassengerDto) : [],
});

export const mapFlightsListResponseDto = (result: FlightsListRowInput): FlightsListResponseDto => ({
  flights: Array.isArray(result.flights) ? result.flights.map(mapFlightItemDto) : [],
  total: Number(result.total || 0),
});
