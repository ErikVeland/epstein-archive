export type WorkerConfig = {
  concurrency: number;
  leaseSeconds: number;
  healthUrl: string;
  batchSize: number;
  maxAttempts: number;
};

export const intFromEnv = (name: string, fallback: number, min: number, max: number): number => {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};

export const getWorkerConfig = (): WorkerConfig => ({
  concurrency: intFromEnv('INGEST_CONCURRENCY', 2, 1, 64),
  leaseSeconds: intFromEnv('QUEUE_LEASE_SECONDS', 600, 30, 3600),
  healthUrl: process.env.QUEUE_HEALTH_URL || 'http://127.0.0.1:3012/api/health',
  batchSize: intFromEnv('BATCH_SIZE', 20, 1, 1000),
  maxAttempts: intFromEnv('QUEUE_MAX_ATTEMPTS', 5, 1, 25),
});
