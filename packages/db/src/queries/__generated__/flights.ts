/** Types generated for queries found in "src/queries/flights.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

/** 'GetFlights' parameters type */
export interface IGetFlightsParams {
  airport?: string | null | void;
  endDate?: string | null | void;
  limit: NumberOrString;
  offset: NumberOrString;
  startDate?: string | null | void;
}

/** 'GetFlights' return type */
export interface IGetFlightsResult {
  aircraftTail: string | null;
  aircraftType: string | null;
  arrivalAirport: string | null;
  arrivalCity: string | null;
  arrivalCountry: string | null;
  date: string | null;
  departureAirport: string | null;
  departureCity: string | null;
  departureCountry: string | null;
  id: string;
  notes: string | null;
  pilot: string | null;
}

/** 'GetFlights' query type */
export interface IGetFlightsQuery {
  params: IGetFlightsParams;
  result: IGetFlightsResult;
}

const getFlightsIR: any = {
  usedParamSet: { startDate: true, endDate: true, airport: true, limit: true, offset: true },
  params: [
    {
      name: 'startDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 388, b: 397 },
        { a: 426, b: 435 },
      ],
    },
    {
      name: 'endDate',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 445, b: 452 },
        { a: 481, b: 488 },
      ],
    },
    {
      name: 'airport',
      required: false,
      transform: { type: 'scalar' },
      locs: [
        { a: 498, b: 505 },
        { a: 546, b: 553 },
        { a: 578, b: 585 },
      ],
    },
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 615, b: 621 }] },
    { name: 'offset', required: true, transform: { type: 'scalar' }, locs: [{ a: 630, b: 637 }] },
  ],
  statement:
    'SELECT\n  f.id,\n  f.date,\n  f.departure_airport as "departureAirport",\n  f.departure_city as "departureCity",\n  f.departure_country as "departureCountry",\n  f.arrival_airport as "arrivalAirport",\n  f.arrival_city as "arrivalCity",\n  f.arrival_country as "arrivalCountry",\n  f.aircraft_tail as "aircraftTail",\n  f.aircraft_type as "aircraftType",\n  f.pilot,\n  f.notes\nFROM flights f\nWHERE (:startDate::text IS NULL OR f.date >= :startDate)\n  AND (:endDate::text IS NULL OR f.date <= :endDate)\n  AND (:airport::text IS NULL OR f.departure_airport = :airport OR f.arrival_airport = :airport)\nORDER BY f.date DESC\nLIMIT :limit! OFFSET :offset!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   f.id,
 *   f.date,
 *   f.departure_airport as "departureAirport",
 *   f.departure_city as "departureCity",
 *   f.departure_country as "departureCountry",
 *   f.arrival_airport as "arrivalAirport",
 *   f.arrival_city as "arrivalCity",
 *   f.arrival_country as "arrivalCountry",
 *   f.aircraft_tail as "aircraftTail",
 *   f.aircraft_type as "aircraftType",
 *   f.pilot,
 *   f.notes
 * FROM flights f
 * WHERE (:startDate::text IS NULL OR f.date >= :startDate)
 *   AND (:endDate::text IS NULL OR f.date <= :endDate)
 *   AND (:airport::text IS NULL OR f.departure_airport = :airport OR f.arrival_airport = :airport)
 * ORDER BY f.date DESC
 * LIMIT :limit! OFFSET :offset!
 * ```
 */
export const getFlights = new PreparedQuery<IGetFlightsParams, IGetFlightsResult>(getFlightsIR);

/** 'GetFlightPassengers' parameters type */
export interface IGetFlightPassengersParams {
  flightIds: NumberOrString;
}

/** 'GetFlightPassengers' return type */
export interface IGetFlightPassengersResult {
  entityId: string | null;
  flightId: string | null;
  id: string;
  passengerName: string;
  role: string | null;
}

/** 'GetFlightPassengers' query type */
export interface IGetFlightPassengersQuery {
  params: IGetFlightPassengersParams;
  result: IGetFlightPassengersResult;
}

const getFlightPassengersIR: any = {
  usedParamSet: { flightIds: true },
  params: [
    {
      name: 'flightIds',
      required: true,
      transform: { type: 'scalar' },
      locs: [{ a: 175, b: 185 }],
    },
  ],
  statement:
    'SELECT\n  fp.id,\n  fp.flight_id as "flightId",\n  fp.entity_id as "entityId",\n  fp.passenger_name as "passengerName",\n  fp.role\nFROM flight_passengers fp\nWHERE fp.flight_id IN (:flightIds!)',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   fp.id,
 *   fp.flight_id as "flightId",
 *   fp.entity_id as "entityId",
 *   fp.passenger_name as "passengerName",
 *   fp.role
 * FROM flight_passengers fp
 * WHERE fp.flight_id IN (:flightIds!)
 * ```
 */
