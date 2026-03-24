/**
 * Image Viewer Component
 *
 * Displays scanned documents and photos with zoom
 */

import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

interface ImageViewerProps {
  evidence: {
    sourcePath: string;
    originalFilename: string;
    extractedText?: string;
    metadata: {
      width?: number;
      height?: number;
      format?: string;
    };
  };
}

export function ImageViewer({ evidence }: ImageViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  const zoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={zoomOut}
            className="p-2 text-[var(--text-primary)] bg-[var(--text-primary)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] hover:bg-[var(--app-bg)]"
            title="Zoom out"
          >
            <ZoomOut className="h-5 w-5" />
          </button>

          <span className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]">
            {zoom}%
          </span>

          <button
            onClick={zoomIn}
            className="p-2 text-[var(--text-primary)] bg-[var(--text-primary)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] hover:bg-[var(--app-bg)]"
            title="Zoom in"
          >
            <ZoomIn className="h-5 w-5" />
          </button>

          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-2 text-[var(--text-primary)] bg-[var(--text-primary)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] hover:bg-[var(--app-bg)]"
            title="Fullscreen"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>

        <button className="flex items-center px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--text-primary)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] hover:bg-[var(--app-bg)]">
          <Download className="h-4 w-4 mr-2" />
          Download Image
        </button>
      </div>

      {/* Image Container */}
      <div
        className={`bg-[var(--app-bg)] rounded-[var(--radius-lg)] overflow-auto ${fullscreen ? 'fixed inset-0 z-50 p-8' : 'max-h-[600px]'}`}
      >
        <div className="flex items-center justify-center min-h-full p-4">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}>
            <img
              src={
                evidence.sourcePath.startsWith('/data/') || evidence.sourcePath.startsWith('data/')
                  ? evidence.sourcePath.replace(/^\/?(data\/)/, '/data/')
                  : `/data/${evidence.sourcePath.replace(/^.*\/data\//, '')}`
              }
              alt={evidence.originalFilename}
              className="max-w-full h-auto shadow-[var(--glass-shadow)]"
            />
          </div>
        </div>
      </div>

      {/* Metadata & OCR Text */}
      <div className="mt-6 space-y-4">
        {evidence.metadata && (
          <div className="p-4 bg-[var(--app-bg)] rounded-[var(--radius-lg)]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Image Info</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {evidence.metadata.width && evidence.metadata.height && (
                <div>
                  <div className="text-[var(--text-primary)]">Dimensions</div>
                  <div className="text-[var(--text-primary)]">
                    {evidence.metadata.width} × {evidence.metadata.height}
                  </div>
                </div>
              )}
              {evidence.metadata.format && (
                <div>
                  <div className="text-[var(--text-primary)]">Format</div>
                  <div className="text-[var(--text-primary)] uppercase">
                    {evidence.metadata.format}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {evidence.extractedText && evidence.extractedText.trim().length > 10 && (
          <div className="p-4 bg-[var(--text-primary)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]">
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-2">OCR Text</h4>
            <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
              {evidence.extractedText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
