import express, { NextFunction } from 'express';
import { optionalAuthenticate } from '../auth/middleware.js';
import { annotationWriteLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

interface PresenceUser {
  id: string;
  username: string;
  path: string;
  lastActive: number;
}

interface AuthRequest extends express.Request {
  user?: { id: string | number; username: string };
}

const presenceStore = new Map<string, PresenceUser>();

// Clear stale heartbeats (users inactive for more than 15s)
setInterval(() => {
  const now = Date.now();
  for (const [userId, user] of presenceStore.entries()) {
    if (now - user.lastActive > 15000) {
      presenceStore.delete(userId);
    }
  }
}, 5000);

// POST /api/collaboration/heartbeat
router.post(
  '/heartbeat',
  annotationWriteLimiter,
  optionalAuthenticate,
  (req: AuthRequest, res, next: NextFunction) => {
    try {
      const user = req.user || { id: 'anonymous', username: 'Anonymous Researcher' };
      const { path } = req.body;

      presenceStore.set(String(user.id), {
        id: String(user.id),
        username: String(user.username),
        path: String(path || '/'),
        lastActive: Date.now(),
      });

      const coPresent = Array.from(presenceStore.values()).filter(
        (u) => u.id !== String(user.id) && u.path === String(path || '/'),
      );

      res.json({ success: true, coPresent });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
