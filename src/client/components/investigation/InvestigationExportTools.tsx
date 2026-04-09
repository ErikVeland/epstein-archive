import React, { useMemo, useState } from 'react';
import {
  Investigation,
  EvidenceItem,
  TimelineEvent,
  Hypothesis,
  Annotation,
} from '../../types/investigation';
import { Download, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToasts } from '../common/useToasts';
import { apiClient } from '../../services/apiClient';
import {
  buildEvidenceCsv,
  buildExportIntegrityMeta,
  buildTimelineExportJson,
  prependMarkdownMetadata,
} from '../../utils/investigationExportIntegrity';
import styles from './InvestigationExportTools.module.css';

interface ExportToolsProps {
  investigation: Investigation;
  evidence: EvidenceItem[];
  timelineEvents: TimelineEvent[];
  hypotheses: Hypothesis[];
  annotations: Annotation[];
}

type ExportType = 'report' | 'bundle' | 'evidence-csv' | 'timeline';

interface ExportOption {
  id: ExportType;
  title: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'report',
    title: 'PDF report (via briefing markdown)',
    description: 'Generate investigation briefing from backend source with provenance sections.',
    available: true,
  },
  {
    id: 'bundle',
    title: 'Case bundle (zip)',
    description: 'Export evidence package as a single archive.',
    available: false,
    unavailableReason: 'Zip bundle generation endpoint is not available yet in this build.',
  },
  {
    id: 'evidence-csv',
    title: 'Evidence table (csv)',
    description: 'Export a structured evidence table for external review.',
    available: true,
  },
  {
    id: 'timeline',
    title: 'Timeline export',
    description: 'Export timeline events in machine-readable JSON.',
    available: true,
  },
];

