import React from 'react';
import { DocumentBrowser } from '../components/documents/DocumentBrowser';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

interface DocumentsPageProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedDocumentId: string;
  onDocumentClose: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  searchTerm,
  onSearchTermChange,
  selectedDocumentId,
  onDocumentClose,
}) => {
  return (
    <ScopedErrorBoundary>
      <div className="space-y-[var(--space-6)]">
        <DocumentBrowser
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          selectedDocumentId={selectedDocumentId}
          onDocumentClose={onDocumentClose}
        />
      </div>
    </ScopedErrorBoundary>
  );
};
