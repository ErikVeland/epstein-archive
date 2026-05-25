import { Router } from 'express';
import metadataRouter from './mediaMetadata.js';
import imagesRouter from './mediaImages.js';
import batchRouter from './mediaBatch.js';
import audioRouter from './mediaAudio.js';
import videoRouter from './mediaVideo.js';
import pdfRouter from './mediaPdf.js';

const router = Router();

router.use('/', metadataRouter);
router.use('/', imagesRouter);
router.use('/', batchRouter);
router.use('/', audioRouter);
router.use('/', videoRouter);
router.use('/', pdfRouter);

export default router;
