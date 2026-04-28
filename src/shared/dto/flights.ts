export interface FlightPassengerDto {
  id: number;
  entityId: number | null;
  passengerName: string | null;
  role: string | null;
}

export interface FlightItemDto {
  id: number;
  date: string | null;
  departureAirport: string | null;
  departureCity: string | null;
  departureCountry: string | null;
  arrivalAirport: string | null;
  arrivalCity: string | null;
  arrivalCountry: string | null;
  aircraftTail: string | null;
  aircraftType: string | null;
  pilot: string | null;
  notes: string | null;
  passengers: FlightPassengerDto[];
}

export interface FlightsListResponseDto {
  flights: FlightItemDto[];
  total: number;
}
