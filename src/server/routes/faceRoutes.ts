import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth/middleware.js';
import { faceClustersRepository } from '../db/faceClustersRepository.js';

const router = Router();

// GET /api/faces/clusters - List all clusters
router.get('/clusters', authenticateRequest, requireRole('admin'), async (_req, res, next) => {
  try {
    const clusters = await faceClustersRepository.listClusters();
    res.json(clusters);
  } catch (error) {
    next(error);
  }
});

// GET /api/faces/clusters/:id - Get cluster details and faces
router.get('/clusters/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const cluster = await faceClustersRepository.getClusterById(id);
    if (!cluster) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    const faces = await faceClustersRepository.getFacesByClusterId(id);

    res.json({
      cluster,
      faces,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/faces/clusters/:id - Update cluster (rename)
router.patch('/clusters/:id', authenticateRequest, requireRole('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_hidden } = req.body;

    if (name === undefined && is_hidden === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await faceClustersRepository.updateCluster({
      id,
      name,
      isHidden: is_hidden,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Cluster not found' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
