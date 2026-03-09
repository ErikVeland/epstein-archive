import React from 'react';
import { DocumentBrowser } from '../components/documents/DocumentBrowser';

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
    <div className="space-y-6">
      <DocumentBrowser
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        selectedDocumentId={selectedDocumentId}
        onDocumentClose={onDocumentClose}
      />
    </div>
  );
};
