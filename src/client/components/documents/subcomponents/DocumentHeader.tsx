import React from 'react';
import { Calendar, Download, FileText, Search, ArrowLeft } from 'lucide-react';
import { CloseButton } from '../../common/CloseButton';
import { formatDate } from '../DocumentModalUtils';

interface DocumentHeaderProps {
  doc: any;
  localSearchTerm: string;
  setLocalSearchTerm: (value: string) => void;
  canReturnToCase: boolean;
  handleBackToCase: () => void;
  downloadOriginalDocument: () => void;
  onClose: () => void;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  doc,
  localSearchTerm,
  setLocalSearchTerm,
  canReturnToCase,
  handleBackToCase,
  downloadOriginalDocument,
  onClose,
}) => {
  return (
    <div className="flex items-center gap-4 py-6 pl-8 pr-4 min-w-0">
      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-900/20">
        <FileText className="w-6 h-6 text-cyan-400" />
      </div>
      <div className="min-w-0">
        <h2
          id="document-modal-title"
          className="text-2xl font-bold text-white tracking-tight truncate leading-tight"
        >
          {doc.title || doc.fileName}
        </h2>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
              doc.evidenceType === 'email'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
            }`}
          >
            {doc.evidenceType || doc.fileType || 'Unclassified Record'}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDate(doc.dateModified || doc.updatedAt)}
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative group lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
          <input
            type="text"
            placeholder="Find in record..."
            className="control !h-12 w-full !pl-12 pr-4 !bg-slate-950/40 border-white/5 focus:!border-cyan-500/50 transition-all text-sm"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="document_record_search"
          />
        </div>
        <div className="h-8 w-px bg-white/5 mx-1 md:block hidden" />
        {canReturnToCase && (
          <button
            onClick={handleBackToCase}
            className="control !h-12 px-5 flex items-center gap-2 text-slate-300 hover:text-white group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Case</span>
          </button>
        )}
        <button
          onClick={downloadOriginalDocument}
          className="control !h-12 w-12 flex items-center justify-center text-slate-400 hover:text-cyan-400"
          title="Download Original Document"
        >
          <Download className="w-5 h-5" />
        </button>
        <CloseButton
          onClick={onClose}
          size="md"
          label="Close"
          className="!h-12 !w-12 text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
        />
      </div>
    </div>
  );
};

export default DocumentHeader;
