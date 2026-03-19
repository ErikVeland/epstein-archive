import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/Logger.js';

interface WindowEntry {
  count: number;
  lastSeen: number;
}

const WINDOW_MS = 30_000; // 30-second rolling window
const WARN_THRESHOLD = 20; // warn after 20 retried requests in 30s
const BLOCK_THRESHOLD = 50; // block after 50

const ipWindows = new Map<string, WindowEntry>();

// Cleanup every 60s
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, entry] of ipWindows) {
    if (entry.lastSeen < cutoff) ipWindows.delete(ip);
  }
}, 60_000);

export function retryStormDetector(req: Request, res: Response, next: NextFunction) {
  // Only watch requests that declare themselves as retries
  const isRetry = req.headers['x-retry-attempt'] || req.headers['x-retry-count'];
  if (!isRetry) return next();

  const ip = (req.ip || 'unknown').replace('::ffff:', '');
  const now = Date.now();
  const entry = ipWindows.get(ip);

  if (!entry || now - entry.lastSeen > WINDOW_MS) {
    ipWindows.set(ip, { count: 1, lastSeen: now });
    return next();
  }

  entry.count += 1;
  entry.lastSeen = now;

  if (entry.count >= BLOCK_THRESHOLD) {
    logger.error(
      `[STORM DETECTOR] Blocking IP ${ip} - ${entry.count} retries in ${WINDOW_MS / 1000}s window`,
    );
    res.set('Retry-After', '30');
    return res.status(429).json({ error: 'Retry storm detected. Back off and try again later.' });
  }

  if (entry.count >= WARN_THRESHOLD) {
    logger.warn(
      `[STORM DETECTOR] IP ${ip} is retrying aggressively: ${entry.count} retries in ${WINDOW_MS / 1000}s`,
    );
  }

  next();
}
