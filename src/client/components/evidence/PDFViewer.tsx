/**
 * PDF Viewer Component
 *
 * Displays PDF files with navigation controls and basic features
 */

import { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from './PDFViewer.module.css';

import { Button } from '../../design-system/lib';
import { ensurePdfWorker } from '../../utils/ensurePdfWorker';

// Set up worker for PDF.js
ensurePdfWorker();

interface PDFViewerProps {
  filePath: string;
  title: string;
}

export function PDFViewer({ filePath, title }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load PDF from local file path
  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // For local files, we need to serve them through the API
      // The filePath will be converted to an API endpoint
      const apiUrl = `/api/media/pdf?filePath=${encodeURIComponent(filePath)}`;

      // Test if the file is accessible
      const response = await fetch(apiUrl, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`PDF not accessible: ${response.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadPDF is stable and only depends on filePath
  }, [filePath]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError(error.message);
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => (numPages ? Math.min(prev + 1, numPages) : prev));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = `/api/media/pdf?filePath=${encodeURIComponent(filePath)}`;
    link.download = title + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIconWrap}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={styles.errorIcon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className={styles.errorTitle}>Unable to Load PDF</h3>
        <p className={styles.errorText}>{error}</p>
        <Button unstyled onClick={loadPDF} className={styles.retryButton}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <h2 className={styles.title}>{title}</h2>
        </div>

        <div className={styles.toolbarGroup}>
          <Button unstyled onClick={downloadPDF} className={styles.iconButton} title="Download PDF">
            <Download className={styles.icon} />
          </Button>

          <div className={styles.divider} />

          <Button
            unstyled
            onClick={zoomOut}
            className={`${styles.iconButton} ${scale <= 0.5 ? styles.iconButtonDisabled : ''}`}
            disabled={scale <= 0.5}
            title="Zoom Out"
          >
            <ZoomOut className={styles.icon} />
          </Button>

          <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>

          <Button
            unstyled
            onClick={zoomIn}
            className={`${styles.iconButton} ${scale >= 3 ? styles.iconButtonDisabled : ''}`}
            disabled={scale >= 3}
            title="Zoom In"
          >
            <ZoomIn className={styles.icon} />
          </Button>

          <div className={styles.divider} />

          <Button unstyled onClick={rotate} className={styles.iconButton} title="Rotate">
            <RotateCw className={styles.icon} />
          </Button>
        </div>
      </div>

      {/* Navigation and PDF Display */}
      <div className={styles.body}>
        {/* Page navigation */}
        <div className={styles.navBar}>
          <Button
            unstyled
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className={`${styles.iconButton} ${pageNumber <= 1 ? styles.iconButtonDisabled : ''}`}
            title="Previous Page"
          >
            <ChevronLeft className={styles.icon} />
          </Button>

          <span className={styles.pageLabel}>
            Page {pageNumber} of {numPages || '--'}
          </span>

          <Button
            unstyled
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className={`${styles.iconButton} ${!numPages || pageNumber >= numPages ? styles.iconButtonDisabled : ''}`}
            title="Next Page"
          >
            <ChevronRight className={styles.icon} />
          </Button>
        </div>

        {/* PDF Content */}
        <div className={styles.viewerArea}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p className={styles.loadingText}>Loading PDF...</p>
            </div>
          ) : (
            <div className={styles.viewerCenter}>
              <Document
                file={`/api/media/pdf?filePath=${encodeURIComponent(filePath)}`}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className={styles.loadingState}>
                    <div className={styles.spinner} />
                    <p className={styles.loadingText}>Loading PDF...</p>
                  </div>
                }
                error={<div className={styles.documentError}>Failed to load PDF document</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className={styles.page}
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
