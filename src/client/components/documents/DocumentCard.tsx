import React, { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Database, Calendar, Eye } from 'lucide-react';
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
import './DocumentCard.css';

interface DocumentCardProps {
  document: Document;
  searchTerm?: string;
  dense?: boolean;
  active?: boolean;
  onClick: (doc: Document) => void;
  onHoverStart?: (doc: Document, rect: DOMRect) => void;
  onHoverEnd?: () => void;
}

export const DocumentCard = React.forwardRef<HTMLElement, DocumentCardProps>(function DocumentCard(
  { document, searchTerm, dense, active, onClick, onHoverStart, onHoverEnd },
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
  const iconElement = getRenderTypeIcon(document, { className: 'w-4 h-4' });

  const handleMouseEnter = () => {
    if (onHoverStart && cardRef.current) {
      onHoverStart(document, cardRef.current.getBoundingClientRect());
    }
  };

  return (
    <motion.article
      ref={setRefs}
      data-testid="document-card"
      className={`relative group h-full cursor-pointer touch-manipulation rounded-[var(--radius-lg)] overflow-hidden ${dense ? 'dense' : ''} ${active ? 'active' : ''}`}
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
        className={`h-full flex flex-col p-4 md:p-5 transition-all border-[var(--glass-border)] ${
          active
            ? 'ring-1 ring-[var(--accent)] border-[var(--accent)]/50 bg-[var(--glass-bg-highlight)]'
            : 'hover:bg-[var(--glass-bg-highlight)]/50'
        }`}
      >
        <Flex align="center" justify="between" className="mb-3">
          <Flex align="center" gap="sm">
            <Box className="w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--glass-bg-strong)] border border-[var(--glass-border)]">
              {iconElement}
            </Box>
            <LqText
              variant="xs"
              weight="bold"
              color="muted"
              className="uppercase tracking-widest font-mono truncate max-w-[80px]"
            >
              {document.sourceType || document.evidenceType || document.fileType}
            </LqText>
          </Flex>

          <Flex align="center" gap="xs">
            {document.previewKind === 'ai_summary' && (
              <Box
                className="w-6 h-6 flex items-center justify-center rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400"
                title="AI Forensic Summary"
              >
                <Sparkles className="w-3 h-3" />
              </Box>
            )}
            <Surface
              variant="glass-highlight"
              className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${getRiskClass(risk)}`}
            >
              <Box className={`w-1.5 h-1.5 rounded-full risk-dot risk-level-${risk}`} />
              <LqText variant="xs" weight="black">
                R{risk}
              </LqText>
            </Surface>
          </Flex>
        </Flex>

        <LqText
          variant="body"
          weight="bold"
          className="mb-1.5 leading-[1.3] line-clamp-2 group-hover:text-[var(--accent)] transition-colors"
        >
          {searchTerm ? highlightSearchTerm(displayTitle, searchTerm) : displayTitle}
        </LqText>

        <LqText
          variant="xs"
          color="secondary"
          className="line-clamp-3 leading-relaxed opacity-80 mb-4 flex-1"
        >
          {searchTerm ? highlightSearchTerm(previewText, searchTerm) : previewText}
        </LqText>

        {document.keyEntities && document.keyEntities.length > 0 && (
          <Flex align="center" gap="xs" className="mb-4 overflow-hidden">
            <User className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
            <LqText variant="xs" color="muted" weight="medium" className="truncate">
              {document.keyEntities.join(' · ')}
            </LqText>
          </Flex>
        )}

        <Flex
          align="center"
          gap="sm"
          className="mt-auto pt-3 border-t border-[var(--glass-border)]/50 overflow-x-auto pb-0.5 scrollbar-none"
        >
          <Flex
            align="center"
            gap="xs"
            className="shrink-0 bg-[var(--glass-bg-strong)] px-2 py-1 rounded-full border border-[var(--glass-border)]/50"
          >
            <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
            <LqText variant="xs" color="muted" weight="medium">
              {formatDate(document.dateCreated)}
            </LqText>
          </Flex>
          <Flex
            align="center"
            gap="xs"
            className="shrink-0 bg-[var(--glass-bg-strong)] px-2 py-1 rounded-full border border-[var(--glass-border)]/50"
          >
            <Eye className="w-3 h-3 text-[var(--text-muted)]" />
            <LqText variant="xs" color="muted" weight="medium">
              {entitiesCount} Ent
            </LqText>
          </Flex>
          <Flex
            align="center"
            gap="xs"
            className="shrink-0 bg-[var(--glass-bg-strong)] px-2 py-1 rounded-full border border-[var(--glass-border)]/50"
          >
            <Database className="w-3 h-3 text-[var(--text-muted)]" />
            <LqText variant="xs" color="muted" weight="medium" className="truncate max-w-[60px]">
              {getSourceLabel(document)}
            </LqText>
          </Flex>
        </Flex>
      </Surface>
    </motion.article>
  );
});
