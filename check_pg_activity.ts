import pg from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  console.log('Connected to PG. Fetching active queries...');

  try {
    const { rows: activity } = await pool.query(`
      SELECT 
        pid, 
        query, 
        state, 
        age(clock_timestamp(), query_start) as duration,
        wait_event_type,
        wait_event
      FROM pg_stat_activity 
      WHERE state != 'idle'
      ORDER BY duration DESC;
    `);
    console.log('--- ACTIVE QUERIES ---');
    console.log(activity);

    const { rows: locks } = await pool.query(`
      SELECT
        blocked_locks.pid     AS blocked_pid,
        blocked_activity.query    AS blocked_statement,
        blocking_locks.pid    AS blocking_pid,
        blocking_activity.query   AS blocking_statement
      FROM  pg_catalog.pg_locks         blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks         blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted;
    `);
    console.log('--- BLOCKED LOCKS ---');
    console.log(locks);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
