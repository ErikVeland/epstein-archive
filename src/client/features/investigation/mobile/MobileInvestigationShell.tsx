import { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { useReliableBackNavigation } from '@client/hooks/useReliableBackNavigation';
import type {
  Investigation,
  TimelineEvent,
  Investigator,
  EvidenceItem,
  Hypothesis,
  Annotation,
} from '@client/types/investigation';
import { MobileBottomNav } from './MobileBottomNav';
import { EvidenceCaptureSheet } from './EvidenceCaptureSheet';
import { MobileBoardView } from './MobileBoardView';
import { MobileEvidenceList } from './MobileEvidenceList';
import { MobileMoreDrawer, type MoreTool } from './MobileMoreDrawer';
import { MobileToolScreen } from './MobileToolScreen';
import { InvestigationActivityFeed } from '../InvestigationActivityFeed';
import styles from './MobileInvestigationShell.module.css';

import { Button } from '@client/design-system/lib';
import { useAuth } from '@client/contexts/AuthContext';

const MobileTimelineView = lazy(() =>
  import('./MobileTimelineView').then((module) => ({ default: module.MobileTimelineView })),
);
const MobileForensicView = lazy(() =>
  import('./MobileForensicView').then((module) => ({ default: module.MobileForensicView })),
);
const CommunicationAnalysis = lazy(() =>
  import('../CommunicationAnalysis').then((module) => ({ default: module.CommunicationAnalysis })),
);
const HypothesisTestingFramework = lazy(() =>
  import('../HypothesisTestingFramework').then((module) => ({
    default: module.HypothesisTestingFramework,
  })),
);
const InvestigationExportTools = lazy(() =>
  import('../InvestigationExportTools').then((module) => ({
    default: module.InvestigationExportTools,
  })),
);
const EvidencePacketExporter = lazy(() =>
  import('../EvidencePacketExporter').then((module) => ({
    default: module.EvidencePacketExporter,
  })),
);
const IcebergIntelligence = lazy(() =>
  import('../IcebergIntelligence').then((module) => ({ default: module.IcebergIntelligence })),
);

type ActiveDest = 'board' | 'evidence' | 'activity';
const VALID_TABS = new Set<string>(['board', 'evidence', 'activity']);
const VALID_TOOLS = new Set<string>([
  'timeline',
  'iceberg',
  'forensic',
  'communications',
  'hypotheses',
  'export',
]);
const EDIT_ONLY_TOOLS = new Set<string>(['forensic', 'hypotheses', 'export']);

const TOOL_LABELS: Record<MoreTool, string> = {
  timeline: 'Timeline',
  iceberg: 'Discovery',
  forensic: 'Source analysis',
  communications: 'Communications',
  hypotheses: 'Hypotheses',
  export: 'Export',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const canEditInvestigations =
    isAuthenticated && (user?.role === 'admin' || user?.role === 'investigator');
  const { goBack } = useReliableBackNavigation(`/investigations/${invId}`);

  const rawTab = searchParams.get('tab') ?? (isAuthenticated ? 'board' : 'evidence');
  const activeDest: ActiveDest = VALID_TABS.has(rawTab) ? (rawTab as ActiveDest) : 'board';
  const rawTool = searchParams.get('tool');
  const moreDest: MoreTool | null =
    rawTool && VALID_TOOLS.has(rawTool) && (canEditInvestigations || !EDIT_ONLY_TOOLS.has(rawTool))
      ? (rawTool as MoreTool)
      : null;

  useEffect(() => {
    const hasInvalidTab = searchParams.has('tab') && !VALID_TABS.has(rawTab);
    const hasInvalidTool =
      rawTool !== null &&
      (!VALID_TOOLS.has(rawTool) || (!canEditInvestigations && EDIT_ONLY_TOOLS.has(rawTool)));
    if (!hasInvalidTab && !hasInvalidTool) return;

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (hasInvalidTab) next.delete('tab');
        if (hasInvalidTool) next.delete('tool');
        return next;
      },
      { replace: true },
    );
  }, [canEditInvestigations, rawTab, rawTool, searchParams, setSearchParams]);

  useEffect(() => {
    if (isAuthenticated || rawTab !== 'board') return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', 'evidence');
        return next;
      },
      { replace: true },
    );
  }, [isAuthenticated, rawTab, setSearchParams]);

  const setActiveDest = useCallback(
    (dest: ActiveDest) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tool');
          if (dest === 'board') next.delete('tab');
          else next.set('tab', dest);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [captureOpen, setCaptureOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [evidenceRevision, setEvidenceRevision] = useState(0);

  const handleEvidenceSaved = useCallback((_evidenceId: string) => {
    setCaptureOpen(false);
    setEvidenceRevision((revision) => revision + 1);
  }, []);

  const handleCapture = useCallback(() => {
    if (canEditInvestigations) {
      setCaptureOpen(true);
      return;
    }
    const returnTo = `${window.location.pathname}${window.location.search}`;
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [canEditInvestigations, navigate]);

  const handleDestinationChange = useCallback(
    (destination: ActiveDest) => {
      if (destination === 'board' && !isAuthenticated) {
        const returnTo = `${window.location.pathname}${window.location.search}`;
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      setActiveDest(destination);
    },
    [isAuthenticated, navigate, setActiveDest],
  );

  const handleSelectMore = useCallback(
    (tool: MoreTool) => {
      // Push a new history entry so device back button returns to board
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tool', tool);
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const handleBackFromTool = useCallback(() => {
    if (searchParams.has('tool')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('tool');
          if ((next.get('tab') ?? 'board') === 'board') {
            next.delete('tab');
          }
          return next;
        },
        { replace: true },
      );
      return;
    }
    goBack(`/investigations/${invId}`);
  }, [goBack, invId, searchParams, setSearchParams]);

  const handleHypothesesUpdate = useCallback((updated: unknown[]) => {
    setHypotheses(updated as Hypothesis[]);
  }, []);

  // When a more tool is open, render just the MobileToolScreen
  if (moreDest !== null) {
    return (
      <MobileToolScreen toolName={TOOL_LABELS[moreDest]} onBack={handleBackFromTool}>
        <Suspense fallback={<div className={styles.toolLoading}>Loading view…</div>}>
          {moreDest === 'timeline' && (
            <MobileTimelineView
              investigationId={invId}
              timelineEvents={timelineEvents}
              onEventsChanged={onTimelineChanged}
            />
          )}
          {moreDest === 'iceberg' && <IcebergIntelligence investigationId={invId} />}
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
            <div className={styles.mobileExportStack}>
              <InvestigationExportTools
                investigation={selectedInvestigation}
                evidence={evidenceItems}
                timelineEvents={timelineEvents}
                hypotheses={hypotheses}
                annotations={[] as Annotation[]}
              />
              <EvidencePacketExporter
                investigationId={invId}
                investigationTitle={selectedInvestigation.title}
                evidence={evidenceItems}
                timelineEvents={timelineEvents}
                hypotheses={hypotheses}
                annotations={[] as Annotation[]}
              />
            </div>
          )}
        </Suspense>
      </MobileToolScreen>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          unstyled
          className={styles.backBtn}
          type="button"
          aria-label="Back to cases"
          onClick={() => goBack('/investigations')}
        >
          <Icon name="ArrowLeft" size="md" />
        </Button>
        <h1 className={styles.invTitle}>{selectedInvestigation.title}</h1>
        <span className={styles.accessState}>{canEditInvestigations ? 'Edit' : 'View'}</span>
      </div>

      <div className={styles.content}>
        {activeDest === 'board' && (
          <MobileBoardView
            key={`board-${evidenceRevision}`}
            investigationId={invId}
            editable={canEditInvestigations}
          />
        )}
        {activeDest === 'evidence' && (
          <MobileEvidenceList key={`evidence-${evidenceRevision}`} investigationId={invId} />
        )}
        {activeDest === 'activity' && <InvestigationActivityFeed investigationId={invId} compact />}
      </div>

      <MobileBottomNav
        activeDest={activeDest}
        onSetActiveDest={handleDestinationChange}
        onCapture={handleCapture}
        onMore={() => setMoreOpen(true)}
        canCapture={canEditInvestigations}
        canViewBoard={isAuthenticated}
      />

      {captureOpen && canEditInvestigations && (
        <EvidenceCaptureSheet
          investigationId={invId}
          onClose={() => setCaptureOpen(false)}
          onSaved={handleEvidenceSaved}
        />
      )}

      {moreOpen && (
        <MobileMoreDrawer
          editable={canEditInvestigations}
          onSelectTool={handleSelectMore}
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  );
}
