import { Router } from 'express';
import coreRouter from './investigationsCore.js';
import timelineRouter from './investigationsTimeline.js';
import evidenceRouter from './investigationsEvidence.js';
import notebookRouter from './investigationsNotebook.js';
import exportRouter from './investigationsExport.js';

const router = Router();

router.use('/', coreRouter);
router.use('/', timelineRouter);
router.use('/', evidenceRouter);
router.use('/', notebookRouter);
router.use('/', exportRouter);

export default router;
