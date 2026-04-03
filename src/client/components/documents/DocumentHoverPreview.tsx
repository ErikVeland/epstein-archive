import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
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
      <Surface
        variant="glass"
        className="p-6 relative overflow-hidden shadow-2xl ring-1 ring-[var(--accent)]/30"
      >
        <Box className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 blur-[40px] rounded-full -mr-16 -mt-16" />

        <Flex align="center" gap="sm" className="mb-4">
          <FileText className="w-5 h-5 text-[var(--accent)]" />
          <LqText
            variant="xs"
            weight="black"
            color="accent"
            className="uppercase tracking-widest opacity-80"
          >
            Document Preview
          </LqText>
        </Flex>

        <LqText variant="h3" weight="bold" className="mb-3 leading-tight">
          {displayTitle}
        </LqText>

        <Flex wrap="wrap" gap="xs" className="mb-6">
          <Surface
            variant="glass-highlight"
            className="px-2.5 py-1 rounded-full border-[var(--glass-border)]"
          >
            <LqText variant="xs" color="secondary" weight="medium">
              {doc.evidenceType || doc.fileType}
            </LqText>
          </Surface>
          <Surface
            variant="glass-highlight"
            className="px-2.5 py-1 rounded-full border-[var(--glass-border)]"
          >
            <LqText variant="xs" color="secondary" weight="medium">
              {formatDate(doc.dateCreated)}
            </LqText>
          </Surface>
          <Surface
            variant="glass-highlight"
            className="px-2.5 py-1 rounded-full border-[var(--glass-border)]"
          >
            <LqText variant="xs" color="secondary" weight="medium">
              {getSourceLabel(doc)}
            </LqText>
          </Surface>
        </Flex>

        <Box className="bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)]/50 rounded-[var(--radius-lg)] p-4 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)] mb-6 max-h-[160px] overflow-hidden relative">
          {previewText}
          <Box className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--glass-bg-strong)] to-transparent" />
        </Box>

        {doc.keyEntities && doc.keyEntities.length > 0 && (
          <Box>
            <LqText
              variant="xs"
              weight="bold"
              color="muted"
              className="uppercase mb-3 tracking-widest text-[10px]"
            >
              Key Detected Entities
            </LqText>
            <Flex wrap="wrap" gap="xs">
              {doc.keyEntities.slice(0, 8).map((entity, i) => (
                <Surface
                  key={i}
                  variant="glass-highlight"
                  className="px-2 py-0.5 border-[var(--accent)]/30 bg-[var(--accent)]/5 rounded text-[var(--accent)]"
                >
                  <LqText variant="xs" color="accent" weight="medium">
                    {entity}
                  </LqText>
                </Surface>
              ))}
            </Flex>
          </Box>
        )}
      </Surface>
    </motion.div>
  );
};