export const InvestigationExportTools: React.FC<ExportToolsProps> = ({
  investigation,
  evidence,
  timelineEvents,
  hypotheses,
  annotations,
}) => {
  const { addToast } = useToasts();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<ExportType>('report');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeEntities, setIncludeEntities] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeComms, setIncludeComms] = useState(true);
  const [redactSensitive, setRedactSensitive] = useState(true);
  const [includeAuditTrail, setIncludeAuditTrail] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedMeta, setGeneratedMeta] = useState<null | {
    filename: string;
    checksum: string;
    generatedAt: string;
    version: string;
  }>(null);
  const sectionToggles: Array<{
    label: string;
    value: boolean;
    setter: React.Dispatch<React.SetStateAction<boolean>>;
  }> = [
    { label: 'Include summary', value: includeSummary, setter: setIncludeSummary },
    { label: 'Include evidence list', value: includeEvidence, setter: setIncludeEvidence },
    { label: 'Include key entities', value: includeEntities, setter: setIncludeEntities },
    { label: 'Include timeline', value: includeTimeline, setter: setIncludeTimeline },
    { label: 'Include communications', value: includeComms, setter: setIncludeComms },
    {
      label: 'Include provenance / audit trail',
      value: includeAuditTrail,
      setter: setIncludeAuditTrail,
    },
  ];

  const selectedOption =
    exportOptions.find((option) => option.id === selectedType) || exportOptions[0];

  const estimatedSizeKb = useMemo(() => {
    const base = 18;
    const evidenceWeight = includeEvidence ? evidence.length * 0.7 : 0;
    const timelineWeight = includeTimeline ? timelineEvents.length * 0.4 : 0;
    const hypothesisWeight = includeSummary ? hypotheses.length * 0.3 : 0;
    const annotationsWeight = includeAuditTrail ? annotations.length * 0.15 : 0;
    return Math.max(
      8,
      Math.round(base + evidenceWeight + timelineWeight + hypothesisWeight + annotationsWeight),
    );
  }, [
    annotations.length,
    evidence.length,
    hypotheses.length,
    includeAuditTrail,
    includeEvidence,
    includeSummary,
    includeTimeline,
    timelineEvents.length,
  ]);

  const downloadBlob = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const runGeneration = async () => {
    if (!selectedOption.available) {
      addToast({
        text: selectedOption.unavailableReason || 'Export option is not available yet.',
        type: 'warning',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    setGeneratedMeta(null);

    try {
      let content = '';
      let filename = `investigation-${investigation.id}.txt`;
      let mimeType = 'text/plain';
      const generatedAt = new Date().toISOString();
      const pipelineVersion =
        import.meta.env.VITE_GIT_COMMIT ||
        import.meta.env.VITE_COMMIT_SHA ||
        import.meta.env.VITE_APP_VERSION ||
        'N/A';
      const timelineOrderingMode = (() => {
        try {
          const key = `investigation_timeline_order_mode_${investigation.id}`;
          const mode = window.localStorage.getItem(key);
          return mode === 'narrative' || mode === 'chronological' ? mode : 'unknown';
        } catch {
          return 'unknown';
        }
      })();
      const integrity = await buildExportIntegrityMeta({
        caseId: investigation.id,
        generatedAt,
        evidence,
        pipelineVersion,
        timelineOrderingMode,
      });

      await new Promise((resolve) => setTimeout(resolve, 120));
      setProgress(35);

      if (selectedType === 'report') {
        const markdown = await apiClient.get<string>(
          `/investigations/${investigation.id}/briefing`,
        );
        content = prependMarkdownMetadata(markdown, integrity);
        filename = `investigation-briefing-${investigation.id}.md`;
        mimeType = 'text/markdown';
      } else if (selectedType === 'evidence-csv') {
        content = buildEvidenceCsv(evidence, integrity);
        filename = `evidence-table-${investigation.id}.csv`;
        mimeType = 'text/csv';
      } else if (selectedType === 'timeline') {
        content = buildTimelineExportJson(timelineEvents, integrity);
        filename = `timeline-${investigation.id}.json`;
        mimeType = 'application/json';
      }

      setProgress(70);
      downloadBlob(content, filename, mimeType);
      setProgress(100);

      setGeneratedMeta({
        filename,
        checksum: `${integrity.checksumAlgorithm}:${integrity.checksum}`,
        generatedAt,
        version: integrity.pipelineVersion,
      });
      addToast({ text: 'Export generated successfully.', type: 'success' });
    } catch (_error) {
      addToast({ text: 'Export generation failed.', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed =
    (step === 1 && selectedOption.available) ||
    (step === 2 && true) ||
    (step === 3 && true) ||
    step === 4;

  return (
    <div className={`${styles.panel} ${styles.stackLg}`}>
      <div>
        <h3 className={styles.title}>Export Workflow</h3>
        <p className={styles.subtitle}>
          Step-based export flow: choose output, configure content, preview, then generate.
        </p>
      </div>

      <div className={styles.stepsGrid}>
        {[1, 2, 3, 4].map((idx) => (
          <button
            key={idx}
            onClick={() => setStep(idx as 1 | 2 | 3 | 4)}
            className={`${styles.stepButton} ${
              step === idx ? styles.stepButtonActive : styles.stepButtonIdle
            }`}
          >
            Step {idx}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className={styles.stackSm}>
          <h4 className={styles.sectionHeading}>1. Choose output type</h4>
          {exportOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              data-gated-reason={
                option.available ? '' : option.unavailableReason || 'Not available yet'
              }
              className={`${styles.optionButton} ${
                selectedType === option.id ? styles.optionButtonSelected : styles.optionButtonIdle
              }`}
            >
              <div className={styles.rowBetween}>
                <p className={styles.bodyTextSm}>{option.title}</p>
                {option.available ? (
                  <span className={`${styles.labelPill} ${styles.successPill}`}>Available</span>
                ) : (
                  <span className={`${styles.labelPill} ${styles.warningPill}`}>
                    Not available yet
                  </span>
                )}
              </div>
              <p className={styles.bodyTextXs}>{option.description}</p>
              {!option.available && option.unavailableReason && (
                <p className={`${styles.bodyTextXs} ${styles.warningText}`}>
                  {option.unavailableReason}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className={styles.stackSm}>
          <h4 className={styles.sectionHeading}>2. Configure content</h4>
          <div className={styles.toggleGrid}>
            {sectionToggles.map(({ label, value, setter }) => (
              <label key={String(label)} className={styles.toggleCard}>
                <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
                <span className={styles.bodyTextSm}>{label}</span>
              </label>
            ))}
          </div>
          <label className={styles.toggleCard}>
            <input
              type="checkbox"
              checked={redactSensitive}
              onChange={(e) => setRedactSensitive(e.target.checked)}
            />
            <span className={styles.bodyTextSm}>Apply redaction for sensitive content</span>
          </label>
        </div>
      )}

      {step === 3 && (
        <div className={styles.stackSm}>
          <h4 className={styles.sectionHeading}>3. Preview</h4>
          <div className={styles.previewCard}>
            <p className={styles.bodyTextSm}>
              <span className={styles.mutedText}>Type:</span> {selectedOption.title}
            </p>
            <p className={styles.bodyTextSm}>
              <span className={styles.mutedText}>Estimated size:</span> ~{estimatedSizeKb} KB
            </p>
            <p className={styles.bodyTextSm}>
              <span className={styles.mutedText}>Sections:</span>{' '}
              {[
                includeSummary && 'summary',
                includeEvidence && 'evidence',
                includeEntities && 'entities',
                includeTimeline && 'timeline',
                includeComms && 'comms',
              ]
                .filter(Boolean)
                .join(', ') || 'none'}
            </p>
            <p className={styles.bodyTextSm}>
              <span className={styles.mutedText}>Redaction:</span>{' '}
              {redactSensitive ? 'enabled' : 'off'}
            </p>
            <p className={styles.bodyTextSm}>
              <span className={styles.mutedText}>Audit trail:</span>{' '}
              {includeAuditTrail ? 'included' : 'excluded'}
            </p>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className={styles.stackMd}>
          <h4 className={styles.sectionHeading}>4. Generate</h4>
          <button
            onClick={runGeneration}
            disabled={isGenerating || !selectedOption.available}
            className={styles.generateButton}
          >
            <Download className={styles.iconSm} />
            {isGenerating ? 'Generating...' : 'Generate artifact'}
          </button>

          {isGenerating && (
            <div className={styles.progressCard}>
              <div className={styles.progressLabelRow}>
                <span>Generation progress</span>
                <span>{progress}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {generatedMeta && (
            <div className={styles.successCard}>
              <div className={styles.successHeading}>
                <CheckCircle2 className={styles.iconSm} />
                Export generated
              </div>
              <p className={styles.successText}>
                <span className={styles.successLabel}>File:</span> {generatedMeta.filename}
              </p>
              <p className={styles.successText}>
                <span className={styles.successLabel}>Checksum:</span> {generatedMeta.checksum}
              </p>
              <p className={styles.successText}>
                <span className={styles.successLabel}>Generated at:</span>{' '}
                {format(new Date(generatedMeta.generatedAt), 'PPpp')}
              </p>
              <p className={styles.successText}>
                <span className={styles.successLabel}>Version:</span> {generatedMeta.version}
              </p>
            </div>
          )}

          {!selectedOption.available && (
            <div className={styles.warningCard}>
              <ShieldAlert className={styles.iconSm} />
              <span>
                {selectedOption.unavailableReason || 'Not available yet.'} Use an available export
                type now and keep provenance enabled for auditability.
              </span>
            </div>
          )}

          <div className={styles.footerMeta}>
            <Clock className={styles.iconXs} />
            Generated files are local downloads. No automatic publish endpoint is active in this
            module.
          </div>
        </div>
      )}

      <div className={styles.footerDivider}>
        <button
          onClick={() => setStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4)}
          disabled={step === 1}
          className={`${styles.navButton} ${styles.navButtonSecondary}`}
        >
          Back
        </button>
        <button
          onClick={() => setStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4)}
          disabled={step === 4 || !canProceed}
          className={`${styles.navButton} ${styles.navButtonPrimary}`}
        >
          Next
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.bodyTextXs}>Evidence items</p>
          <p className={styles.statValue}>{evidence.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.bodyTextXs}>Timeline events</p>
          <p className={styles.statValue}>{timelineEvents.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.bodyTextXs}>Hypotheses</p>
          <p className={styles.statValue}>{hypotheses.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.bodyTextXs}>Annotations</p>
          <p className={styles.statValue}>{annotations.length}</p>
        </div>
      </div>
    </div>
  );
};
