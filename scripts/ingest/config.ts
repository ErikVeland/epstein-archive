// ============================================================================
// CONFIGURATION & VERSIONING
// ============================================================================

import type { CollectionConfig } from './types.js';

export const PIPELINE_VERSION = '1.3.0';
export const STEP_VERSIONS = {
  collector: '1.0.0',
  reader_pdf: '1.1.0', // Tesseract fallback for scanned PDFs
  reader_ocr: 'Tesseract-7.0.0',
  reader_email: '1.0.0',
  reader_rtf: '1.0.0', // RTF → plain text via regex stripper
  reader_media: '1.0.0', // audio/video transcription via Whisper CLI
};

// Minimum real-word count before we consider a PDF extraction "sparse"
// and fall back to Tesseract page rendering.
export const OCR_FALLBACK_WORD_THRESHOLD = 50;

// Threshold for flagging an image as "text-heavy"
export const MEDIA_TEXT_THRESHOLD = 5;

export const INGEST_EXTENSIONS = new Set([
  'pdf',
  'txt',
  'rtf',
  'jpg',
  'jpeg',
  'png',
  'eml',
  'msg',
  'meta',
  'html',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'm4v',
  'wav',
  'mp3',
  'm4a',
  'aac',
  'flac',
]);

export const COLLECTIONS: CollectionConfig[] = [
  {
    name: 'Test',
    rootPath: 'data/ingest',
    description: 'Dev/Test collection',
    enabled: false,
  },
  {
    name: 'Epstein Estate Documents - Seventh Production',
    rootPath: 'data/originals/Epstein Estate Documents - Seventh Production',
    description: 'Seventh Production of Estate Documents',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 1',
    rootPath: 'data/originals/DOJ VOL00001',
    description: 'DOJ Data Set 1',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 2',
    rootPath: 'data/originals/DOJ VOL00002',
    description: 'DOJ Data Set 2',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 3',
    rootPath: 'data/originals/DOJ VOL00003',
    description: 'DOJ Data Set 3',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 4',
    rootPath: 'data/originals/DOJ VOL00004',
    description: 'DOJ Data Set 4',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 5',
    rootPath: 'data/originals/DOJ VOL00005',
    description: 'DOJ Data Set 5',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 6',
    rootPath: 'data/originals/DOJ VOL00006',
    description: 'DOJ Data Set 6',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 7',
    rootPath: 'data/originals/DOJ VOL00007',
    description: 'DOJ Data Set 7',
    enabled: false,
  },
  {
    name: 'DOJ Data Set 8',
    rootPath: 'data/originals/DOJ VOL00008',
    description: 'DOJ Data Set 8',
    enabled: false,
  },
  {
    name: 'Court Case Evidence',
    rootPath: 'data/originals/Court Case Evidence',
    description: 'Various Court Exhibits',
    enabled: false,
  },
  {
    name: 'Maxwell Proffer',
    rootPath: 'data/originals/Maxwell Proffer',
    description: 'Ghislaine Maxwell Proffer Documents',
    enabled: false,
  },
  {
    name: 'DOJ Phase 1',
    rootPath: 'data/originals/DOJ Phase 1',
    description: 'DOJ Phase 1 Documents',
    enabled: false,
  },
  {
    name: 'Evidence',
    rootPath: 'data/media/images/Evidence',
    description: 'Miscellaneous evidence images',
    enabled: true,
  },
  {
    name: 'Confirmed Fake',
    rootPath: 'data/media/images/Confirmed Fake',
    description: 'Images confirmed to be fake/AI generated',
    enabled: true,
  },
  {
    name: 'Unconfirmed Claims',
    rootPath: 'data/media/images/Unconfirmed Claims',
    description: 'Images with unverified claims',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 9',
    rootPath: 'data/ingest/DOJVOL00009/www.justice.gov/epstein/files/DataSet 9',
    description: '12,260 PDF files released Feb 1, 2026',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 10',
    rootPath: 'data/ingest/DOJVOL00010',
    description: 'Data Set 10 from DOJ',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 11',
    rootPath: 'data/ingest/DOJVOL00011/www.justice.gov/epstein/files/DataSet 11',
    description: 'Data Set 11 (Videos) from DOJ',
    enabled: true,
  },
  {
    name: 'Sascha Riley TikTok Q&A',
    rootPath: 'data/media/videos/Sasha Riley TikTok Q&A',
    description: 'Sascha Riley TikTok Q&A video',
    enabled: true,
  },
  {
    name: 'DOJ Data Set 12',
    rootPath: 'data/ingest/DOJVOL00012',
    description: 'Data Set 12 from DOJ',
    enabled: true,
  },
];
