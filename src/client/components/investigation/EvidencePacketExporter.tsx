import React, { useState } from 'react';
import { Download, FileJson, FileArchive } from 'lucide-react';
import styles from './EvidencePacketExporter.module.css';

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

  const getFormatButtonClassName = (format: 'json' | 'zip') =>
    `${styles.formatButton} ${
      selectedFormat === format ? styles.formatButtonActive : styles.formatButtonInactive
    }`;

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
    <div className={styles.panel}>
      <h3 className={styles.title}>Export Evidence Packet</h3>

      <p className={styles.description}>
        Export this investigation as a comprehensive evidence packet containing entities, documents,
        metadata, and Red Flag Index scores.
      </p>

      <div className={styles.content}>
        <div>
          <label className={styles.label}>Export Format</label>
          <div className={styles.formatButtons}>
            <button
              onClick={() => setSelectedFormat('json')}
              className={getFormatButtonClassName('json')}
            >
              <FileJson className={styles.formatIcon} />
              <span className={styles.formatText}>JSON</span>
            </button>

            <button
              onClick={() => setSelectedFormat('zip')}
              className={getFormatButtonClassName('zip')}
            >
              <FileArchive className={styles.formatIcon} />
              <span className={styles.formatText}>ZIP</span>
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`${styles.exportButton} ${isExporting ? styles.exportButtonDisabled : ''}`}
          >
            <Download className={styles.exportIcon} />
            {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
