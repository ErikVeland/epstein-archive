import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileText, ArrowRight } from 'lucide-react';
import {
  Box,
  Button,
  EmptyState,
  Flex,
  Input,
  LqText,
  Pagination,
  Surface,
} from '../../design-system/lib';
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
      <EmptyState
        className={styles.emptyState}
        icon={
          <Box className={styles.emptyIconBox}>
            <FileText className={styles.emptyIcon} />
          </Box>
        }
        title="No documents found"
        description={
          searchTerm
            ? `No documents match your search for "${searchTerm}"`
            : "Try adjusting your search terms or filters to find what you're looking for."
        }
      />
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
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              className={styles.jumpToInput}
            />
            <Button
              type="button"
              onClick={() => {
                const page = Number(jumpToPage);
                if (!Number.isFinite(page)) return;
                setCurrentPage(Math.min(totalPages, Math.max(1, page)));
              }}
              variant="ghost"
              size="sm"
              className={styles.jumpToBtn}
              title="Go to page"
            >
              <ArrowRight className={styles.actionIcon} strokeWidth={2.75} />
            </Button>
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
        <Pagination
          className={styles.pagination}
          page={currentPage}
          totalPages={totalPages}
          previousLabel="Previous document page"
          nextLabel="Next document page"
          onPageChange={(page) => {
            if (!isFetching) setCurrentPage(page);
          }}
        />
      )}
    </Box>
  );
};
