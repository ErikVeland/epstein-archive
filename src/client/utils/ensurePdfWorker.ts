import { pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let initialized = false;

export function ensurePdfWorker(): void {
  if (initialized) return;
  initialized = true;
  pdfjs.GlobalWorkerOptions.workerPort = new Worker(pdfWorkerUrl, { type: 'module' });
}
