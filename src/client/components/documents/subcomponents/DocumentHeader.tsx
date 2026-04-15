import React from 'react';
import { Calendar, Download, FileText, Search, ArrowLeft } from 'lucide-react';
import { CloseButton } from '../../common/CloseButton';
import { formatDate } from '../DocumentModalUtils';
import styles from './DocumentHeader.module.css';
import { LqText } from '../../../design-system/components/typography/Text';
import { Flex } from '../../../design-system/components/layout/Flex';
import { Surface } from '../../../design-system/components/surfaces/Surface';
import { Box } from '../../../design-system/components/layout/Box';

import { Button, Input } from '../../../design-system/lib';

interface DocumentHeaderProps {
  doc: {
    title?: string | null;
    fileName?: string | null;
    evidenceType?: string | null;
    fileType?: string | null;
    dateModified?: string | null;
    updatedAt?: string | null;
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
          <FileText size={28} className={styles.fileIcon} />
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
              <Calendar size={14} className={styles.calendarIcon} />
              {formatDate(doc.dateModified || doc.updatedAt || doc.dateModified)}
            </LqText>
          </Flex>
        </Box>
      </Flex>

      <Flex align="center" gap="sm" className={styles.controls}>
        <Box className={`${styles.searchWrapper} group`}>
          <Search size={16} className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="Find in record..."
            className={styles.searchInput}
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="document_record_search"
          />
        </Box>

        {canReturnToCase && (
          <Button unstyled onClick={handleBackToCase} className={styles.backButton}>
            <ArrowLeft size={16} className={styles.backButtonIcon} />
            <span className={styles.backButtonLabel}>Case</span>
          </Button>
        )}
        <Button
          unstyled
          onClick={downloadOriginalDocument}
          className={`${styles.iconButton} ${styles.downloadButton}`}
          title="Download Original Document"
        >
          <Download size={20} />
        </Button>
        <CloseButton onClick={onClose} size="md" label="Close" className={styles.closeButton} />
      </Flex>
    </Box>
  );
};

export default DocumentHeader;