export const getFlightPassengers = new PreparedQuery<
  IGetFlightPassengersParams,
  IGetFlightPassengersResult
>(getFlightPassengersIR);

/** 'GetFlightById' parameters type */
export interface IGetFlightByIdParams {
  id: NumberOrString;
}

/** 'GetFlightById' return type */
export interface IGetFlightByIdResult {
  aircraft_tail: string | null;
  aircraft_type: string | null;
  arrival_airport: string | null;
  arrival_city: string | null;
  arrival_country: string | null;
  created_at: Date | null;
  date: string | null;
  departure_airport: string | null;
  departure_city: string | null;
  departure_country: string | null;
  id: string;
  notes: string | null;
  pilot: string | null;
}

/** 'GetFlightById' query type */
export interface IGetFlightByIdQuery {
  params: IGetFlightByIdParams;
  result: IGetFlightByIdResult;
}

const getFlightByIdIR: any = {
  usedParamSet: { id: true },
  params: [{ name: 'id', required: true, transform: { type: 'scalar' }, locs: [{ a: 33, b: 36 }] }],
  statement: 'SELECT * FROM flights WHERE id = :id!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT * FROM flights WHERE id = :id!
 * ```
 */
export const getFlightById = new PreparedQuery<IGetFlightByIdParams, IGetFlightByIdResult>(
  getFlightByIdIR,
);

/** 'GetFlightStats' parameters type */
export type IGetFlightStatsParams = void;

/** 'GetFlightStats' return type */
export interface IGetFlightStatsResult {
  totalFlights: number | null;
  uniquePassengers: string | null;
}

/** 'GetFlightStats' query type */
export interface IGetFlightStatsQuery {
  params: IGetFlightStatsParams;
  result: IGetFlightStatsResult;
}

const getFlightStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT\n  (SELECT COUNT(*)::integer FROM flights) as "totalFlights",\n  (SELECT COUNT(DISTINCT passenger_name) FROM flight_passengers) as "uniquePassengers"',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   (SELECT COUNT(*)::integer FROM flights) as "totalFlights",
 *   (SELECT COUNT(DISTINCT passenger_name) FROM flight_passengers) as "uniquePassengers"
 * ```
 */
export const getFlightStats = new PreparedQuery<IGetFlightStatsParams, IGetFlightStatsResult>(
  getFlightStatsIR,
);

/** 'GetTopPassengers' parameters type */
export interface IGetTopPassengersParams {
  limit: NumberOrString;
}

/** 'GetTopPassengers' return type */
export interface IGetTopPassengersResult {
  count: number | null;
  name: string;
}

/** 'GetTopPassengers' query type */
export interface IGetTopPassengersQuery {
  params: IGetTopPassengersParams;
  result: IGetTopPassengersResult;
}

const getTopPassengersIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 131, b: 137 }] },
  ],
  statement:
    'SELECT passenger_name as name, COUNT(*)::integer as count\nFROM flight_passengers\nGROUP BY passenger_name\nORDER BY count DESC\nLIMIT :limit!',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT passenger_name as name, COUNT(*)::integer as count
 * FROM flight_passengers
 * GROUP BY passenger_name
 * ORDER BY count DESC
 * LIMIT :limit!
 * ```
 */
export const getTopPassengers = new PreparedQuery<IGetTopPassengersParams, IGetTopPassengersResult>(
  getTopPassengersIR,
);

/** 'GetTopRoutes' parameters type */
export interface IGetTopRoutesParams {
  limit: NumberOrString;
}

/** 'GetTopRoutes' return type */
export interface IGetTopRoutesResult {
  count: number | null;
  route: string | null;
}

/** 'GetTopRoutes' query type */
export interface IGetTopRoutesQuery {
  params: IGetTopRoutesParams;
  result: IGetTopRoutesResult;
}

const getTopRoutesIR: any = {
  usedParamSet: { limit: true },
  params: [
    { name: 'limit', required: true, transform: { type: 'scalar' }, locs: [{ a: 150, b: 156 }] },
  ],
  statement:
    "SELECT \n  departure_airport || ' -> ' || arrival_airport as route,\n  COUNT(*)::integer as count\nFROM flights\nGROUP BY route\nORDER BY count DESC\nLIMIT :limit!",
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   departure_airport || ' -> ' || arrival_airport as route,
 *   COUNT(*)::integer as count
 * FROM flights
 * GROUP BY route
 * ORDER BY count DESC
 * LIMIT :limit!
 * ```
 */
