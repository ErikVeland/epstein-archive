import React from 'react';
import Icon from '@client/components/common/Icon';
import { ProvenanceBadge } from '@client/components/common/ProvenanceBadge';
import { CloseButton } from '@client/components/common/CloseButton';
import type { ExtractionMethod, ProvenanceStatus, ReviewState } from '@shared/dto/provenance';
import { formatDate } from '../DocumentModalUtils';
import styles from './DocumentHeader.module.css';
import { LqText } from '@client/design-system/components/typography/Text';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';

import { Button, SearchField } from '@client/design-system/lib';

interface DocumentHeaderProps {
  doc: {
    title?: string | null;
    fileName?: string | null;
    evidenceType?: string | null;
    fileType?: string | null;
    dateModified?: string | null;
    updatedAt?: string | null;
    sourceDocumentId?: number | null;
    sourceHash?: string | null;
    extractionMethod?: ExtractionMethod | null;
    confidence?: number | null;
    reviewState?: ReviewState;
    provenanceStatus?: ProvenanceStatus;
  };
  localSearchTerm: string;
  setLocalSearchTerm: (value: string) => void;
  canReturnToCase: boolean;
  handleBackToCase: () => void;
  downloadOriginalDocument: () => void;
  onClose: () => void;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  doc,
  localSearchTerm,
  setLocalSearchTerm,
  canReturnToCase,
  handleBackToCase,
  downloadOriginalDocument,
  onClose,
}) => {
  return (
    <Box className={styles.header}>
      <Flex align="start" gap="md" className={styles.titleGroup}>
        <Surface variant="glass-highlight" className={styles.iconBox}>
          <Icon name="FileText" size="xl" className={styles.fileIcon} />
        </Surface>
        <Box className={styles.titleMeta}>
          <LqText
            variant="h2"
            weight="medium"
            id="document-modal-title"
            className={styles.docTitle}
          >
            {doc.title || doc.fileName}
          </LqText>
          <Flex align="center" gap="md" className={styles.badgeRow}>
            <span
              className={`${styles.typeBadge} ${
                doc.evidenceType === 'email' ? styles.emailTypeBadge : styles.defaultTypeBadge
              }`}
            >
              {doc.evidenceType || doc.fileType || 'Unclassified Record'}
            </span>
            <LqText variant="xs" weight="bold" className={styles.dateBadge}>
              <Icon name="Calendar" size="sm" className={styles.calendarIcon} />
              {formatDate(doc.dateModified || doc.updatedAt || doc.dateModified)}
            </LqText>
            <ProvenanceBadge
              sourceDocumentId={doc.sourceDocumentId}
              sourceHash={doc.sourceHash}
              reviewState={doc.reviewState}
              confidence={doc.confidence}
              extractionMethod={doc.extractionMethod}
              provenanceStatus={doc.provenanceStatus}
              showLabel={false}
            />
          </Flex>
        </Box>
      </Flex>

      <Flex align="center" gap="sm" className={styles.controls}>
        <SearchField
          placeholder="Find in record..."
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          density="comfortable"
          rootClassName={styles.searchFieldRoot}
        />

        {canReturnToCase && (
          <Button unstyled onClick={handleBackToCase} className={styles.backButton}>
            <Icon name="ArrowLeft" size="sm" className={styles.backButtonIcon} />
            <span className={styles.backButtonLabel}>Case</span>
          </Button>
        )}
        <Button
          unstyled
          onClick={downloadOriginalDocument}
          className={`${styles.iconButton} ${styles.downloadButton}`}
          title="Download Original Document"
        >
          <Icon name="Download" size="md" />
        </Button>
        <CloseButton onClick={onClose} size="md" label="Close" className={styles.closeButton} />
      </Flex>
    </Box>
  );
};

export default DocumentHeader;
