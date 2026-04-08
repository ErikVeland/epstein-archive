import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import styles from './DocumentUploader.module.css';

// Design System
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';

import { DocumentProcessor } from '../../services/documentProcessor';

interface DocumentUploaderProps {
  processor: DocumentProcessor;
  onDocumentsLoaded: (count: number) => void;
  showUpload?: boolean; // Control visibility of upload functionality
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  processor,
  onDocumentsLoaded,
  showUpload = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) =>
        file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'),
    );

    if (files.length === 0) {
      setError('Please drop text files (.txt, .md) only');
      setUploadStatus('error');
      return;
    }

    await processFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (file) =>
        file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'),
    );

    if (files.length === 0) {
      setError('Please select text files (.txt, .md) only');
      setUploadStatus('error');
      return;
    }

    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    setUploadStatus('processing');
    setError('');
    setProcessedCount(0);

    try {
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const content = await file.text();
          return {
            path: file.name,
            content: content,
          };
        }),
      );

      const documents = await processor.processDocumentBatch(fileContents);
      setProcessedCount(documents.length);
      setUploadStatus('success');
      onDocumentsLoaded(documents.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process documents');
      setUploadStatus('error');
    }
  };

  const resetUploader = () => {
    setUploadStatus('idle');
    setError('');
    setProcessedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box className={styles.root}>
      <Flex align="center" gap="sm" className={styles.marginBottomMedium}>
        <Upload size={20} className={styles.iconAccent} />
        <LqText variant="h3" weight="bold">
          Document Ingestion
        </LqText>
      </Flex>

      {!showUpload && (
        <Box className={styles.warningBox}>
          <LqText variant="xs" color="accent" weight="bold">
            Ingestion restricted to administrators. Contact auth-svc if you need to upload.
          </LqText>
        </Box>
      )}

      {uploadStatus === 'idle' && showUpload && (
        <Box>
          <div
            className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneHover : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Box className={styles.uploadIconContainer}>
              <FileText size={32} />
            </Box>
            <LqText variant="body" weight="bold" className={styles.uploadTitle}>
              Drag and drop forensic text archives
            </LqText>
            <LqText variant="xs" color="muted" className={styles.uploadHint}>
              Supported formats: .txt, .md. Files will be parsed and enriched via the intelligence
              pipeline.
            </LqText>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md"
            onChange={handleFileSelect}
            className={styles.hidden}
          />
          <LqText variant="xs" color="muted" className={styles.marginTop2}>
            Supported formats: .txt, .md files. Upload actual Epstein documents to analyse them.
          </LqText>
        </Box>
      )}

      {uploadStatus === 'processing' && showUpload && (
        <Box className={styles.statusContainer}>
          <Box className={styles.spinner} />
          <LqText variant="body" weight="bold" className={styles.animatePulse}>
            Processing Documents...
          </LqText>
          <LqText
            variant="xs"
            color="muted"
            className={`${styles.marginTop2} ${styles.textCenter}`}
          >
            Analyzing content and extracting entity signatures
          </LqText>
        </Box>
      )}

      {uploadStatus === 'success' && showUpload && (
        <Box className={styles.statusContainer}>
          <CheckCircle size={48} className={`text-[var(--accent-success)] ${styles.statusIcon}`} />
          <LqText variant="h3" weight="bold">
            Ingestion Successful
          </LqText>
          <LqText variant="body" color="secondary" className={styles.marginTop1}>
            Processed {processedCount} documents
          </LqText>
          <button onClick={resetUploader} className={styles.uploadButton}>
            Upload More
          </button>
        </Box>
      )}

      {uploadStatus === 'error' && showUpload && (
        <Box className={styles.statusContainer}>
          <AlertCircle size={48} className={`text-[var(--accent-danger)] ${styles.statusIcon}`} />
          <LqText variant="h3" weight="bold" color="accent">
            Ingestion Error
          </LqText>
          <LqText variant="xs" color="muted" className={styles.marginTop1}>
            {error}
          </LqText>
          <button onClick={resetUploader} className={styles.uploadButton}>
            Try Again
          </button>
        </Box>
      )}
    </Box>
  );
};

export default DocumentUploader;
