import React, { useState } from 'react';
import { Download, FileJson, FileArchive } from 'lucide-react';

interface ExportMeta {
  investigationId: string;
  investigationTitle: string;
  exportedAt: string;
}

interface EvidencePacketExporterProps {
  investigationId: string;
  investigationTitle: string;
  onExport: (format: 'json' | 'zip', meta: ExportMeta) => void;
}

export const EvidencePacketExporter: React.FC<EvidencePacketExporterProps> = ({
  investigationId,
  investigationTitle,
  onExport,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'zip'>('zip');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      onExport(selectedFormat, {
        investigationId,
        investigationTitle,
        exportedAt: new Date().toISOString(),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[var(--glass-bg)]/60 backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-5 shadow-[var(--glass-shadow)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
        Export Evidence Packet
      </h3>

      <p className="text-sm text-[var(--text-secondary)] mb-5">
        Export this investigation as a comprehensive evidence packet containing entities, documents,
        metadata, and Red Flag Index scores.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Export Format
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedFormat('json')}
              className={`
                flex-1 flex items-center justify-center p-3 rounded-[var(--radius-lg)] border-2 transition-all duration-200
                ${
                  selectedFormat === 'json'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg-highlight)]/50 text-[var(--text-secondary)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]'
                }
              `}
            >
              <FileJson className="h-5 w-5 mr-2" />
              <span className="font-medium">JSON</span>
            </button>

            <button
              onClick={() => setSelectedFormat('zip')}
              className={`
                flex-1 flex items-center justify-center p-3 rounded-[var(--radius-lg)] border-2 transition-all duration-200
                ${
                  selectedFormat === 'zip'
                    ? 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent)]'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg-highlight)]/50 text-[var(--text-secondary)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)]'
                }
              `}
            >
              <FileArchive className="h-5 w-5 mr-2" />
              <span className="font-medium">ZIP</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--glass-border)]">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`
              w-full flex items-center justify-center px-4 py-3 
              bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] font-medium
              hover:bg-[var(--accent)] transition-colors shadow-[var(--glass-shadow)] shadow-blue-900/30
              ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            <Download className="h-5 w-5 mr-2" />
            {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
