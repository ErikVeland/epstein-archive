import { useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import type {
  Investigation,
  TimelineEvent,
  Investigator,
  EvidenceItem,
  Hypothesis,
  Annotation,
} from '../../../../types/investigation';
import { MobileBottomNav } from './MobileBottomNav';
import { EvidenceCaptureSheet } from './EvidenceCaptureSheet';
import { MobileBoardView } from './MobileBoardView';
import { MobileEvidenceList } from './MobileEvidenceList';
import { MobileMoreDrawer, type MoreTool } from './MobileMoreDrawer';
import { MobileToolScreen } from './MobileToolScreen';
import { MobileTimelineView } from './MobileTimelineView';
import { MobileForensicView } from './MobileForensicView';
import { InvestigationActivityFeed } from '../InvestigationActivityFeed';
import { CommunicationAnalysis } from '../CommunicationAnalysis';
import { HypothesisTestingFramework } from '../HypothesisTestingFramework';
import { InvestigationExportTools } from '../InvestigationExportTools';
import styles from './MobileInvestigationShell.module.css';

import { Button } from '../../../design-system/lib';

type ActiveDest = 'board' | 'evidence' | 'activity';

const TOOL_LABELS: Record<MoreTool, string> = {
  timeline: 'Event Chronology',
  forensic: 'Forensic Workbench',
  communications: 'Communications',
  hypotheses: 'Hypotheses',
  export: 'Export & Report',
};

interface MobileInvestigationShellProps {
  investigationId?: string;
  onInvestigationSelect?: (investigation: Investigation) => void;
  currentUser: Investigator;
  selectedInvestigation: Investigation;
  timelineEvents: TimelineEvent[];
  evidenceItems: EvidenceItem[];
  onTimelineChanged?: () => void;
}

export function MobileInvestigationShell({
  currentUser: _currentUser,
  selectedInvestigation,
  timelineEvents,
  evidenceItems,
  onTimelineChanged,
}: MobileInvestigationShellProps) {
  const invId = String(selectedInvestigation.id);

  const [activeDest, setActiveDest] = useState<ActiveDest>('board');
  const [moreDest, setMoreDest] = useState<MoreTool | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);

  const handleEvidenceSaved = useCallback((_evidenceId: string) => {
    setCaptureOpen(false);
  }, []);

  const handleSelectMore = useCallback((tool: MoreTool) => {
    setMoreDest(tool);
  }, []);

  const handleBackFromTool = useCallback(() => {
    setMoreDest(null);
  }, []);

  const handleHypothesesUpdate = useCallback((updated: unknown[]) => {
    setHypotheses(updated as Hypothesis[]);
  }, []);

  // When a more tool is open, render just the MobileToolScreen
  if (moreDest !== null) {
    return (
      <MobileToolScreen toolName={TOOL_LABELS[moreDest]} onBack={handleBackFromTool}>
        {moreDest === 'timeline' && (
          <MobileTimelineView
            investigationId={invId}
            timelineEvents={timelineEvents}
            onEventsChanged={onTimelineChanged}
          />
        )}
        {moreDest === 'forensic' && <MobileForensicView investigation={selectedInvestigation} />}
        {moreDest === 'communications' && (
          <CommunicationAnalysis
            investigation={selectedInvestigation}
            evidence={evidenceItems}
            mobileMode
          />
        )}
        {moreDest === 'hypotheses' && (
          <HypothesisTestingFramework
            investigationId={invId}
            evidenceItems={evidenceItems}
            onHypothesesUpdate={
              handleHypothesesUpdate as Parameters<
                typeof HypothesisTestingFramework
              >[0]['onHypothesesUpdate']
            }
            mobileMode
          />
        )}
        {moreDest === 'export' && (
          <InvestigationExportTools
            investigation={selectedInvestigation}
            evidence={evidenceItems}
            timelineEvents={timelineEvents}
            hypotheses={hypotheses}
            annotations={[] as Annotation[]}
          />
        )}
      </MobileToolScreen>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.invTitle}>{selectedInvestigation.title}</span>
        <Button unstyled className={styles.notifBtn} type="button" aria-label="Notifications">
          <Bell size={20} />
        </Button>
      </div>

      <div className={styles.content}>
        {activeDest === 'board' && <MobileBoardView investigationId={invId} />}
        {activeDest === 'evidence' && <MobileEvidenceList investigationId={invId} />}
        {activeDest === 'activity' && <InvestigationActivityFeed investigationId={invId} compact />}
      </div>

      <MobileBottomNav
        activeDest={activeDest}
        onSetActiveDest={setActiveDest}
        onCapture={() => setCaptureOpen(true)}
        onMore={() => setMoreOpen(true)}
      />

      {captureOpen && (
        <EvidenceCaptureSheet
          investigationId={invId}
          onClose={() => setCaptureOpen(false)}
          onSaved={handleEvidenceSaved}
        />
      )}

      {moreOpen && (
        <MobileMoreDrawer onSelectTool={handleSelectMore} onClose={() => setMoreOpen(false)} />
      )}
    </div>
  );
}
