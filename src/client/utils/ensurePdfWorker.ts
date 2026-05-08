import { pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let initialized = false;

export function ensurePdfWorker(): void {
  if (initialized) return;
  initialized = true;
  // Set workerSrc only — do NOT set workerPort. When workerPort is set to a
  // manually-created Worker, react-pdf calls PDFWorker.destroy() on every
  // Document unmount, which terminates the shared native Worker. The next
  // Document mount then tries to create against a destroyed port and PDF.js
  // throws "the worker is being destroyed". With only workerSrc, PDF.js owns
  // the worker lifecycle and correctly reuses it across mount/unmount cycles.
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}