export const getTopRoutes = new PreparedQuery<IGetTopRoutesParams, IGetTopRoutesResult>(
  getTopRoutesIR,
);

/** 'GetFlightsByYear' parameters type */
export type IGetFlightsByYearParams = void;

/** 'GetFlightsByYear' return type */
export interface IGetFlightsByYearResult {
  count: number | null;
  year: string | null;
}

/** 'GetFlightsByYear' query type */
export interface IGetFlightsByYearQuery {
  params: IGetFlightsByYearParams;
  result: IGetFlightsByYearResult;
}

const getFlightsByYearIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  EXTRACT(YEAR FROM date::timestamp)::text as year,\n  COUNT(*)::integer as count\nFROM flights\nGROUP BY year\nORDER BY year DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   EXTRACT(YEAR FROM date::timestamp)::text as year,
 *   COUNT(*)::integer as count
 * FROM flights
 * GROUP BY year
 * ORDER BY year DESC
 * ```
 */
export const getFlightsByYear = new PreparedQuery<IGetFlightsByYearParams, IGetFlightsByYearResult>(
  getFlightsByYearIR,
);

/** 'GetAirportStats' parameters type */
export type IGetAirportStatsParams = void;

/** 'GetAirportStats' return type */
export interface IGetAirportStatsResult {
  airport: string | null;
  city: string | null;
  count: string | null;
}

/** 'GetAirportStats' query type */
export interface IGetAirportStatsQuery {
  params: IGetAirportStatsParams;
  result: IGetAirportStatsResult;
}

const getAirportStatsIR: any = {
  usedParamSet: {},
  params: [],
  statement:
    'SELECT \n  airport,\n  city,\n  SUM(count) as count\nFROM (\n  SELECT departure_airport as airport, departure_city as city, COUNT(*)::integer as count FROM flights GROUP BY airport, city\n  UNION ALL\n  SELECT arrival_airport as airport, arrival_city as city, COUNT(*)::integer as count FROM flights GROUP BY airport, city\n) t\nGROUP BY airport, city\nORDER BY count DESC',
};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   airport,
 *   city,
 *   SUM(count) as count
 * FROM (
 *   SELECT departure_airport as airport, departure_city as city, COUNT(*)::integer as count FROM flights GROUP BY airport, city
 *   UNION ALL
 *   SELECT arrival_airport as airport, arrival_city as city, COUNT(*)::integer as count FROM flights GROUP BY airport, city
 * ) t
 * GROUP BY airport, city
 * ORDER BY count DESC
 * ```
 */
export const getAirportStats = new PreparedQuery<IGetAirportStatsParams, IGetAirportStatsResult>(
  getAirportStatsIR,
);
