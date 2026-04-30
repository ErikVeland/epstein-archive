export interface Config {
  nodeEnv: string;
  apiPort: number;
  databaseUrl: string;
  dbEncryptionKey: string;
  jwtSecret: string;
  sessionSecret: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  corsOrigin: string | string[];
  corsCredentials: boolean;
  logLevel: string;
  logFile: string;
  maxFileSize: string;
  maxFilesPerUpload: number;
  cacheTtl: number;
  redisUrl: string;
  sentryDsn: string;
  analyticsId: string;
  backupIntervalHours: number;
  backupRetentionDays: number;
  backupStoragePath: string;
}

const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const getEnvVarAsNumber = (name: string, defaultValue: number): number => {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return parsed;
};

const getEnvVarAsBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getCorsOrigin = (): string | string[] => {
  const origin = getEnvVar('CORS_ORIGIN', 'http://localhost:3002');
  if (origin.includes(',')) {
    return origin.split(',').map((o) => o.trim());
  }
  return origin;
};

export const config: Config = {
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  apiPort: getEnvVarAsNumber('PORT', 3012),
  databaseUrl: getEnvVar('DATABASE_URL'),
  dbEncryptionKey: getEnvVar('DB_ENCRYPTION_KEY', 'default-encryption-key'),
  jwtSecret: getEnvVar('JWT_SECRET'),
  sessionSecret: getEnvVar('SESSION_SECRET'),
  rateLimitWindowMs: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
  rateLimitMaxRequests: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 1000), // Increased from 100 for media app
  corsOrigin: getCorsOrigin(),
  corsCredentials: getEnvVarAsBoolean('CORS_CREDENTIALS', true),
  logLevel: getEnvVar('LOG_LEVEL', 'info'),
  logFile: getEnvVar('LOG_FILE', './logs/app.log'),
  maxFileSize: getEnvVar('MAX_FILE_SIZE', '50MB'),
  maxFilesPerUpload: getEnvVarAsNumber('MAX_FILES_PER_UPLOAD', 10),
  cacheTtl: getEnvVarAsNumber('CACHE_TTL', 3600), // 1 hour
  redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  sentryDsn: getEnvVar('SENTRY_DSN', ''),
  analyticsId: getEnvVar('ANALYTICS_ID', ''),
  backupIntervalHours: getEnvVarAsNumber('BACKUP_INTERVAL_HOURS', 24),
  backupRetentionDays: getEnvVarAsNumber('BACKUP_RETENTION_DAYS', 30),
  backupStoragePath: getEnvVar('BACKUP_STORAGE_PATH', './backups'),
};

export default config;
