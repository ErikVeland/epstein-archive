import React from 'react';
import { annotationTokens } from '@client/design-system/lib';

const FILL: Record<string, string> = annotationTokens.overlayFill;
const STROKE: Record<string, string> = annotationTokens.overlayStroke;

interface Annotation {
  id: string;
  pdfPage?: number | null;
  pdfX?: number | null;
  pdfY?: number | null;
  pdfWidth?: number | null;
  pdfHeight?: number | null;
  type: string;
  note?: string;
  selectedText?: string;
}

interface PDFAnnotationOverlayProps {
  annotations?: Annotation[];
  pageNumber: number;
  showAnnotations?: boolean;
}

export const PDFAnnotationOverlay: React.FC<PDFAnnotationOverlayProps> = ({
  annotations = [],
  pageNumber,
  showAnnotations = true,
}) => {
  if (!showAnnotations) return null;

  const pageAnnotations = annotations.filter(
    (ann) =>
      ann.pdfPage === pageNumber &&
      ann.pdfX !== null &&
      ann.pdfX !== undefined &&
      ann.pdfY !== null &&
      ann.pdfY !== undefined &&
      ann.pdfWidth !== null &&
      ann.pdfWidth !== undefined &&
      ann.pdfHeight !== null &&
      ann.pdfHeight !== undefined,
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {pageAnnotations.map((ann) => {
        const x = Number(ann.pdfX);
        const y = Number(ann.pdfY);
        const w = Number(ann.pdfWidth);
        const h = Number(ann.pdfHeight);

        return (
          <div
            key={ann.id}
            style={{
              position: 'absolute',
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
              backgroundColor: FILL[ann.type] ?? annotationTokens.overlayFill.fallback,
              borderColor: STROKE[ann.type] ?? annotationTokens.overlayStroke.fallback,
              borderStyle: 'solid',
              borderWidth: '1.5px',
              boxSizing: 'border-box',
            }}
            title={`${ann.type}: ${ann.note || ann.selectedText}`}
          />
        );
      })}
    </div>
  );
};

export default PDFAnnotationOverlay;
