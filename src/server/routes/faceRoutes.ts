import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { faceClustersRepository } from '../db/faceClustersRepository.js';

const router = Router();

// GET /api/faces/clusters
router.get('/clusters', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    res.json(await faceClustersRepository.listClusters());
  } catch (error) {
    next(error);
  }
});

// GET /api/faces/clusters/:id
router.get('/clusters/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const cluster = await faceClustersRepository.getClusterById(req.params.id);
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const faces = await faceClustersRepository.getFacesByClusterId(req.params.id);
    res.json({ cluster, faces });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/faces/clusters/:id — rename, hide, or link to entity
router.patch('/clusters/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_hidden, entity_id } = req.body;

    if (name === undefined && is_hidden === undefined && entity_id === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await faceClustersRepository.updateCluster({
      id,
      name,
      isHidden: is_hidden,
      entityId: entity_id,
    });

    if (!updated) return res.status(404).json({ error: 'Cluster not found' });

    // Return tagged photo count when an entity was just linked
    if (entity_id != null) {
      const tagged = await faceClustersRepository.countLinkedPhotos(id, entity_id);
      return res.json({ ...updated, tagged_photos: tagged });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

import path from 'path';
import fs from 'fs';

// Helper to resolve paths safely
const findFirstExistingPath = (paths: string[]): string | null => {
  for (const p of paths) {
    if (!p) continue;
    const absPath = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
    if (fs.existsSync(absPath)) return absPath;
  }
  return null;
};

// GET /api/faces/assets?path=...
// Serves face crops and thumbnails from the data directory
router.get('/assets', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const assetPath = req.query.path as string;
    if (!assetPath) return res.status(400).json({ error: 'Path required' });

    // Security: Only allow paths starting with data/ or /data/
    const normalized = assetPath.replace(/^\/+/, '');
    if (!normalized.startsWith('data/')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const resolved = findFirstExistingPath([normalized]);
    if (!resolved) return res.status(404).json({ error: 'Asset not found' });

    res.type(path.extname(resolved) || 'image/jpeg');
    return res.sendFile(resolved);
  } catch (error) {
    next(error);
  }
});

export default router;
