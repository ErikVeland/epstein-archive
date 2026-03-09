import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { FileText, ArrowRight } from 'lucide-react';
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
      <div
        className={
          viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-3'
        }
      >
        <DocumentSkeleton count={itemsPerPage} />
      </div>
    );
  }

  const totalPages = Math.ceil(totalDocuments / itemsPerPage) || 1;

  if (filteredDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-900/50 border border-dashed border-slate-700 rounded-2xl">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No documents found</h3>
        <p className="text-slate-400 text-center max-w-md px-6">
          {searchTerm ? (
            <>No documents match your search for "{searchTerm}"</>
          ) : (
            <>Try adjusting your search terms or filters to find what you're looking for.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Results status row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, totalDocuments)} of{' '}
            {totalDocuments.toLocaleString()}
          </span>
          {searchTerm && (
            <span className="semantic-chip border-slate-700/60 bg-slate-900/70 text-slate-300">
              Query: "{searchTerm}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center h-10 rounded-full border border-slate-700/75 bg-slate-900/65 overflow-hidden">
            <label className="text-xs text-slate-500 pl-3 pr-2 whitespace-nowrap">Jump to</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              className="w-20 h-full px-2 bg-transparent border-0 text-slate-100 text-xs focus:outline-none"
            />
            <button
              onClick={() => {
                const page = Number(jumpToPage);
                if (!Number.isFinite(page)) return;
                setCurrentPage(Math.min(totalPages, Math.max(1, page)));
              }}
              className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-white transition-colors hover:bg-cyan-400"
              title="Go to page"
            >
              <ArrowRight className="w-4 h-4 stroke-[2.75]" />
            </button>
          </div>
        </div>
      </div>

      <div
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
      </div>

      {/* Pagination Controls */}
      {totalDocuments > itemsPerPage && (
        <div className="flex items-center justify-center gap-4 py-8 border-t border-slate-800 mt-8">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isFetching}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            Previous
          </button>
          <div className="text-sm text-slate-400 text-center">
            <div>
              Page <span className="text-white font-medium">{currentPage}</span> of{' '}
              <span className="text-white font-medium">{totalPages}</span>
            </div>
          </div>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isFetching}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
