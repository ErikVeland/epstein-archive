/**
 * Image Viewer Component
 *
 * Displays scanned documents and photos with zoom
 */

import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';
import styles from './ImageViewer.module.css';

import { Button } from '../../design-system/lib';

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
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <Button unstyled onClick={zoomOut} className={styles.iconButton} title="Zoom out">
            <ZoomOut className={styles.icon} />
          </Button>

          <span className={styles.zoomBadge}>{zoom}%</span>

          <Button unstyled onClick={zoomIn} className={styles.iconButton} title="Zoom in">
            <ZoomIn className={styles.icon} />
          </Button>

          <Button
            unstyled
            onClick={() => setFullscreen(!fullscreen)}
            className={styles.iconButton}
            title="Fullscreen"
          >
            <Maximize2 className={styles.icon} />
          </Button>
        </div>

        <Button unstyled className={styles.downloadButton}>
          <Download className={styles.downloadIcon} />
          Download Image
        </Button>
      </div>

      {/* Image Container */}
      <div
        className={`${styles.imageViewport} ${fullscreen ? styles.imageViewportFullscreen : styles.imageViewportWindowed}`}
      >
        <div className={styles.imageCenter}>
          <div className={styles.scaledImageWrap} style={{ transform: `scale(${zoom / 100})` }}>
            <img
              src={
                evidence.sourcePath.startsWith('/data/') || evidence.sourcePath.startsWith('data/')
                  ? evidence.sourcePath.replace(/^\/?(data\/)/, '/data/')
                  : `/data/${evidence.sourcePath.replace(/^.*\/data\//, '')}`
              }
              alt={evidence.originalFilename}
              className={styles.image}
            />
          </div>
        </div>
      </div>

      {/* Metadata & OCR Text */}
      <div className={styles.metadataSection}>
        {evidence.metadata && (
          <div className={styles.infoCard}>
            <h4 className={styles.cardTitle}>Image Info</h4>
            <div className={styles.infoGrid}>
              {evidence.metadata.width && evidence.metadata.height && (
                <div>
                  <div className={styles.infoLabel}>Dimensions</div>
                  <div className={styles.infoValue}>
                    {evidence.metadata.width} × {evidence.metadata.height}
                  </div>
                </div>
              )}
              {evidence.metadata.format && (
                <div>
                  <div className={styles.infoLabel}>Format</div>
                  <div className={`${styles.infoValue} ${styles.formatValue}`}>
                    {evidence.metadata.format}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {evidence.extractedText && evidence.extractedText.trim().length > 10 && (
          <div className={styles.ocrCard}>
            <h4 className={styles.cardTitle}>OCR Text</h4>
            <div className={styles.ocrText}>{evidence.extractedText}</div>
          </div>
        )}
      </div>
    </div>
  );
}
