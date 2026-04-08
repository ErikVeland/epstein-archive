import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileText, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';
import { Document } from '../../types/documents';
import { DocumentCard } from './DocumentCard';
import DocumentSkeleton from './DocumentSkeleton';
import styles from './DocumentList.module.css';

interface DocumentListProps {
  documents: Document[];
  filteredDocuments: Document[];
  viewMode: 'grid' | 'list';
  densityMode: 'compact' | 'comfortable';
  handleDocumentSelect: (doc: Document) => void;
  handleHoverStart: (doc: Document, rect: DOMRect) => void;
  handleHoverEnd: () => void;
  isFetching: boolean;
  currentPage: number;
  totalDocuments: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  searchTerm?: string;
  documentContainerRef: React.RefObject<HTMLDivElement>;
  jumpToPage: string;
  setJumpToPage: (page: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  filteredDocuments,
  viewMode,
  densityMode,
  handleDocumentSelect,
  handleHoverStart,
  handleHoverEnd,
  isFetching,
  currentPage,
  totalDocuments,
  itemsPerPage,
  setCurrentPage,
  searchTerm,
  documentContainerRef,
  jumpToPage,
  setJumpToPage,
}) => {
  if (isFetching && documents.length === 0) {
    return (
      <Box className={viewMode === 'grid' ? styles.gridLayout : styles.listLayout}>
        <DocumentSkeleton count={itemsPerPage} />
      </Box>
    );
  }

  const totalPages = Math.ceil(totalDocuments / itemsPerPage) || 1;

  if (filteredDocuments.length === 0) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        className={`glass-panel ${styles.emptyState}`}
      >
        <Box className={styles.emptyIconBox}>
          <FileText className={styles.emptyIcon} />
        </Box>
        <LqText variant="h3" weight="bold" className={styles.emptyTitle}>
          No documents found
        </LqText>
        <LqText variant="body" color="secondary" className={styles.emptyBody}>
          {searchTerm ? (
            <>No documents match your search for "{searchTerm}"</>
          ) : (
            <>Try adjusting your search terms or filters to find what you're looking for.</>
          )}
        </LqText>
      </Flex>
    );
  }

  return (
    <Box className={styles.wrapper}>
      {/* Results status row */}
      <Flex
        direction="column"
        align="stretch"
        justify="between"
        gap="md"
        className={styles.statusRow}
      >
        <Flex wrap="wrap" align="center" gap="sm">
          <LqText variant="body" color="secondary">
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, totalDocuments)} of{' '}
            {totalDocuments.toLocaleString()}
          </LqText>
          {searchTerm && (
            <Surface variant="glass-highlight" className={styles.searchBadge}>
              <LqText variant="xs" weight="medium">
                Query: "{searchTerm}"
              </LqText>
            </Surface>
          )}
        </Flex>
        <Flex align="center" gap="sm">
          <div className={styles.jumpToRow}>
            <LqText variant="xs" color="muted" className={styles.jumpToLabel}>
              Jump to
            </LqText>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              className={styles.jumpToInput}
            />
            <button
              onClick={() => {
                const page = Number(jumpToPage);
                if (!Number.isFinite(page)) return;
                setCurrentPage(Math.min(totalPages, Math.max(1, page)));
              }}
              className={styles.jumpToBtn}
              title="Go to page"
            >
              <ArrowRight className={styles.actionIcon} strokeWidth={2.75} />
            </button>
          </div>
        </Flex>
      </Flex>

      <Box
        ref={documentContainerRef}
        className={viewMode === 'grid' ? styles.gridLayout : styles.listLayout}
      >
        <AnimatePresence mode="popLayout">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              searchTerm={searchTerm}
              dense={densityMode === 'compact'}
              onClick={handleDocumentSelect}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
            />
          ))}
        </AnimatePresence>
      </Box>

      {/* Pagination Controls */}
      {totalDocuments > itemsPerPage && (
        <Flex align="center" justify="center" gap="lg" className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isFetching}
            className={styles.pageBtn}
          >
            <ChevronLeft className={styles.actionIcon} />
            Previous
          </button>
          <Box className={styles.pageInfo}>
            <Box>
              Page{' '}
              <LqText as="span" weight="medium" color="primary">
                {currentPage}
              </LqText>{' '}
              of{' '}
              <LqText as="span" weight="medium" color="primary">
                {totalPages}
              </LqText>
            </Box>
          </Box>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isFetching}
            className={styles.pageBtn}
          >
            Next
            <ChevronRight className={styles.actionIcon} />
          </button>
        </Flex>
      )}
    </Box>
  );
};
