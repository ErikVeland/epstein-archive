import express from 'express';
import { flightsRepository } from '../db/flightsRepository.js';
import { documentsRepository } from '../db/documentsRepository.js';
import { claimTriplesRepository } from '../db/claimTriplesRepository.js';
import { communicationsRepository } from '../db/communicationsRepository.js';
import { relationshipsRepository } from '../db/relationshipsRepository.js';
import { logger } from '../services/Logger.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';
import type { ConnectionDossierDto } from '@shared/dto/connections';

const router = express.Router();

// GET /api/connections?a=:entityId&b=:entityId
// Rate limited to prevent abuse
router.get('/', apiRateLimiter, async (req, res, next) => {
  try {
    const { a, b } = req.query as { a?: string; b?: string };
    if (!a || !b) {
      return res.status(400).json({ error: 'Both a and b entity IDs are required' });
    }

    const [entityA, entityB] = await Promise.all([
      relationshipsRepository.resolveEntity(a),
      relationshipsRepository.resolveEntity(b),
    ]);
    if (!entityA) return res.status(404).json({ error: `Entity not found: ${a}` });
    if (!entityB) return res.status(404).json({ error: `Entity not found: ${b}` });

    const aId = Number(a);
    const bId = Number(b);

    const [flights, documents, claims, communications, path] = await Promise.all([
      flightsRepository.getSharedFlights(aId, bId).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedFlights failed');
        return [];
      }),
      documentsRepository.getSharedDocuments(aId, bId).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedDocuments failed');
        return [];
      }),
      claimTriplesRepository.getSharedClaims(a, b).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedClaims failed');
        return [];
      }),
      communicationsRepository.getSharedCommunications(aId, bId).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedCommunications failed');
        return [];
      }),
      relationshipsRepository.resolveShortestPath(a, b),
    ]);

    const dossier: ConnectionDossierDto = {
      entityA,
      entityB,
      signals: { flights, communications, path, claims, documents },
      summary: {
        flightCount: flights.length,
        communicationCount: communications.length,
        pathHops: path?.hops ?? null,
        claimCount: claims.length,
        documentCount: documents.length,
      },
    };

    return res.json(dossier);
  } catch (error) {
    return next(error);
  }
});

export default router;
