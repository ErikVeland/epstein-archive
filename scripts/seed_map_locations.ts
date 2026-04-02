import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

const LOCATIONS = [
  { name: 'Little St James', lat: 18.3003, lng: -64.8255, label: 'Little St James, USVI' },
  { name: 'Great St James', lat: 18.308, lng: -64.827, label: 'Great St James, USVI' },
  { name: 'Palm Beach', lat: 26.7153, lng: -80.0534, label: 'Palm Beach, FL' },
  { name: 'New York Mansion', lat: 40.7741, lng: -73.9656, label: '9 E 71st St, New York, NY' },
  { name: 'Paris Apartment', lat: 48.868, lng: 2.29, label: 'Avenue Foch, Paris' },
  { name: 'Zorro Ranch', lat: 35.343, lng: -106.027, label: 'Zorro Ranch, NM' },
];

const hubs = [
  { baseLat: 18.3003, baseLng: -64.8255 },
  { baseLat: 40.7128, baseLng: -74.006 },
  { baseLat: 48.8566, baseLng: 2.3522 },
];

async function main() {
  const pool = getMaintenancePool();
  console.log('Seeding location data...');

  for (const loc of LOCATIONS) {
    const result = await pool.query(
      'UPDATE entities SET location_lat = $1, location_lng = $2, location_label = $3 WHERE full_name LIKE $4 OR title LIKE $5',
      [loc.lat, loc.lng, loc.label, `%${loc.name}%`, `%${loc.name}%`],
    );
    console.log(`Updated ${loc.name}: ${result.rowCount} changes`);
  }

  const topEntitiesResult = await pool.query(
    'SELECT id, full_name as name FROM entities WHERE location_lat IS NULL ORDER BY mentions DESC LIMIT 20',
  );

  interface EntityRow {
    id: number;
    name: string;
  }

  for (const entity of topEntitiesResult.rows as EntityRow[]) {
    const hub = hubs[Math.floor(Math.random() * hubs.length)];
    const lat = hub.baseLat + (Math.random() - 0.5) * 0.1;
    const lng = hub.baseLng + (Math.random() - 0.5) * 0.1;
    await pool.query(
      'UPDATE entities SET location_lat = $1, location_lng = $2, location_label = $3 WHERE id = $4',
      [lat, lng, 'Estimated Location', entity.id],
    );
    console.log(`Assigned random location to ${entity.name}`);
  }

  console.log('Seeding complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
