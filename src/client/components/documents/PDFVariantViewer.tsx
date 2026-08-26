import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Document, Page } from 'react-pdf';
import Icon from '@client/components/common/Icon';
import styles from './PDFVariantViewer.module.css';

import { Button, SearchField } from '@client/design-system/lib';
import { ensurePdfWorker } from '@client/utils/ensurePdfWorker';
import { LqText } from '@client/design-system/components/typography/Text';
import type { PublicDocumentAnnotation } from '@shared/dto/annotations';
import { PDFAnnotationOverlay } from './PDFAnnotationOverlay';

ensurePdfWorker();

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const PASSAGE_LOCATION_PARAMS = [
  'passage',
  'assetSha256',
  'pageId',
  'sentenceId',
  'textSha256',
  'q',
] as const;

interface PDFVariantViewerProps {
  documentId: string;
  className?: string;
  showToolbar?: boolean;
  /** Annotations to render as translucent overlays on the current PDF page. */
  annotations?: PublicDocumentAnnotation[];
  /** When true, annotation overlays are visible. Defaults to false. */
  showAnnotations?: boolean;
}

export const PDFVariantViewer: React.FC<PDFVariantViewerProps> = ({
  documentId,
  className = '',
  showToolbar = true,
  annotations = [],
  showAnnotations = false,
}) => {
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();
  const requestedPage = useMemo(() => {
    const parsed = Number(urlSearchParams.get('page'));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
  }, [urlSearchParams]);
  const requestedAssetSha256 = useMemo(() => {
    const value = urlSearchParams.get('assetSha256');
    return value && SHA256_PATTERN.test(value) ? value.toLowerCase() : null;
  }, [urlSearchParams]);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(requestedPage);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewerWidth, setViewerWidth] = useState<number>(0);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageNumber(numPages > 0 ? Math.min(requestedPage, numPages) : requestedPage);
  }, [documentId, numPages, requestedPage]);

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
      const encodedId = encodeURIComponent(String(documentId));
      const primaryRes = await fetch(`/api/documents/${encodedId}`);
      const fallbackRes = !primaryRes.ok ? await fetch(`/api/evidence/${encodedId}`) : null;
      const res = primaryRes.ok ? primaryRes : fallbackRes;
      if (!res || !res.ok) throw new Error('Failed to fetch document metadata');
      const data = (await res.json()) as Record<string, unknown>;
      return {
        fileName: (data.fileName || data.file_name) as string | undefined,
        filePath: (data.filePath || data.file_path) as string | undefined,
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
    setPageNumber(Math.min(requestedPage, numPages));
  };

  const selectPage = useCallback(
    (nextPage: number) => {
      const boundedPage = Math.max(1, numPages > 0 ? Math.min(numPages, nextPage) : nextPage);
      setPageNumber(boundedPage);
      setUrlSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('page', String(boundedPage));
          PASSAGE_LOCATION_PARAMS.forEach((param) => next.delete(param));
          return next;
        },
        { replace: true },
      );
    },
    [numPages, setUrlSearchParams],
  );

  const goToPrevPage = () => selectPage(pageNumber - 1);
  const goToNextPage = () => selectPage(pageNumber + 1);
  const zoomIn = () => setScale((prev) => Math.min(3.0, prev + 0.2));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));
  const rotateClockwise = () => setRotation((prev) => (prev + 90) % 360);

  const inferAssetType = () => {
    const mime = String(docMeta?.mimeType || '').toLowerCase();
    if (mime.includes('pdf')) return 'pdf';
    if (mime.startsWith('image/')) return 'image';

    const candidatePath = String(docMeta?.fileName || docMeta?.filePath || '').toLowerCase();
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
    const params = new URLSearchParams({ variant: 'original' });
    if (requestedAssetSha256) params.set('assetSha256', requestedAssetSha256);
    return `/api/documents/${encodeURIComponent(String(documentId))}/file?${params.toString()}`;
  };

  const currentUrl = getCurrentUrl();
  const assetType = inferAssetType();

  return (
    <div className={`${styles.root} ${className}`}>
      {showToolbar && (
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <SearchField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find in page..."
              density="compact"
              rootClassName={styles.searchFieldRoot}
            />
          </div>

          <div className={styles.toolGroup}>
            <div className={styles.zoomControls}>
              <Button unstyled onClick={zoomOut} className={styles.toolButton} title="Zoom Out">
                <Icon name="ZoomOut" size="sm" />
              </Button>
              <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
              <Button unstyled onClick={zoomIn} className={styles.toolButton} title="Zoom In">
                <Icon name="ZoomIn" size="sm" />
              </Button>
            </div>
            <Button unstyled onClick={rotateClockwise} className={styles.toolButton} title="Rotate">
              <Icon name="RotateCw" size="sm" />
            </Button>
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
            <Icon
              name="Fingerprint"
              size="xl"
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
            <Icon
              name="Info"
              size="xl"
              className={`${styles.marginBottomMedium} ${styles.opacityLow}`}
            />
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
            <Icon
              name="Info"
              size="xl"
              className={`${styles.marginBottomMedium} ${styles.opacityLow}`}
            />
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
                <Icon
                  name="Fingerprint"
                  size="xl"
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
              <div className={styles.pageWrapper}>
                <Page
                  pageNumber={pageNumber}
                  width={viewerWidth ? Math.floor((viewerWidth - 64) * scale) : undefined}
                  rotate={rotation}
                  loading={<div className={`${styles.pdfPage} ${styles.animatePulse}`} />}
                  className={styles.pdfPage}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                {annotations && annotations.length > 0 && (
                  <PDFAnnotationOverlay
                    annotations={annotations}
                    pageNumber={pageNumber}
                    visible={showAnnotations}
                  />
                )}
              </div>
            </div>
          </Document>
        )}
      </div>

      {numPages > 0 && (
        <div className={styles.pagination}>
          <Button
            unstyled
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className={styles.navButton}
          >
            <Icon name="ChevronLeft" size="sm" />
            Previous
          </Button>

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

          <Button
            unstyled
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className={styles.navButton}
          >
            Next
            <Icon name="ChevronRight" size="sm" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFVariantViewer;
