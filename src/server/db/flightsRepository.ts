import { flightsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';

interface FlightRow {
  id: string | number;
  date: string;
  departureAirport?: string | null;
  departureCity?: string | null;
  departureCountry?: string | null;
  arrivalAirport?: string | null;
  arrivalCity?: string | null;
  arrivalCountry?: string | null;
  aircraftTail?: string | null;
  aircraftType?: string | null;
  pilot?: string | null;
  notes?: string | null;
}

interface PassengerRow {
  id: string | number;
  flightId: string | number;
  entityId?: string | number | null;
  passengerName: string;
  role: string;
}

export interface Flight {
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
  pilot?: string;
  notes?: string;
  passengers?: FlightPassenger[];
}

export interface FlightPassenger {
  id: number;
  flight_id: number;
  entity_id?: number;
  passenger_name: string;
  role: string;
}

export interface FlightStats {
  totalFlights: number;
  uniquePassengers: number;
  topPassengers: { name: string; count: number }[];
  topRoutes: { route: string; count: number }[];
  flightsByYear: { year: string; count: number }[];
  airports: { code: string; city: string; count: number }[];
}

// Airport coordinates for map
export const AIRPORT_COORDS: Record<string, { lat: number; lng: number; city: string }> = {
  TIST: { lat: 18.3376, lng: -64.9734, city: 'St. Thomas, USVI' },
  TJSJ: { lat: 18.4394, lng: -66.0018, city: 'San Juan, PR' },
  TNCM: { lat: 18.041, lng: -63.1089, city: 'St. Maarten' },
  KTEB: { lat: 40.8501, lng: -74.0608, city: 'Teterboro, NJ' },
  KPBI: { lat: 26.6832, lng: -80.0956, city: 'Palm Beach, FL' },
  KMIA: { lat: 25.7959, lng: -80.287, city: 'Miami, FL' },
  KJFK: { lat: 40.6413, lng: -73.7781, city: 'New York JFK' },
  KLAX: { lat: 33.9416, lng: -118.4085, city: 'Los Angeles, CA' },
  KSFO: { lat: 37.6213, lng: -122.379, city: 'San Francisco, CA' },
  EGLL: { lat: 51.47, lng: -0.4543, city: 'London Heathrow' },
  LFPG: { lat: 49.0097, lng: 2.5479, city: 'Paris CDG' },
  KBED: { lat: 42.47, lng: -71.289, city: 'Bedford, MA' },
  KASE: { lat: 39.2232, lng: -106.8688, city: 'Aspen, CO' },
  KSNA: { lat: 33.6757, lng: -117.8682, city: 'Santa Ana, CA' },
  MMUN: { lat: 21.0365, lng: -86.8771, city: 'Cancun, MX' },
  KLAS: { lat: 36.084, lng: -115.1537, city: 'Las Vegas, NV' },
  KDCA: { lat: 38.8512, lng: -77.0402, city: 'Washington DC' },
  KBOS: { lat: 42.3656, lng: -71.0096, city: 'Boston, MA' },
};

export const flightsRepository = {
  getFlights: async (
    filters: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      passenger?: string;
      airport?: string;
    } = {},
  ) => {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const pool = getApiPool();
    const flights =
      filters.passenger && filters.passenger.trim()
        ? (
            await pool.query(
              `
              SELECT
                f.id,
                f.date,
                f.departure_airport as "departureAirport",
                f.departure_city as "departureCity",
                f.departure_country as "departureCountry",
                f.arrival_airport as "arrivalAirport",
                f.arrival_city as "arrivalCity",
                f.arrival_country as "arrivalCountry",
                f.aircraft_tail as "aircraftTail",
                f.aircraft_type as "aircraftType",
                f.pilot,
                f.notes
              FROM flights f
              WHERE ($1::text IS NULL OR f.date >= $1)
                AND ($2::text IS NULL OR f.date <= $2)
                AND ($3::text IS NULL OR f.departure_airport = $3 OR f.arrival_airport = $3)
                AND EXISTS (
                  SELECT 1
                  FROM flight_passengers fp
                  WHERE fp.flight_id = f.id
                    AND fp.passenger_name ILIKE $4
                )
              ORDER BY f.date DESC
              LIMIT $5 OFFSET $6
              `,
              [
                filters.startDate || null,
                filters.endDate || null,
                filters.airport || null,
                `%${filters.passenger.trim()}%`,
                limit,
                offset,
              ],
            )
          ).rows
        : await flightsQueries.getFlights.run(
            {
              startDate: filters.startDate || null,
              endDate: filters.endDate || null,
              airport: filters.airport || null,
              limit: limit,
              offset: offset,
            },
            pool,
          );

    if (flights.length === 0) return { flights: [], total: 0 };

    const flightIds = (flights as FlightRow[]).map((f) => Number(f.id));
    const passengersResult = await pool.query(
      `
      SELECT
        fp.id,
        fp.flight_id as "flightId",
        fp.entity_id as "entityId",
        fp.passenger_name as "passengerName",
        fp.role
      FROM flight_passengers fp
      WHERE fp.flight_id = ANY($1::bigint[])
      `,
      [flightIds],
    );
    const passengers = passengersResult.rows;

    const typedPassengers = passengers as PassengerRow[];
    const flightsWithPassengers = (flights as FlightRow[]).map((f) => ({
      ...f,
      id: Number(f.id),
      departure_airport: f.departureAirport || '',
      departure_city: f.departureCity || '',
      departure_country: f.departureCountry || '',
      arrival_airport: f.arrivalAirport || '',
      arrival_city: f.arrivalCity || '',
      arrival_country: f.arrivalCountry || '',
      aircraft_tail: f.aircraftTail || '',
      aircraft_type: f.aircraftType || '',
      passengers: typedPassengers
        .filter((p) => Number(p.flightId) === Number(f.id))
        .map((p) => ({
          ...p,
          id: Number(p.id),
          flight_id: Number(p.flightId),
          entity_id: p.entityId ? Number(p.entityId) : undefined,
          passenger_name: p.passengerName,
        })),
    }));

    return {
      flights: flightsWithPassengers,
      total: 0,
    };
  },

  getFlightById: async (id: number): Promise<Flight | null> => {
    const flightRows = await flightsQueries.getFlightById.run({ id }, getApiPool());
    const f = flightRows[0];
    if (!f) return null;

    const passengersResult = await getApiPool().query(
      `
      SELECT
        fp.id,
        fp.flight_id as "flightId",
        fp.entity_id as "entityId",
        fp.passenger_name as "passengerName",
        fp.role
      FROM flight_passengers fp
      WHERE fp.flight_id = $1
      `,
      [Number(f.id)],
    );
    const passengers = passengersResult.rows;

    return {
      ...f,
      date: f.date || '',
      id: Number(f.id),
      departure_airport: f.departure_airport || '',
      departure_city: f.departure_city || '',
      departure_country: f.departure_country || '',
      arrival_airport: f.arrival_airport || '',
      arrival_city: f.arrival_city || '',
      arrival_country: f.arrival_country || '',
      aircraft_tail: f.aircraft_tail || '',
      aircraft_type: f.aircraft_type || '',
      pilot: f.pilot || undefined,
      notes: f.notes || undefined,
      passengers: passengers.map((p) => ({
        ...p,
        id: Number(p.id),
        flight_id: Number(p.flightId),
        entity_id: p.entityId ? Number(p.entityId) : undefined,
        passenger_name: p.passengerName,
      })),
    };
  },

  getFlightStats: async (): Promise<FlightStats> => {
    const [basicStats] = await flightsQueries.getFlightStats.run(undefined, getApiPool());
    const topPassengers = await flightsQueries.getTopPassengers.run({ limit: 10 }, getApiPool());
    const topRoutes = await flightsQueries.getTopRoutes.run({ limit: 10 }, getApiPool());
    const flightsByYear = await flightsQueries.getFlightsByYear.run(undefined, getApiPool());
    const airportStats = await flightsQueries.getAirportStats.run(undefined, getApiPool());

    return {
      totalFlights: Number(basicStats?.totalFlights || 0),
      uniquePassengers: Number(basicStats?.uniquePassengers || 0),
      topPassengers: (topPassengers as Array<{ name?: unknown; count?: unknown }>).map((p) => ({
        name: String(p.name || ''),
        count: Number(p.count || 0),
      })),
      topRoutes: (topRoutes as Array<{ route?: unknown; count?: unknown }>).map((r) => ({
        route: String(r.route || 'Unknown'),
        count: Number(r.count || 0),
      })),
      flightsByYear: (flightsByYear as Array<{ year?: unknown; count?: unknown }>).map((y) => ({
        year: String(y.year || 'Unknown'),
        count: Number(y.count || 0),
      })),
      airports: (airportStats as Array<{ airport?: unknown; city?: unknown; count?: unknown }>).map(
        (a) => ({
          code: String(a.airport || 'Unknown'),
          city: String(a.city || 'Unknown'),
          count: Number(a.count || 0),
        }),
      ),
    };
  },

  getPassengerFlights: async (passengerName: string) => {
    const rows = await getApiPool().query(
      `
      SELECT f.*
      FROM flights f
      INNER JOIN flight_passengers fp ON f.id = fp.flight_id
      WHERE fp.passenger_name ILIKE $1
      ORDER BY f.date DESC
    `,
      [`%${passengerName}%`],
    );

    return rows.rows.map((f) => ({
      ...f,
      id: Number(f.id),
    }));
  },

  getUniquePassengers: async () => {
    const rows = await getApiPool().query(
      `
      SELECT
        passenger_name AS name,
        COUNT(*)::int AS flight_count,
        MAX(entity_id) AS entity_id
      FROM flight_passengers
      GROUP BY passenger_name
      ORDER BY passenger_name ASC
      `,
    );
    return rows.rows.map((r) => ({
      name: String(r.name || ''),
      flight_count: Number(r.flight_count || 0),
      entity_id: r.entity_id ? Number(r.entity_id) : null,
    }));
  },

  getAirportCoords: async () => {
    return AIRPORT_COORDS;
  },

  getPassengerCoOccurrences: async (minFlights = 2) => {
    const rows = await getApiPool().query(
      `
      SELECT
        p1.passenger_name as passenger1,
        p2.passenger_name as passenger2,
        MAX(p1.entity_id) as entity_id_1,
        MAX(p2.entity_id) as entity_id_2,
        COUNT(*) as "flightsTogether",
        MIN(f.date) as "firstFlight",
        MAX(f.date) as "lastFlight"
      FROM flight_passengers p1
      JOIN flight_passengers p2 ON p1.flight_id = p2.flight_id AND p1.passenger_name < p2.passenger_name
      JOIN flights f ON p1.flight_id = f.id
      GROUP BY p1.passenger_name, p2.passenger_name
      HAVING COUNT(*) >= $1
      ORDER BY "flightsTogether" DESC
    `,
      [minFlights],
    );
    return rows.rows.map((r: Record<string, unknown>) => ({
      ...r,
      entity_id_1: r.entity_id_1 ? Number(r.entity_id_1) : null,
      entity_id_2: r.entity_id_2 ? Number(r.entity_id_2) : null,
    }));
  },

  getCoPassengers: async (passengerName: string) => {
    const rows = await getApiPool().query(
      `
      SELECT 
        p2.passenger_name as name,
        COUNT(*) as "flightsTogether",
        array_agg(f.date ORDER BY f.date DESC) as flights
      FROM flight_passengers p1
      JOIN flight_passengers p2 ON p1.flight_id = p2.flight_id AND p1.passenger_name != p2.passenger_name
      JOIN flights f ON p1.flight_id = f.id
      WHERE p1.passenger_name ILIKE $1
      GROUP BY p2.passenger_name
      ORDER BY "flightsTogether" DESC
    `,
      [`%${passengerName}%`],
    );
    return rows.rows;
  },

  getFrequentRoutes: async (limit = 20) => {
    const rows = await getApiPool().query(
      `
      SELECT 
        departure_airport as departure,
        arrival_airport as arrival,
        departure_city as "departureCity",
        arrival_city as "arrivalCity",
        COUNT(*) as count,
        array_agg(DISTINCT date) as dates
      FROM flights
      GROUP BY departure, arrival, "departureCity", "arrivalCity"
      ORDER BY count DESC
      LIMIT $1
    `,
      [limit],
    );
    return rows.rows;
  },

  getPassengerDateRanges: async () => {
    const rows = await getApiPool().query(
      `
      SELECT 
        passenger_name as name,
        MIN(f.date) as "firstFlight",
        MAX(f.date) as "lastFlight",
        COUNT(*) as "totalFlights"
      FROM flight_passengers fp
      JOIN flights f ON fp.flight_id = f.id
      GROUP BY passenger_name
      ORDER BY "totalFlights" DESC
    `,
    );
    return rows.rows;
  },

  getFlightsByAircraft: async () => {
    const rows = await getApiPool().query(
      `
      SELECT 
        aircraft_tail as aircraft,
        aircraft_type as "aircraftType",
        COUNT(*) as "flightCount",
        (SELECT COUNT(DISTINCT passenger_name) FROM flight_passengers fp WHERE fp.flight_id IN (SELECT id FROM flights f2 WHERE f2.aircraft_tail = f.aircraft_tail)) as "passengerCount"
      FROM flights f
      WHERE aircraft_tail IS NOT NULL AND aircraft_tail != ''
      GROUP BY aircraft, "aircraftType"
      ORDER BY "flightCount" DESC
    `,
    );
    return rows.rows;
  },

  getPassengerDestinations: async (passengerName: string) => {
    const rows = await getApiPool().query(
      `
      SELECT 
        airport,
        city,
        COUNT(*) as "visitCount"
      FROM (
        SELECT f.departure_airport as airport, f.departure_city as city
        FROM flights f
        JOIN flight_passengers fp ON f.id = fp.flight_id
        WHERE fp.passenger_name ILIKE $1
        UNION ALL
        SELECT f.arrival_airport as airport, f.arrival_city as city
        FROM flights f
        JOIN flight_passengers fp ON f.id = fp.flight_id
        WHERE fp.passenger_name ILIKE $1
      ) t
      GROUP BY airport, city
      ORDER BY "visitCount" DESC
    `,
      [`%${passengerName}%`],
    );
    return rows.rows;
  },
};
