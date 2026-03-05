import { getApiPool } from '../src/server/db/connection.js';
import 'dotenv/config';

const JUNK_PATTERNS = [
  '%See Attachment%',
  '%The Selence Behind%',
  '%Search Persanel%',
  '%Pour Bond Beam%',
  '%Contact Namber%',
  '%End Cap Bracket%',
  '%Building No%',
  '%Dumpster Hauls%',
  '%Kimberly Meder%',
  '%Flor Ditchin%',
  '%Disc Rewritable%',
  '%Hang Penan%',
  '%East If%',
  '%Bluray Disc%',
  '%En Espa%',
  '%Jobs Menorex%',
  '%Shaded Roof%',
  '%New Columns Form%',
  '%My Tunsi%',
  '%Sos Kimbery%',
  '%Existing Columns%',
  '%Fibor Case%',
  '%Shredder Bags%',
  '%Ut Floor%',
  '%Anne La%',
  '%East Aftstreet%',
  '%Search Persoanel%',
  '%Margaret Girand%',
  '%Frisied Name%',
  '%Dechiqu Bolsas%',
  '%Margarlt Girara%',
  '%Bee Attachmert%',
  '%Mailing Address%',
  '%Customer Service%',
  '%Magstae Jedge%',
  '%Your Account%',
  '%Containers Thereup%',
  '%Any Locked%',
  '%Any Buldings%',
  '%Physical Address%',
  '%Ownership Name%',
  '%United%States Code%',
  '%El Brlls%',
  '%Zeero Automobiles%',
  '%Valuable Articles%',
  '%Paris Homeowners%',
  '%Zorro Automobiles%',
  '%Search Personnel%',
  '%Hong Kong%',
];

async function main() {
  const pool = getApiPool();
  console.log('🧹 Cleaning up junk entities from database...');

  let totalDeleted = 0;

  for (const pattern of JUNK_PATTERNS) {
    // 1. Find IDs
    const findSql = `SELECT id, full_name FROM entities WHERE full_name ILIKE $1`;
    const rows = (await pool.query(findSql, [pattern])).rows;

    if (rows.length > 0) {
      const ids = rows.map((r: any) => r.id);
      console.log(
        `   Found ${ids.length} entities matching "${pattern}" (e.g. ${rows[0].full_name})`,
      );

      // 2. Delete dependencies first (mentions, relationships, etc.)
      // Note: In a real prod env, we might want to soft-delete or merge, but for junk, hard delete is fine.
      await pool.query(`DELETE FROM entity_mentions WHERE entity_id = ANY($1::bigint[])`, [ids]);
      await pool.query(`DELETE FROM media_item_people WHERE entity_id = ANY($1::bigint[])`, [ids]);
      await pool.query(
        `DELETE FROM entity_relationships WHERE source_entity_id = ANY($1::bigint[]) OR target_entity_id = ANY($1::bigint[])`,
        [ids],
      );

      // 3. Delete entity
      const res = await pool.query(`DELETE FROM entities WHERE id = ANY($1::bigint[])`, [ids]);
      totalDeleted += res.rowCount || 0;
    }
  }

  console.log(`\n✅ Cleanup Complete. Removed ${totalDeleted} junk entities.`);
}

main().catch(console.error);
