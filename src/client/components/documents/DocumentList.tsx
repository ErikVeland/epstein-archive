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
      <Box
        className={
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'
        }
      >
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
        className="py-20 glass-panel border-dashed rounded-[var(--radius-xl)]"
      >
        <Box className="w-16 h-16 bg-[var(--glass-bg-strong)] rounded-full flex items-center justify-center mb-4 border border-[var(--glass-border)]">
          <FileText className="w-8 h-8 text-[var(--accent)]" />
        </Box>
        <LqText variant="h3" weight="bold" className="mb-2">
          No documents found
        </LqText>
        <LqText variant="body" color="secondary" className="text-center max-w-md px-6">
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
    <Box className="space-y-8">
      {/* Results status row */}
      <Flex
        direction="column"
        align="stretch"
        justify="between"
        gap="md"
        className="md:flex-row md:items-center text-sm"
      >
        <Flex wrap="wrap" align="center" gap="sm">
          <LqText variant="body" color="secondary">
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, totalDocuments)} of{' '}
            {totalDocuments.toLocaleString()}
          </LqText>
          {searchTerm && (
            <Surface
              variant="glass-highlight"
              className="px-2 py-0.5 rounded-full border-[var(--glass-border)]"
            >
              <LqText variant="xs" weight="medium">
                Query: "{searchTerm}"
              </LqText>
            </Surface>
          )}
        </Flex>
        <Flex align="center" gap="sm">
          <Flex
            align="center"
            className="h-10 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] overflow-hidden"
          >
            <LqText variant="xs" color="muted" className="pl-3 pr-2 whitespace-nowrap">
              Jump to
            </LqText>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              className="w-20 h-full px-2 bg-transparent border-0 text-[var(--text-primary)] text-xs focus:outline-none"
            />
            <button
              onClick={() => {
                const page = Number(jumpToPage);
                if (!Number.isFinite(page)) return;
                setCurrentPage(Math.min(totalPages, Math.max(1, page)));
              }}
              className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--text-primary)] transition-colors hover:brightness-110"
              title="Go to page"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.75]" />
            </button>
          </Flex>
        </Flex>
      </Flex>

      <Box
        ref={documentContainerRef}
        className={
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'
        }
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
        <Flex
          align="center"
          justify="center"
          gap="lg"
          className="py-8 border-t border-[var(--glass-border)] mt-8"
        >
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isFetching}
            className="px-4 py-2 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--glass-bg-highlight)] transition-colors inline-flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <Box className="text-sm text-[var(--text-secondary)] text-center">
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
            className="px-4 py-2 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--glass-bg-highlight)] transition-colors inline-flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </Flex>
      )}
    </Box>
  );
};
