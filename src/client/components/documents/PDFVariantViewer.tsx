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
    <div
      className={`flex flex-col h-full bg-[var(--glass-bg-strong)] overflow-hidden ${className}`}
    >
      {showToolbar && (
        <div className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)] px-4 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find in page..."
                className="pl-9 pr-3 py-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-[var(--accent)]/50 w-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border-r border-[var(--glass-border)] pr-3 mr-1">
              <button
                onClick={zoomOut}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-[var(--text-muted)] w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={rotateClockwise}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={viewerRef}
        className="flex-1 overflow-auto bg-[var(--glass-bg-strong)] custom-scrollbar relative"
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
            <div className="w-8 h-8 border-2 border-[var(--accent)]/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium animate-pulse">Initializing Viewer...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-400 p-8 text-center">
            <Fingerprint className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold mb-2">Access Error</p>
            <p className="text-xs text-rose-300/60 max-w-xs">{error}</p>
          </div>
        ) : !currentUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold mb-2 text-[var(--text-secondary)]">No Asset Linked</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              This record exists in the index but no PDF asset has been processed for the selected
              variant.
            </p>
          </div>
        ) : assetType === 'image' ? (
          <div className="flex items-center justify-center p-6">
            <img
              src={currentUrl}
              alt={docMeta?.fileName || `Document ${documentId}`}
              className="max-w-full max-h-[calc(100vh-380px)] object-contain rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] ring-1 ring-[var(--glass-border)]"
            />
          </div>
        ) : assetType !== 'pdf' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] p-8 text-center">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold mb-2 text-[var(--text-secondary)]">Preview unavailable</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs">
              This asset is not a PDF. Open the original file from the document actions.
            </p>
          </div>
        ) : (
          <Document
            file={currentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                <div className="w-6 h-6 border-2 border-[var(--accent)]/10 border-t-cyan-500 rounded-full animate-spin mb-3" />
                <span className="text-xs font-medium">Loading document...</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center py-20 text-rose-400">
                <Fingerprint className="w-10 h-10 mb-3 opacity-30" />
                <span className="text-sm font-bold text-rose-300">PDF Rendering Failed</span>
                <span className="text-[10px] text-rose-400/60 mt-1">
                  Resource may be temporarily unavailable
                </span>
              </div>
            }
          >
            <div className="flex justify-center p-8">
              <Page
                pageNumber={pageNumber}
                width={viewerWidth ? Math.floor((viewerWidth - 64) * scale) : undefined}
                rotate={rotation}
                loading={
                  <div className="h-[800px] w-full bg-[var(--glass-bg)]/20 animate-pulse rounded-[var(--radius-lg)]" />
                }
                className="shadow-[var(--glass-shadow)] ring-1 ring-[var(--glass-border)]"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          </Document>
        )}
      </div>

      {numPages > 0 && (
        <div className="bg-[var(--glass-bg)]/80 backdrop-blur-md border-t border-[var(--glass-border)] px-6 py-3 flex items-center justify-between shrink-0">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="flex items-center gap-2 px-4 py-1.5 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] disabled:opacity-30 disabled:hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-all text-xs font-bold uppercase tracking-wider"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {pageNumber} <span className="text-[var(--text-muted)] mx-1">/</span> {numPages}
            </span>
            <div className="w-32 h-1 bg-[var(--glass-bg-highlight)] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${(pageNumber / numPages) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-2 px-4 py-1.5 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] disabled:opacity-30 disabled:hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-all text-xs font-bold uppercase tracking-wider"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
