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
  passengers?: { passenger_name: string; role: string; entity_id?: number }[];
}

export type FlightSortMode = 'interest' | 'latest' | 'earliest' | 'manifest';

export interface FlightStats {
  totalFlights: number;
  uniquePassengers: number;
  topPassengers: { name: string; count: number }[];
  topRoutes: { route: string; count: number }[];
  flightsByYear: { year: string; count: number }[];
  airports: { code: string; city: string; count: number }[];
}

export interface AirportCoords {
  [code: string]: { lat: number; lng: number; city: string };
}

export interface CoOccurrence {
  passenger1: string;
  passenger2: string;
  flights_together: number;
  entity_id1?: number;
  entity_id2?: number;
}

export type ViewMode = 'timeline' | 'map' | 'stats' | 'network';
