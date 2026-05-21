// ============================================================================
// PIPELINE CONFIGURATION — constants shared across all pipeline modules
// ============================================================================

import { getWorkerConfig } from '../../src/server/queue/index.js';

export const BATCH_SIZE = getWorkerConfig().batchSize;
export const CHECKPOINT_DIR = './pipeline_checkpoints';
export const LIVE_STATUS_FILE = './pipeline_checkpoints/live_status.json';

export const EXO_HEALTHCHECK_TIMEOUT_MS = Math.max(
  1000,
  parseInt(process.env.PIPELINE_EXO_HEALTH_TIMEOUT_MS || '8000', 10) || 8000,
);
export const DOC_PROCESSING_TIMEOUT_MS = Math.max(
  30_000,
  parseInt(process.env.PIPELINE_DOC_TIMEOUT_MS || '180000', 10) || 180000,
);
export const PIPELINE_STALL_TIMEOUT_MS = Math.max(
  30_000,
  parseInt(process.env.PIPELINE_STALL_TIMEOUT_MS || '240000', 10) || 240000,
);
export const WATCHDOG_INTERVAL_MS = Math.max(
  5000,
  parseInt(process.env.PIPELINE_WATCHDOG_INTERVAL_MS || '15000', 10) || 15000,
);
export const RECOVERY_COMMAND_TIMEOUT_MS = Math.max(
  5000,
  parseInt(process.env.PIPELINE_RECOVERY_COMMAND_TIMEOUT_MS || '45000', 10) || 45000,
);
export const RECOVERY_HEALTH_GRACE_MS = Math.max(
  2000,
  parseInt(process.env.PIPELINE_RECOVERY_HEALTH_GRACE_MS || '12000', 10) || 12000,
);
export const RECOVERY_COOLDOWN_MS = Math.max(
  5000,
  parseInt(process.env.PIPELINE_RECOVERY_COOLDOWN_MS || '120000', 10) || 120000,
);

export const PIPELINE_VERSION = process.env.UNIFIED_PIPELINE_VERSION || 'unified-reducto-2.0';
