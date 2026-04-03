import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';

interface MediaViewerProps {
  filePath: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
  inline?: boolean;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  filePath,
  fileName,
  fileType,
  onClose,
  inline = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useScrollLock(!inline);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPdf = fileType === 'pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].some(
    (ext) => fileType === ext || fileName.toLowerCase().endsWith('.' + ext),
  );

  const [prevFilePath, setPrevFilePath] = useState(filePath);
  if (filePath !== prevFilePath) {
    setPrevFilePath(filePath);
    setZoom(1);
    setRotation(0);
    const isSupported = isPdf || isImage;
    if (!isSupported) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }

  const renderMedia = () => {
    if (isPdf) {
      return (
        <iframe
          src={`${filePath}#toolbar=0&navpanes=0&scrollbar=0`}
          className="w-full h-full border-0"
          title={`PDF Viewer - ${fileName}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setError('Failed to load PDF document');
          }}
        />
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center w-full h-full overflow-auto bg-[var(--glass-bg-strong)]">
          <img
            src={filePath}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease',
            }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load image');
            }}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-center p-8">
        <div className="text-[var(--text-muted)] mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-semibold mb-2">File Preview Unavailable</h3>
          <p className="mb-4">This file type cannot be previewed in the browser.</p>
        </div>
        {!inline && (
          <a
            href={filePath}
            download={fileName}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-blue-700 text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download File
          </a>
        )}
      </div>
    );
  };

  const content = (
    <div
      className={`${inline ? 'relative w-full h-full' : 'fixed inset-0 bg-[var(--glass-bg-strong)] bg-opacity-90 z-[var(--z-modal)]'} flex flex-col`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 app-header-glass z-20 ${inline ? 'py-2 px-4' : ''}`}
      >
        <div className="flex items-center gap-3">
          <div className="bg-[var(--glass-bg)] p-2 rounded-[var(--radius-md)]">
            {isPdf ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            ) : isImage ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[var(--accent)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate max-w-md">
              {fileName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] capitalize">
              {fileType || 'document'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPdf && isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-md)] transition-colors"
                disabled={zoom <= 0.5}
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-[var(--text-muted)] text-sm mx-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-md)] transition-colors"
                disabled={zoom >= 3}
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-md)] transition-colors"
                title="Rotate"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </>
          )}
          {!inline && (
            <>
              <button
                onClick={handleDownload}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-md)] transition-colors"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <CloseButton
                onClick={onClose}
                size="sm"
                label="Close media viewer"
                className="bg-transparent hover:bg-[var(--glass-bg-highlight)] border-[var(--glass-border)]"
              />
            </>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-[var(--app-bg)]">
        {/* Loading Spinner Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--app-bg)] z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)] mb-4"></div>
              <p className="text-[var(--text-muted)]">Loading media...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center text-red-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="text-xl font-semibold mb-2">Error Loading Media</h3>
              <p className="mb-4">{error}</p>
              {!inline && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors"
                >
                  Close Viewer
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Media Content - Always rendered to allow loading to start */
          <div
            className={`w-full h-full ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity ${isImage ? '' : 'p-4'}`}
          >
            {renderMedia()}
          </div>
        )}
      </div>

      {/* Footer - only show if NOT inline */}
      {!inline && (
        <div className="p-3 bg-[var(--glass-bg-strong)] border-t border-[var(--glass-border)] text-center text-sm text-[var(--text-muted)]">
          {isPdf ? 'PDF Document Viewer' : isImage ? 'Image Viewer' : 'File Viewer'} • {fileName}
        </div>
      )}
    </div>
  );

  // Render via portal if not inline, otherwise just render content
  if (inline) return content;
  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};

export default MediaViewer;
