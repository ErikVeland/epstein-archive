import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import styles from './DocumentHoverPreview.module.css';

// Design System
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { LqText } from '../../design-system/components/typography/Text';

import { Document } from '../../types/documents';
import { getSafePreviewText, getSourceLabel, formatDate } from '../../utils/documentUtils';

interface DocumentHoverPreviewProps {
  doc: Document;
  rect: DOMRect;
}

export const DocumentHoverPreview: React.FC<DocumentHoverPreviewProps> = ({ doc, rect }) => {
  const displayTitle = doc.title || doc.filename || 'Untitled document';
  const previewText = getSafePreviewText(doc);

  // Calculate position
  const x = rect.right + 20 + 420 > window.innerWidth ? rect.left - 420 - 20 : rect.right + 20;
  // Center vertically relative to the card if possible
  const y = Math.max(20, Math.min(window.innerHeight - 500, rect.top + rect.height / 2 - 200));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: x < rect.left ? 10 : -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: x < rect.left ? 10 : -10 }}
      style={{ left: x, top: y }}
      className="fixed z-[100] w-[420px] pointer-events-none"
    >
      <Surface variant="glass-strong" className={styles.root}>
        <Box className={styles.header}>
          <Flex align="center" gap="sm" className={styles.marginBottomSmall}>
            <FileText size={16} className={styles.iconAccent} />
            <LqText
              variant="xs"
              weight="black"
              color="accent"
              className={`${styles.textUppercase} ${styles.trackingWidest}`}
            >
              Document Brief
            </LqText>
          </Flex>
          <LqText variant="h3" weight="bold" color="primary" className={styles.leadingTight}>
            {displayTitle}
          </LqText>
        </Box>

        <Box className={styles.content}>
          <Box className={styles.metadataGrid}>
            <Surface variant="glass-highlight" className={styles.metadataTag}>
              <LqText variant="xs" color="secondary" weight="medium">
                {doc.evidenceType || doc.fileType}
              </LqText>
            </Surface>
            <Surface variant="glass-highlight" className={styles.metadataTag}>
              <LqText variant="xs" color="secondary" weight="medium">
                {formatDate(doc.dateCreated)}
              </LqText>
            </Surface>
            <Surface variant="glass-highlight" className={styles.metadataTag}>
              <LqText variant="xs" color="secondary" weight="medium">
                {getSourceLabel(doc)}
              </LqText>
            </Surface>
          </Box>

          <Box className={styles.previewText}>
            <LqText variant="xs" color="secondary">
              {previewText}
            </LqText>
            <div className={styles.previewFade} />
          </Box>

          {doc.keyEntities && doc.keyEntities.length > 0 && (
            <Box className={styles.entitySection}>
              <LqText
                variant="xs"
                weight="black"
                color="muted"
                className={`${styles.textUppercase} ${styles.trackingWide}`}
              >
                Key Detected Entities
              </LqText>
              <Box className={styles.entityList}>
                {doc.keyEntities.slice(0, 8).map((entity, i) => (
                  <Surface key={i} variant="glass-highlight" className={styles.entityTag}>
                    <LqText variant="xs" color="accent" weight="medium">
                      {entity}
                    </LqText>
                  </Surface>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Surface>
    </motion.div>
  );
};

export default DocumentHoverPreview;
