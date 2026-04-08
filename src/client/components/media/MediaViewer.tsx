import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { cn } from '@client/utils/cn';
import styles from './MediaViewer.module.css';

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
          className={styles.pdfFrame}
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
        <div className={styles.imageStage}>
          <img
            src={filePath}
            alt={fileName}
            className={styles.image}
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
      <div className={styles.unavailable}>
        <div className={styles.unavailableBody}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={styles.stateIcon}
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
          <h3 className={styles.stateTitle}>File Preview Unavailable</h3>
          <p className={styles.stateMessage}>This file type cannot be previewed in the browser.</p>
        </div>
        {!inline && (
          <a href={filePath} download={fileName} className={styles.downloadLink}>
            <Download className={styles.buttonIcon} />
            Download File
          </a>
        )}
      </div>
    );
  };

  const content = (
    <div className={cn(styles.viewer, inline ? styles.viewerInline : styles.viewerOverlay)}>
      {/* Header */}
      <div className={cn('app-header-glass', styles.header, inline && styles.headerInline)}>
        <div className={styles.headerMeta}>
          <div className={styles.fileIconBox}>
            {isPdf ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={cn(styles.fileIcon, styles.fileIconPdf)}
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
                className={cn(styles.fileIcon, styles.fileIconImage)}
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
                className={cn(styles.fileIcon, styles.fileIconGeneric)}
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
            <h2 className={styles.fileName}>{fileName}</h2>
            <p className={styles.fileType}>{fileType || 'document'}</p>
          </div>
        </div>
        <div className={styles.controls}>
          {!isPdf && isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className={styles.iconButton}
                disabled={zoom <= 0.5}
                title="Zoom Out"
              >
                <ZoomOut className={styles.controlIcon} />
              </button>
              <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className={styles.iconButton}
                disabled={zoom >= 3}
                title="Zoom In"
              >
                <ZoomIn className={styles.controlIcon} />
              </button>
              <button onClick={handleRotate} className={styles.iconButton} title="Rotate">
                <RotateCw className={styles.controlIcon} />
              </button>
            </>
          )}
          {!inline && (
            <>
              <button onClick={handleDownload} className={styles.iconButton} title="Download">
                <Download className={styles.controlIcon} />
              </button>
              <CloseButton
                onClick={onClose}
                size="sm"
                label="Close media viewer"
                className={styles.closeButton}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.body}>
        {/* Loading Spinner Overlay */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingContent}>
              <div className={styles.spinner}></div>
              <p className={styles.loadingText}>Loading media...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error ? (
          <div className={styles.errorState}>
            <div className={styles.errorBody}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={cn(styles.stateIcon, styles.errorIcon)}
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
              <h3 className={styles.stateTitle}>Error Loading Media</h3>
              <p className={styles.stateMessage}>{error}</p>
              {!inline && (
                <button onClick={onClose} className={styles.secondaryButton}>
                  Close Viewer
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Media Content - Always rendered to allow loading to start */
          <div
            className={cn(
              styles.mediaContent,
              isLoading ? styles.mediaContentHidden : styles.mediaContentVisible,
              !isImage && styles.mediaContentPadded,
            )}
          >
            {renderMedia()}
          </div>
        )}
      </div>

      {/* Footer - only show if NOT inline */}
      {!inline && (
        <div className={styles.footer}>
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
