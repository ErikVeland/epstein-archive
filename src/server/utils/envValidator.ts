import { logger } from '../services/Logger.js';

export const validateEnvironment = () => {
  const requiredVars = ['RAW_CORPUS_BASE_PATH'];
  if (process.env.NODE_ENV === 'production') {
    requiredVars.push('DATABASE_URL');
  }
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    // We log error but maybe not throw yet to avoid breaking dev if they haven't set it?
    // But the plan says "Harden", so we should be strict.
    // However, we want to allow the user to fix it.
    logger.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  } else {
    logger.info('Environment configuration valid.');
  }
};

export const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};
