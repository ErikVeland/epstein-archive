/**
 * Canonical annotation types shared between client and API response shapes.
 * PDF coordinate fields are normalised 0–1 fractions.
 */

export type AnnotationType =
  | 'highlight'
  | 'note'
  | 'evidence'
  | 'question'
  | 'contradiction'
  | 'tag';

/**
 * A public document annotation as returned by GET /api/documents/:id/annotations.
 * Legacy text-only annotations have null/undefined pdf_* fields.
 */
export interface PublicDocumentAnnotation {
  id: string;
  documentId: string;
  type: AnnotationType;
  selectedText: string;
  note: string;
  position: { start: number; end: number };
  contextBefore?: string | null;
  contextAfter?: string | null;
  author?: string;
  /** PDF page number (1-based). Null for text-only annotations. */
  pdfPage?: number | null;
  /** Normalised X origin (0–1, left edge of page). */
  pdfX?: number | null;
  /** Normalised Y origin (0–1, top edge of page). */
  pdfY?: number | null;
  /** Normalised width (0–1, fraction of page width). Must be > 0 when present. */
  pdfWidth?: number | null;
  /** Normalised height (0–1, fraction of page height). Must be > 0 when present. */
  pdfHeight?: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for creating a new annotation via POST /api/documents/:id/annotations */
export interface CreateAnnotationPayload {
  type: AnnotationType;
  selectedText: string;
  note?: string;
  start: number;
  end: number;
  contextBefore?: string;
  contextAfter?: string;
  author?: string;
  pdfPage?: number;
  pdfX?: number;
  pdfY?: number;
  pdfWidth?: number;
  pdfHeight?: number;
}
