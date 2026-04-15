import React from 'react';
import { PDFVariantViewer } from '../PDFVariantViewer';
import { DocumentAnnotationSystem } from '../DocumentAnnotationSystem';
import styles from './DocumentPDFTab.module.css';

// Design System
import { LqText } from '../../../design-system/components/typography/Text';
import { Surface } from '../../../design-system/components/surfaces/Surface';
import { Box } from '../../../design-system/components/layout/Box';

import { Button } from '../../../design-system/lib';

interface DocumentPDFTabProps {
  documentId: string;
  docId: string;
  content: string;
  searchTerm: string;
  openOriginalDocument: () => void;
  isEmail: boolean;
  metadata:
    | {
        from?: string;
        to?: string;
        subject?: string;
        [key: string]: unknown;
      }
    | null
    | undefined;
  title: string;
}

export const DocumentPDFTab: React.FC<DocumentPDFTabProps> = ({
  documentId,
  docId,
  content,
  searchTerm,
  openOriginalDocument,
  isEmail,
  metadata,
  title,
}) => {
  if (isEmail) {
    return (
      <Box className={styles.container}>
        <Surface variant="glass-highlight" className={styles.sectionPad}>
          <LqText variant="xs" weight="semibold" className={styles.sectionTitle}>
            Email Viewer
          </LqText>
          <Box className={styles.metaGrid}>
            <Box>
              <LqText variant="xs" weight="bold" className={styles.label}>
                From
              </LqText>
              <LqText variant="body" className={`${styles.value} ${styles.breakAll}`}>
                {metadata?.from || 'N/A'}
              </LqText>
            </Box>
            <Box>
              <LqText variant="xs" weight="bold" className={styles.label}>
                To
              </LqText>
              <LqText variant="body" className={`${styles.value} ${styles.breakAll}`}>
                {metadata?.to || 'N/A'}
              </LqText>
            </Box>
            <Box className={styles.colSpan2}>
              <LqText variant="xs" weight="bold" className={styles.label}>
                Subject
              </LqText>
              <LqText variant="body" className={styles.value}>
                {metadata?.subject || title || 'No subject'}
              </LqText>
            </Box>
          </Box>
          <Box mt="md">
            <Button
              unstyled
              type="button"
              onClick={openOriginalDocument}
              className={styles.controlButton}
            >
              Open Original Email Source
            </Button>
          </Box>
        </Surface>
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      <PDFVariantViewer documentId={documentId} className={styles.viewer} />
      <Surface variant="glass-highlight" className={styles.sectionPad}>
        <LqText variant="xs" weight="semibold" className={styles.sectionTitle}>
          Annotations
        </LqText>
        <DocumentAnnotationSystem
          documentId={String(docId || documentId)}
          content={content}
          searchTerm={searchTerm}
          mode="inline"
        />
      </Surface>
    </Box>
  );
};

export default DocumentPDFTab;
