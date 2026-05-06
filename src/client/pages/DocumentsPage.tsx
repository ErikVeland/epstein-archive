import React from 'react';
import { DocumentBrowser } from '@client/components/documents/DocumentBrowser';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';

interface DocumentsPageProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedDocumentId: string;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  searchTerm,
  onSearchTermChange,
  selectedDocumentId,
}) => {
  return (
    <ScopedErrorBoundary>
      <DocumentBrowser
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        selectedDocumentId={selectedDocumentId}
      />
    </ScopedErrorBoundary>
  );
};
