/**
 * PDF Viewer Component
 *
 * Displays PDF files with navigation controls and basic features
 */

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up worker for PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto"
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
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Unable to Load PDF
        </h3>
        <p className="text-[var(--text-primary)] mb-4">{error}</p>
        <button
          onClick={loadPDF}
          className="px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-[var(--app-bg)] border-b border-[var(--glass-border)]">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate max-w-md">
            {title}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={downloadPDF}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--app-bg)] rounded-[var(--radius-lg)] transition-colors"
            title="Download PDF"
          >
            <Download className="h-5 w-5" />
          </button>

          <div className="h-6 w-px bg-[var(--app-bg)]"></div>

          <button
            onClick={zoomOut}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--app-bg)] rounded-[var(--radius-lg)] transition-colors"
            disabled={scale <= 0.5}
            title="Zoom Out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>

          <span className="text-sm text-[var(--text-primary)] min-w-[40px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={zoomIn}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--app-bg)] rounded-[var(--radius-lg)] transition-colors"
            disabled={scale >= 3}
            title="Zoom In"
          >
            <ZoomIn className="h-5 w-5" />
          </button>

          <div className="h-6 w-px bg-[var(--app-bg)]"></div>

          <button
            onClick={rotate}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] hover:bg-[var(--app-bg)] rounded-[var(--radius-lg)] transition-colors"
            title="Rotate"
          >
            <RotateCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation and PDF Display */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page navigation */}
        <div className="flex items-center justify-between p-2 bg-[var(--app-bg)] border-b border-[var(--glass-border)]">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous Page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="text-sm text-[var(--text-primary)]">
            Page {pageNumber} of {numPages || '--'}
          </span>

          <button
            onClick={goToNextPage}
            disabled={!numPages || pageNumber >= numPages}
            className="p-2 text-[var(--text-primary)] hover:text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next Page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-[var(--app-bg)] flex items-center justify-center p-4">
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mb-4"></div>
              <p className="text-[var(--text-primary)]">Loading PDF...</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <Document
                file={`/api/media/pdf?filePath=${encodeURIComponent(filePath)}`}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mb-4"></div>
                    <p className="text-[var(--text-primary)]">Loading PDF...</p>
                  </div>
                }
                error={
                  <div className="text-red-500 p-4 text-center">Failed to load PDF document</div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-[var(--glass-shadow)]"
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
