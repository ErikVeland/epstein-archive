import React from 'react';
import { PDFVariantViewer } from '../PDFVariantViewer';
import { DocumentAnnotationSystem } from '../DocumentAnnotationSystem';

interface DocumentPDFTabProps {
  documentId: string;
  docId: string;
  content: string;
  searchTerm: string;
  openOriginalDocument: () => void;
  isEmail: boolean;
  metadata: any;
  title: string;
}

export const DocumentPDFTab: React.FC<DocumentPDFTabProps> = ({
  documentId,
  docId,
  content,
  searchTerm,
  openOriginalDocument,
  isEmail,
  metadata,
  title,
}) => {
  if (isEmail) {
    return (
      <div className="space-y-5">
        <div className="surface-quiet p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Email Viewer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                From
              </div>
              <div className="text-[var(--text-primary)] break-all">{metadata?.from || 'N/A'}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                To
              </div>
              <div className="text-[var(--text-primary)] break-all">{metadata?.to || 'N/A'}</div>
            </div>
            <div className="md:col-span-2">
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
                Subject
              </div>
              <div className="text-[var(--text-primary)]">
                {metadata?.subject || title || 'No subject'}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={openOriginalDocument}
              className="control h-10 px-4 text-xs font-semibold"
            >
              Open Original Email Source
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PDFVariantViewer documentId={documentId} className="h-[calc(100vh-360px)] min-h-[520px]" />
      <section className="surface-quiet p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Annotations</h3>
        <DocumentAnnotationSystem
          documentId={String(docId || documentId)}
          content={content}
          searchTerm={searchTerm}
          mode="inline"
        />
      </section>
    </div>
  );
};

export default DocumentPDFTab;
