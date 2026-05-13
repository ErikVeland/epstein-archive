#!/usr/bin/env tsx
import 'dotenv/config';
import { forceRefresh } from '../src/server/services/matViewRefresh.js';
import { getMaintenancePool } from '../src/server/db/connection.js';

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 ANALYTICS REFRESH');
  console.log('='.repeat(70));

  await forceRefresh();

  try {
    await getMaintenancePool().query('ANALYZE documents');
    await getMaintenancePool().query('ANALYZE entities');
    await getMaintenancePool().query('ANALYZE entity_mentions');
    await getMaintenancePool().query('ANALYZE entity_relationships');
    await getMaintenancePool().query('ANALYZE claim_triples');
  } catch (error) {
    console.warn('[analytics-refresh] ANALYZE partially failed:', (error as Error).message);
  }

  console.log('✅ Analytics views and planner stats refreshed');
}

main()
  .catch((error) => {
    console.error('❌ Analytics refresh failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getMaintenancePool()
      .end()
      .catch(() => {});
  });
