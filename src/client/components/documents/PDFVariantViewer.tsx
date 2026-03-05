import React, { useState, useEffect, useRef } from 'react';
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
  const [docMeta, setDocMeta] = useState<{
    fileName?: string;
    filePath?: string;
    originalFilePath?: string;
    cleanedPath?: string;
    mimeType?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const fetchDoc = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const primaryRes = await fetch(`/api/documents/${documentId}`);
        const fallbackRes = !primaryRes.ok ? await fetch(`/api/evidence/${documentId}`) : null;
        const res = primaryRes.ok ? primaryRes : fallbackRes;

        if (!res || !res.ok) {
          setError('Failed to fetch document metadata');
          return;
        }

        const data = await res.json();
        setDocMeta({
          fileName: data.fileName || data.file_name,
          filePath: data.filePath || data.file_path,
          originalFilePath: data.originalFilePath || data.original_file_path,
          cleanedPath: data.cleanedPath || data.cleaned_path,
          mimeType: data.mimeType || data.mime_type || data.fileType || data.file_type,
        });
      } catch (err) {
        console.error('Error fetching document metadata:', err);
        setError('Error connecting to API');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoc();
  }, [documentId]);

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
    <div className={`flex flex-col h-full bg-slate-900 overflow-hidden ${className}`}>
      {showToolbar && (
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Find in page..."
                className="pl-9 pr-3 py-1.5 bg-slate-950/50 border border-slate-700 rounded-md text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border-r border-slate-700 pr-3 mr-1">
              <button
                onClick={zoomOut}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-slate-500 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={rotateClockwise}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div ref={viewerRef} className="flex-1 overflow-auto bg-slate-900 custom-scrollbar relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium animate-pulse">Initializing Viewer...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-rose-400 p-8 text-center">
            <Fingerprint className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold mb-2">Access Error</p>
            <p className="text-xs text-rose-300/60 max-w-xs">{error}</p>
          </div>
        ) : !currentUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold mb-2 text-slate-300">No Asset Linked</p>
            <p className="text-xs text-slate-500 max-w-xs">
              This record exists in the index but no PDF asset has been processed for the selected
              variant.
            </p>
          </div>
        ) : assetType === 'image' ? (
          <div className="flex items-center justify-center p-6">
            <img
              src={currentUrl}
              alt={docMeta?.fileName || `Document ${documentId}`}
              className="max-w-full max-h-[calc(100vh-380px)] object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
            />
          </div>
        ) : assetType !== 'pdf' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold mb-2 text-slate-300">Preview unavailable</p>
            <p className="text-xs text-slate-500 max-w-xs">
              This asset is not a PDF. Open the original file from the document actions.
            </p>
          </div>
        ) : (
          <Document
            file={currentUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="w-6 h-6 border-2 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin mb-3" />
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
                  <div className="h-[800px] w-full bg-slate-800/20 animate-pulse rounded-lg" />
                }
                className="shadow-2xl ring-1 ring-white/10"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          </Document>
        )}
      </div>

      {numPages > 0 && (
        <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-slate-100">
              {pageNumber} <span className="text-slate-500 mx-1">/</span> {numPages}
            </span>
            <div className="w-32 h-1 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${(pageNumber / numPages) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
