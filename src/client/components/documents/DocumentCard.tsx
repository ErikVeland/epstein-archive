import React, { useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, User, Database, Calendar, Eye, SearchCheck } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';
import { Document } from '../../types/documents';
import {
  getRenderTypeIcon,
  getSafePreviewText,
  getRiskClass,
  formatDate,
  getSourceLabel,
  highlightSearchTerm,
} from '../../utils/documentUtils';
import { useIsMobile } from '../../hooks/useResponsive';
import styles from './DocumentCard.module.css';

interface DocumentCardProps {
  document: Document;
  searchTerm?: string;
  dense?: boolean;
  active?: boolean;
  onClick: (doc: Document) => void;
  onHoverStart?: (doc: Document, rect: DOMRect) => void;
  onHoverEnd?: () => void;
}

const riskDotClass: Record<number, string> = {
  0: styles.riskLevel0,
  1: styles.riskLevel1,
  2: styles.riskLevel2,
  3: styles.riskLevel3,
  4: styles.riskLevel4,
  5: styles.riskLevel5,
};

const MATCH_REASON_COPY: Record<string, string> = {
  text: 'Text match',
  lexical: 'Text match',
  semantic: 'Conceptual match',
  hybrid: 'Keyword + concept match',
  'entity-alias': 'Entity alias match',
  high_risk_entity: 'High-risk entity context',
  'high-risk-entity': 'High-risk entity context',
};

const getMatchReasonLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return MATCH_REASON_COPY[normalized] || normalized.replace(/[-_]/g, ' ');
};

export const DocumentCard = React.forwardRef<HTMLElement, DocumentCardProps>(function DocumentCard(
  { document, searchTerm, active, onClick, onHoverStart, onHoverEnd },
  forwardedRef,
) {
  const cardRef = useRef<HTMLElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      cardRef.current = node;
      if (!forwardedRef) return;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else {
        (forwardedRef as { current: HTMLElement | null }).current = node;
      }
    },
    [forwardedRef],
  );
  const displayTitle = document.title || document.filename || 'Untitled document';
  const previewText = getSafePreviewText(document);
  const risk = Number(document.redFlagRating || 0);
  const entitiesCount = document.entitiesCount || document.entities?.length || 0;
  const iconElement = getRenderTypeIcon(document, { className: styles.iconGlyph });
  const isMobile = useIsMobile();
  const matchReasonLabel = getMatchReasonLabel(document.metadata?.matchReason);

  const handleMouseEnter = () => {
    if (onHoverStart && cardRef.current) {
      onHoverStart(document, cardRef.current.getBoundingClientRect());
    }
  };

  return (
    <motion.article
      ref={setRefs}
      data-testid="document-card"
      className={styles.card}
      onClick={() => onClick(document)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <Surface
        variant={active ? 'glass-highlight' : 'glass'}
        className={`${styles.surface} ${active ? styles.surfaceActive : styles.surfaceDefault}`}
      >
        <Flex align="center" justify="between" className={styles.headerRow}>
          <Flex align="center" gap="md">
            <Box className={styles.iconBox}>{iconElement}</Box>
            <LqText variant="xs" weight="bold" color="muted" className={styles.typeLabel}>
              {document.sourceType || document.evidenceType || document.fileType}
            </LqText>
          </Flex>

          <Flex align="center" gap="sm">
            {document.previewKind === 'ai_summary' && (
              <Box className={styles.aiBadge} title="AI Forensic Summary">
                <Sparkles className={styles.badgeIcon} />
              </Box>
            )}
            <Surface
              variant="glass-highlight"
              className={`${styles.riskBadge} ${getRiskClass(risk)}`}
            >
              <Box className={`${styles.riskDot} ${riskDotClass[risk] ?? styles.riskLevel0}`} />
              <LqText variant="xs" weight="black">
                R{risk}
              </LqText>
            </Surface>
            {isMobile && (
              <Button
                unstyled
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  handleMouseEnter();
                }}
                className={styles.peekButton}
              >
                <Eye size={16} />
              </Button>
            )}
          </Flex>
        </Flex>

        <LqText variant="body" weight="black" className={styles.title}>
          {searchTerm ? highlightSearchTerm(displayTitle, searchTerm) : displayTitle}
        </LqText>

        {matchReasonLabel && searchTerm && (
          <Flex align="center" gap="xs" className={styles.matchReason}>
            <SearchCheck className={styles.matchReasonIcon} />
            <LqText variant="xxxs" weight="bold" className={styles.matchReasonText}>
              Match: {matchReasonLabel}
            </LqText>
          </Flex>
        )}

        {(() => {
          const type = (document.evidenceType || document.fileType || '').toLowerCase();
          const isPhoto =
            type.includes('photo') ||
            type.includes('image') ||
            type.includes('jpg') ||
            type.includes('png');
          if (!isPhoto) return null;

          return (
            <Box className={styles.photoThumbnailContainer} data-testid="document-thumbnail">
              <img
                src={`/api/documents/${document.id}/file?variant=original`}
                alt={displayTitle}
                className={styles.photoThumbnail}
                loading="lazy"
              />
            </Box>
          );
        })()}

        <LqText variant="xs" color="secondary" className={styles.preview}>
          {searchTerm ? highlightSearchTerm(previewText, searchTerm) : previewText}
        </LqText>

        {document.keyEntities && document.keyEntities.length > 0 && (
          <Flex align="center" gap="xs" className={styles.entitiesRow}>
            <User className={styles.entityIcon} />
            <LqText variant="xs" color="muted" weight="medium" className={styles.entityLabel}>
              {document.keyEntities.map((e, i) => (
                <React.Fragment key={e.id || i}>
                  {i > 0 && ' · '}
                  {e.id ? (
                    <Link to={`/entity/${e.id}`} onClick={(ev) => ev.stopPropagation()}>
                      {e.name}
                    </Link>
                  ) : (
                    e.name
                  )}
                </React.Fragment>
              ))}
            </LqText>
          </Flex>
        )}

        <Flex align="center" gap="sm" className={styles.footerRow}>
          <Flex align="center" gap="xs" className={styles.metaPill}>
            <Calendar className={styles.metaIcon} />
            <LqText variant="xs" color="muted" weight="medium">
              {formatDate(document.dateCreated)}
            </LqText>
          </Flex>
          <Flex align="center" gap="xs" className={styles.metaPill}>
            <Eye className={styles.metaIcon} />
            <LqText variant="xs" color="muted" weight="medium" className={styles.footerText}>
              {entitiesCount} {entitiesCount === 1 ? 'Entity' : 'Entities'}
            </LqText>
          </Flex>
          <Flex align="center" gap="xs" className={styles.metaPill}>
            <Database className={styles.metaIcon} />
            <LqText variant="xs" color="muted" weight="medium" className={styles.metaLabelTruncate}>
              {getSourceLabel(document)}
            </LqText>
          </Flex>
        </Flex>
      </Surface>
    </motion.article>
  );
});
