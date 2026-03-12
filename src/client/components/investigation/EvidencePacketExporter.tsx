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
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 shadow-lg">
      <h3 className="text-base font-semibold text-white mb-3">Export Evidence Packet</h3>

      <p className="text-sm text-slate-300 mb-5">
        Export this investigation as a comprehensive evidence packet containing entities, documents,
        metadata, and Red Flag Index scores.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-2">Export Format</label>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedFormat('json')}
              className={`
                flex-1 flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200
                ${
                  selectedFormat === 'json'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }
              `}
            >
              <FileJson className="h-5 w-5 mr-2" />
              <span className="font-medium">JSON</span>
            </button>

            <button
              onClick={() => setSelectedFormat('zip')}
              className={`
                flex-1 flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-200
                ${
                  selectedFormat === 'zip'
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700'
                }
              `}
            >
              <FileArchive className="h-5 w-5 mr-2" />
              <span className="font-medium">ZIP</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700/50">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`
              w-full flex items-center justify-center px-4 py-3 
              bg-blue-600 text-white rounded-lg font-medium
              hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30
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
