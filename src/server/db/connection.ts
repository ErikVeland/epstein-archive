export {
  getApiPool,
  getMaintenancePool,
  getIngressPool,
  getIngestPool,
  initPools,
  drainPools,
  assertProductionPg,
  getMigrationMetrics,
  getSlowQueryLogThresholdMs,
} from './runtime.js';

// ingress: parseInt(process.env.INGEST_POOL_MAX ?? '8')
