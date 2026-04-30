/* @name getFlights */
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
WHERE (:startDate::text IS NULL OR f.date >= :startDate)
  AND (:endDate::text IS NULL OR f.date <= :endDate)
  AND (:airport::text IS NULL OR f.departure_airport = :airport OR f.arrival_airport = :airport)
ORDER BY f.date DESC
LIMIT :limit! OFFSET :offset!;

/* @name getFlightPassengers */
SELECT
  fp.id,
  fp.flight_id as "flightId",
  fp.entity_id as "entityId",
  fp.passenger_name as "passengerName",
  fp.role
FROM flight_passengers fp
WHERE fp.flight_id IN (:flightIds!);

/* @name getFlightById */
SELECT * FROM flights WHERE id = :id!;

/* @name getFlightStats */
SELECT
  (SELECT COUNT(*)::integer FROM flights) as "totalFlights",
  (SELECT COUNT(DISTINCT passenger_name) FROM flight_passengers) as "uniquePassengers";

/* @name getTopPassengers */
SELECT passenger_name as name, COUNT(*)::integer as count
FROM flight_passengers
GROUP BY passenger_name
ORDER BY count DESC
LIMIT :limit!;

/* @name getTopRoutes */
SELECT 
  departure_airport || ' -> ' || arrival_airport as route,
  COUNT(*)::integer as count
FROM flights
GROUP BY route
ORDER BY count DESC
LIMIT :limit!;

/* @name getFlightsByYear */
SELECT 
  EXTRACT(YEAR FROM date::timestamp)::text as year,
  COUNT(*)::integer as count
FROM flights
GROUP BY year
ORDER BY year DESC;

/* @name getAirportStats */
SELECT 
  airport,
  city,
  SUM(count) as count
FROM (
  SELECT departure_airport as airport, departure_city as city, COUNT(*)::integer as count FROM flights GROUP BY airport, city
  UNION ALL
  SELECT arrival_airport as airport, arrival_city as city, COUNT(*)::integer as count FROM flights GROUP BY airport, city
) t
GROUP BY airport, city
ORDER BY count DESC;
