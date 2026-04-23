import { z } from 'zod';

// Passengers have both camelCase (from JS construction) and snake_case aliases
const flightPassengerSchema = z.object({
  id: z.number(),
  flightId: z.number().optional(),
  entityId: z.number().nullable().optional(),
  passengerName: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  // snake_case aliases also present in the response
  flight_id: z.number().optional(),
  entity_id: z.number().nullable().optional(),
  passenger_name: z.string().nullable().optional(),
});

// Flight objects have camelCase from pgtyped plus manually added snake_case aliases
export const flightItemSchema = z.object({
  id: z.number(),
  date: z.string().nullable(),
  // camelCase fields from pgtyped
  departureAirport: z.string().nullable().optional(),
  departureCity: z.string().nullable().optional(),
  departureCountry: z.string().nullable().optional(),
  arrivalAirport: z.string().nullable().optional(),
  arrivalCity: z.string().nullable().optional(),
  arrivalCountry: z.string().nullable().optional(),
  aircraftTail: z.string().nullable().optional(),
  aircraftType: z.string().nullable().optional(),
  pilot: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // snake_case aliases manually added in repository
  departure_airport: z.string().optional(),
  departure_city: z.string().optional(),
  departure_country: z.string().optional(),
  arrival_airport: z.string().optional(),
  arrival_city: z.string().optional(),
  arrival_country: z.string().optional(),
  aircraft_tail: z.string().optional(),
  aircraft_type: z.string().optional(),
  passengers: z.array(flightPassengerSchema).optional(),
});

// Schema for GET /api/flights
export const flightsListResponseSchema = z.object({
  flights: z.array(flightItemSchema),
  total: z.number(),
});

// Schema for GET /api/flights/stats
export const flightStatsResponseSchema = z.object({
  totalFlights: z.number().optional(),
  totalPassengers: z.number().optional(),
  uniquePassengers: z.number().optional(),
  dateRange: z
    .object({
      earliest: z.string().nullable().optional(),
      latest: z.string().nullable().optional(),
    })
    .optional(),
});

// Schema for GET /api/flights/co-occurrences
export const flightCoOccurrenceSchema = z.object({
  passenger1: z.string(),
  passenger2: z.string(),
  flights_together: z.number().optional(),
  first_flight: z.string().nullable().optional(),
  last_flight: z.string().nullable().optional(),
});

export const flightCoOccurrencesResponseSchema = z.array(flightCoOccurrenceSchema);
