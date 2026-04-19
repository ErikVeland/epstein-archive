import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Plane, User, Camera, ShieldAlert, X } from 'lucide-react';
import { Box, Flex, LqText, Surface, Button } from '../../design-system/lib';
import type { Document } from '../../types/documents';
import {
  formatDate,
  getRenderTypeIcon,
  getSafePreviewText,
  getSourceLabel,
} from '../../utils/documentUtils';
import { useIsMobile } from '../../hooks/useResponsive';
import { cn } from '../../utils/cn';
import styles from './DocumentHoverPreview.module.css';

interface DocumentHoverPreviewProps {
  doc: Document;
  rect: DOMRect;
  onClose?: () => void;
}

export const DocumentHoverPreview: React.FC<DocumentHoverPreviewProps> = ({
  doc,
  rect,
  onClose,
}) => {
  const isMobile = useIsMobile();
  const displayTitle = doc.title || doc.filename || 'Untitled document';
  const previewText = getSafePreviewText(doc);
  const type = (doc.evidenceType || doc.fileType || '').toLowerCase();
  const isPhoto =
    type.includes('photo') ||
    type.includes('image') ||
    type.includes('jpg') ||
    type.includes('png');

  const signals = doc.signals || [];
  const maxRisk = Math.max(0, ...signals.map((s) => s.riskScore));
  const isHighRisk = maxRisk > 0.7;

  // Calculate position
  const desktopX =
    rect.right + 20 + 420 > window.innerWidth ? rect.left - 420 - 20 : rect.right + 20;
  const desktopY = Math.max(
    20,
    Math.min(window.innerHeight - 500, rect.top + rect.height / 2 - 200),
  );
  const desktopNudgeX = desktopX < rect.left ? 10 : -10;
  const x = isMobile ? '50%' : desktopX;
  const y = isMobile ? '50%' : desktopY;

  const getSignalIcon = (signalType: string) => {
    const t = signalType.toLowerCase();
    if (t.includes('travel') || t.includes('flight')) return <Plane size={14} />;
    if (t.includes('presence')) return <Camera size={14} />;
    if (t.includes('identity') || t.includes('fusion')) return <User size={14} />;
    return <AlertTriangle size={14} />;
  };

  return (
    <div className={cn(isMobile && styles.mobileOverlay)} onClick={isMobile ? onClose : undefined}>
      <motion.div
        initial={
          isMobile
            ? { opacity: 0, scale: 0.9, x: '-50%', y: '-40%' }
            : { opacity: 0, scale: 0.95, x: desktopNudgeX }
        }
        animate={isMobile ? { opacity: 1, scale: 1, y: '-50%' } : { opacity: 1, scale: 1, x: 0 }}
        exit={
          isMobile
            ? { opacity: 0, scale: 0.9, y: '-40%' }
            : { opacity: 0, scale: 0.95, x: desktopNudgeX }
        }
        style={{
          left: x,
          top: y,
          position: 'fixed',
          zIndex: 10000,
          transform: isMobile ? 'translate(-50%, -50%)' : 'none',
          pointerEvents: 'auto',
        }}
        className={cn(styles.pastedPreviewRoot, isMobile && styles.mobilePeek)}
        onClick={(e) => e.stopPropagation()}
      >
        <Surface
          variant="glass-strong"
          className={`${styles.root} ${isHighRisk ? styles.liquidFire : ''}`}
        >
          <Box className={styles.header}>
            <Flex align="center" justify="between">
              <Flex align="center" gap="sm" className={styles.marginBottomSmall}>
                {getRenderTypeIcon(doc, { width: 16, height: 16, className: styles.iconAccent })}
                <LqText
                  variant="xs"
                  weight="black"
                  color="accent"
                  className={`${styles.textUppercase} ${styles.trackingWidest}`}
                >
                  Forensic Brief
                </LqText>
              </Flex>
              {isHighRisk && (
                <div
                  className={`${styles.riskBadge} ${
                    maxRisk > 0.9 ? styles.riskBadgeCritical : styles.riskBadgeHigh
                  }`}
                >
                  <ShieldAlert size={12} />
                  <span>Risk Alert</span>
                </div>
              )}
              {isMobile && onClose && (
                <Button
                  unstyled
                  onClick={onClose}
                  className={styles.mobileClose}
                  aria-label="Close Forensic Brief"
                >
                  <X size={18} />
                </Button>
              )}
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
              {isPhoto && (
                <Box className={styles.photoPreviewContainer}>
                  <img
                    src={`/api/documents/${encodeURIComponent(String(doc.id))}/file?variant=original`}
                    alt={displayTitle}
                    className={styles.photoThumbnail}
                    loading="lazy"
                  />
                </Box>
              )}
              <LqText variant="xs" color="secondary">
                {previewText}
              </LqText>
              <div className={styles.previewFade} />
            </Box>

            {signals.length > 0 && (
              <Box className={styles.signalSection}>
                <LqText
                  variant="xs"
                  weight="black"
                  color="secondary"
                  className={`${styles.textUppercase} ${styles.trackingWide} ${styles.textGold}`}
                >
                  Relational Intelligence
                </LqText>
                <Box className={styles.signalList}>
                  {signals.map((signal) => (
                    <div key={signal.id} className={styles.signalItem}>
                      <Flex align="center" justify="between">
                        <Flex align="center" gap="xs">
                          <span className={styles.iconAccent}>{getSignalIcon(signal.type)}</span>
                          <LqText variant="xs" weight="bold" color="primary">
                            {signal.type}
                          </LqText>
                        </Flex>
                        <LqText variant="xs" weight="medium" color="muted">
                          {Math.round(signal.confidence * 100)}% Conf.
                        </LqText>
                      </Flex>
                      <LqText variant="xs" color="muted">
                        Entities: {signal.entities?.join(', ')}
                      </LqText>
                      <div className={styles.riskGauge}>
                        <div
                          className={`${styles.riskFill} ${
                            signal.riskScore > 0.9
                              ? styles.riskCritical
                              : signal.riskScore > 0.7
                                ? styles.riskHigh
                                : ''
                          }`}
                          style={{ width: `${signal.riskScore * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </Box>
              </Box>
            )}

            {doc.keyEntities && doc.keyEntities.length > 0 && (
              <Box className={styles.entitySection}>
                <LqText
                  variant="xs"
                  weight="black"
                  color="muted"
                  className={`${styles.textUppercase} ${styles.trackingWide}`}
                >
                  Detected Entities
                </LqText>
                <Box className={styles.entityList}>
                  {doc.keyEntities.slice(0, 8).map((entity, i) => (
                    <Surface key={i} variant="glass-highlight" className={styles.entityTag}>
                      <LqText variant="xs" color="secondary" weight="medium">
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
    </div>
  );
};

export default DocumentHoverPreview;
