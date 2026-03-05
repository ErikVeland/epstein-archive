import { getApiPool } from '../src/server/db/connection.js';
import 'dotenv/config';

const junkPatterns = [
  '%House%',
  '%Office%',
  '%Street%',
  '%Road%',
  '%Avenue%',
  '%Park%',
  '%Beach%',
  '%Islands%',
  '%Times%',
  '%Post%',
  '%News%',
  '%Press%',
  '%Journal%',
  '%Magazine%',
  '%Inc%',
  '%LLC%',
  '%Corp%',
  '%Ltd%',
  '%Group%',
  '%Trust%',
  '%Foundation%',
  '%University%',
  '%College%',
  '%School%',
  '%Academy%',
  '%Judge%',
  '%Court%',
  '%Attorney%',
  '%Justice%',
  '%Department%',
  '%Bureau%',
  '%Agency%',
  '%Police%',
  '%Sheriff%',
  '%FBI%',
  '%CIA%',
  '%Secret Service%',
  '%Bank%',
  '%Checking%',
  '%Savings%',
  '%Additions%',
  '%Subtractions%',
];

async function main() {
  const pool = getApiPool();
  console.log('Analyzing Top 100 *People* Evidence Coverage...');

  const junkConditions = junkPatterns.map((_, i) => `full_name NOT LIKE $${i + 1}`).join(' AND ');

  const unknownParam = `$${junkPatterns.length + 1}`;

  const sql = `
    SELECT
        id, full_name, mentions,
        (SELECT COUNT(*) FROM entity_mentions WHERE entity_id = entities.id) as mention_count,
        (SELECT COUNT(*) FROM media_item_people WHERE entity_id = entities.id) as photo_count
    FROM entities
    WHERE ${junkConditions}
    AND full_name NOT LIKE ${unknownParam}
    ORDER BY mentions DESC
    LIMIT 100
  `;

  const result = await pool.query(sql, [...junkPatterns, '%unknown%']);
  const topPeople = result.rows;

  console.log(`\nFound ${topPeople.length} Top People.`);
  const needsFix = topPeople.filter((p: any) => Number(p.photo_count) === 0);

  console.table(
    topPeople.slice(0, 20).map((p: any) => ({
      id: p.id,
      name: p.full_name.substring(0, 20),
      mentions: p.mentions,
      photos: Number(p.photo_count),
      NEEDS_FIX: Number(p.photo_count) === 0 ? 'YES' : '',
    })),
  );

  console.log(`\nEntities with NO Photos: ${needsFix.length} / ${topPeople.length}`);
  if (needsFix.length > 0) {
    console.log('Top 10 needing photos:');
    console.log(
      needsFix
        .slice(0, 10)
        .map((p: any) => p.full_name)
        .join(', '),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
