import express from 'express';
import crypto from 'crypto';
import { authenticateRequest, requireRole, AuthRequest } from '../auth/middleware.js';
import { logAudit } from '../utils/auditLogger.js';
import bcrypt from 'bcryptjs';
import { createUser, deleteUser, getUserById, listUsers, updateUser } from '../db/healthQueries.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const BCRYPT_COST = 12;

// Schemas
const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3),
    password: z.string().min(6),
    email: z.string().email().optional().nullable(),
    role: z.enum(['admin', 'investigator', 'viewer']).optional().default('viewer'),
  }),
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional().nullable(),
    role: z.enum(['admin', 'investigator', 'viewer']).optional(),
    password: z.string().min(6).optional(),
  }),
});

const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// User Management Endpoints
router.get('/', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

router.get('/current', authenticateRequest, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// Create new user (Admin only)
router.post(
  '/',
  authenticateRequest,
  requireRole('admin'),
  validate(createUserSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { username, password, email, role } = req.body;

      const id = crypto.randomUUID();
      // Hash password
      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

      await createUser({
        id,
        username,
        email: email || null,
        role: role || 'viewer',
        passwordHash,
      });

      await logAudit(
        'create_user',
        req.user?.id || null,
        'user',
        id,
        { username, role },
        undefined,
        req.requestId,
      );
      res.status(201).json({ id, username, email, role });
    } catch (e) {
      next(e);
    }
  },
);

// Update user (Admin or Self)
router.put(
  '/:id',
  authenticateRequest,
  validate(updateUserSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const { username, email, role, password } = req.body;
      const currentUser = req.user;
      if (!currentUser) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (currentUser.role !== 'admin' && currentUser.id !== id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const fields: {
        username?: string;
        email?: string;
        role?: string;
        passwordHash?: string;
      } = {};
      if (username) {
        fields.username = username;
      }
      if (email) {
        fields.email = email;
      }
      if (role && currentUser.role === 'admin') {
        fields.role = role;
      }
      if (password) {
        fields.passwordHash = await bcrypt.hash(password, BCRYPT_COST);
      }

      if (!fields.username && !fields.email && !fields.role && !fields.passwordHash) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      await updateUser(id, fields);

      await logAudit(
        'update_user',
        currentUser.id,
        'user',
        id,
        { username, role },
        undefined,
        req.requestId,
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);

// Delete user (Admin only)
router.delete(
  '/:id',
  authenticateRequest,
  requireRole('admin'),
  validate(deleteUserSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        return res.status(400).json({ error: 'Admins cannot delete their own account' });
      }

      await deleteUser(id);
      await logAudit('delete_user', req.user?.id || null, 'user', id, {}, undefined, req.requestId);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
