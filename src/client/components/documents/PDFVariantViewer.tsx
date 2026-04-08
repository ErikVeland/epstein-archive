import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Fingerprint,
  Info,
} from 'lucide-react';
import styles from './PDFVariantViewer.module.css';

// Design System
import { LqText } from '../../design-system/components/typography/Text';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFVariantViewerProps {
  documentId: string;
  className?: string;
  showToolbar?: boolean;
}

export const PDFVariantViewer: React.FC<PDFVariantViewerProps> = ({
  documentId,
  className = '',
  showToolbar = true,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewerWidth, setViewerWidth] = useState<number>(0);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      setViewerWidth(el.clientWidth);
    });
    obs.observe(el);
    setViewerWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  type DocMeta = {
    fileName?: string;
    filePath?: string;
    originalFilePath?: string;
    cleanedPath?: string;
    mimeType?: string;
  };

  const {
    data: docMeta = null,
    isLoading,
    error: fetchError,
  } = useQuery<DocMeta | null>({
    queryKey: ['pdfVariantMeta', documentId],
    queryFn: async () => {
      const primaryRes = await fetch(`/api/documents/${documentId}`);
      const fallbackRes = !primaryRes.ok ? await fetch(`/api/evidence/${documentId}`) : null;
      const res = primaryRes.ok ? primaryRes : fallbackRes;
      if (!res || !res.ok) throw new Error('Failed to fetch document metadata');
      const data = (await res.json()) as Record<string, unknown>;
      return {
        fileName: (data.fileName || data.file_name) as string | undefined,
        filePath: (data.filePath || data.file_path) as string | undefined,
        originalFilePath: (data.originalFilePath || data.original_file_path) as string | undefined,
        cleanedPath: (data.cleanedPath || data.cleaned_path) as string | undefined,
        mimeType: (data.mimeType || data.mime_type || data.fileType || data.file_type) as
          | string
          | undefined,
      };
    },
    staleTime: 30_000,
  });
  const error = fetchError instanceof Error ? fetchError.message : null;

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => setPageNumber((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(numPages, prev + 1));
  const zoomIn = () => setScale((prev) => Math.min(3.0, prev + 0.2));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));
  const rotateClockwise = () => setRotation((prev) => (prev + 90) % 360);

  const inferAssetType = () => {
    const mime = String(docMeta?.mimeType || '').toLowerCase();
    if (mime.includes('pdf')) return 'pdf';
    if (mime.startsWith('image/')) return 'image';

    const candidatePath = String(
      docMeta?.fileName || docMeta?.filePath || docMeta?.originalFilePath || '',
    ).toLowerCase();
    if (candidatePath.endsWith('.pdf')) return 'pdf';
    if (
      candidatePath.endsWith('.jpg') ||
      candidatePath.endsWith('.jpeg') ||
      candidatePath.endsWith('.png') ||
      candidatePath.endsWith('.gif') ||
      candidatePath.endsWith('.webp') ||
      candidatePath.endsWith('.bmp') ||
      candidatePath.endsWith('.tif') ||
      candidatePath.endsWith('.tiff') ||
      candidatePath.endsWith('.svg')
    ) {
      return 'image';
    }

    return 'unknown';
  };

  const getCurrentUrl = () => {
    if (!docMeta) return '';
    // Single-file mode: always load the canonical/original asset.
    return `/api/documents/${documentId}/file?variant=dirty`;
  };

  const currentUrl = getCurrentUrl();
  const assetType = inferAssetType();

  return (
    <div className={`${styles.root} ${className}`}>
      {showToolbar && (
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <div className={styles.searchContainer}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find in page..."
                className={styles.searchInput}
              />
            </div>
          </div>

          <div className={styles.toolGroup}>
            <div className={styles.zoomControls}>
              <button onClick={zoomOut} className={styles.toolButton} title="Zoom Out">
                <ZoomOut size={16} />
              </button>
              <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className={styles.toolButton} title="Zoom In">
                <ZoomIn size={16} />
              </button>
            </div>
            <button onClick={rotateClockwise} className={styles.toolButton} title="Rotate">
              <RotateCw size={16} />
            </button>
          </div>
        </div>
      )}

      <div ref={viewerRef} className={styles.viewerPane}>
        {isLoading ? (
          <div className={styles.statusOverlay}>
            <div className={styles.spinner} />
            <LqText variant="body" weight="medium" className={styles.animatePulse}>
              Initializing Viewer...
            </LqText>
          </div>
        ) : error ? (
          <div className={styles.statusOverlay}>
            <Fingerprint
              size={48}
              className={`${styles.errorText} ${styles.marginBottomMedium} ${styles.opacityStatic}`}
            />
            <LqText
              variant="h3"
              weight="bold"
              className={`${styles.errorText} ${styles.marginBottomSmall}`}
            >
              Access Error
            </LqText>
            <LqText
              variant="xs"
              color="secondary"
              className={`${styles.maxWSmall} ${styles.opacityHigh}`}
            >
              {error}
            </LqText>
          </div>
        ) : !currentUrl ? (
          <div className={styles.statusOverlay}>
            <Info size={48} className={`${styles.marginBottomMedium} ${styles.opacityLow}`} />
            <LqText
              variant="h3"
              weight="bold"
              color="secondary"
              className={styles.marginBottomSmall}
            >
              No Asset Linked
            </LqText>
            <LqText variant="xs" color="muted" className={styles.maxWSmall}>
              This record exists in the index but no PDF asset has been processed for the selected
              variant.
            </LqText>
          </div>
        ) : assetType === 'image' ? (
          <div className={styles.imageContainer}>
            <img
              src={currentUrl}
              alt={docMeta?.fileName || `Document ${documentId}`}
              className={styles.previewImage}
            />
          </div>
        ) : assetType !== 'pdf' ? (
          <div className={styles.statusOverlay}>
            <Info size={48} className={`${styles.marginBottomMedium} ${styles.opacityLow}`} />
            <LqText
              variant="h3"
              weight="bold"
              color="secondary"
              className={styles.marginBottomSmall}
            >
              Preview unavailable
            </LqText>
            <LqText variant="xs" color="muted" className={styles.maxWSmall}>
              This asset is not a PDF. Open the original file from the document actions.
            </LqText>
          </div>
        ) : (
          <Document
            file={currentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className={styles.statusOverlay}>
                <div className={styles.spinner} />
                <LqText variant="xs" weight="medium">
                  Loading document...
                </LqText>
              </div>
            }
            error={
              <div className={styles.statusOverlay}>
                <Fingerprint
                  size={40}
                  className={`${styles.errorText} ${styles.marginBottomSmall} ${styles.opacityMedium}`}
                />
                <LqText variant="body" weight="bold" className={styles.errorText}>
                  PDF Rendering Failed
                </LqText>
                <LqText
                  variant="xs"
                  className={`${styles.errorText} ${styles.marginTopSmall} ${styles.opacityHigh}`}
                >
                  Resource may be temporarily unavailable
                </LqText>
              </div>
            }
          >
            <div className={styles.pdfDocument}>
              <Page
                pageNumber={pageNumber}
                width={viewerWidth ? Math.floor((viewerWidth - 64) * scale) : undefined}
                rotate={rotation}
                loading={<div className={`${styles.pdfPage} ${styles.animatePulse}`} />}
                className={styles.pdfPage}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          </Document>
        )}
      </div>

      {numPages > 0 && (
        <div className={styles.pagination}>
          <button onClick={goToPrevPage} disabled={pageNumber <= 1} className={styles.navButton}>
            <ChevronLeft size={16} />
            Previous
          </button>

          <div className={styles.pageInfo}>
            <LqText className={styles.pageNumber}>
              {pageNumber}{' '}
              <span className={`${styles.opacityMedium} ${styles.marginXSmall}`}>/</span> {numPages}
            </LqText>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(pageNumber / numPages) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className={styles.navButton}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFVariantViewer;
