import React from 'react';
import type { PublicDocumentAnnotation } from '@shared/dto/annotations';
import { annotationTokens } from '@client/design-system/lib';
import styles from './PDFAnnotationOverlay.module.css';

/**
 * Colour palette for annotation overlay highlights.
 * Values are translucent — subtle enough not to obscure the page text.
 */
const FILL: Record<string, string> = annotationTokens.overlayFill;

const STROKE: Record<string, string> = annotationTokens.overlayStroke;

interface PDFAnnotationOverlayProps {
  annotations: PublicDocumentAnnotation[];
  pageNumber: number;
  visible: boolean;
}

/**
 * Renders translucent highlight boxes over a PDF page.
 *
 * - Must be positioned inside a `position: relative` container that exactly
 *   covers the rendered page (same width/height as the react-pdf <Page>).
 * - Uses `pointer-events: none` — does not block PDF text-layer interaction.
 * - Coordinates are normalised (0–1); multiplied by 100 to get CSS percentages.
 * - Annotations without valid PDF coordinates are silently skipped.
 */
export const PDFAnnotationOverlay: React.FC<PDFAnnotationOverlayProps> = ({
  annotations,
  pageNumber,
  visible,
}) => {
  if (!visible) return null;

  const pageAnnotations = annotations.filter(
    (a) =>
      a.pdfPage === pageNumber &&
      a.pdfX != null &&
      a.pdfY != null &&
      a.pdfWidth != null &&
      a.pdfHeight != null &&
      (a.pdfWidth ?? 0) > 0 &&
      (a.pdfHeight ?? 0) > 0,
  );

  if (pageAnnotations.length === 0) return null;

  return (
    <div className={styles.overlay} aria-hidden="true">
      {pageAnnotations.map((a) => (
        <div
          key={a.id}
          className={styles.highlight}
          style={{
            left: `${(a.pdfX ?? 0) * 100}%`,
            top: `${(a.pdfY ?? 0) * 100}%`,
            width: `${(a.pdfWidth ?? 0) * 100}%`,
            height: `${(a.pdfHeight ?? 0) * 100}%`,
            backgroundColor: FILL[a.type] ?? annotationTokens.overlayFill.fallback,
            borderColor: STROKE[a.type] ?? annotationTokens.overlayStroke.fallback,
          }}
          title={a.note ? `${a.type}: ${a.note}` : a.selectedText}
        />
      ))}
    </div>
  );
};

export default PDFAnnotationOverlay;
