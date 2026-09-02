import React, { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { apiClient } from '@client/services/apiClient';
import { useIsMobile } from '@client/hooks/useIsMobile';
import { cn } from '@client/design-system/lib';
import { DocumentAnnotationSystem } from '../DocumentAnnotationSystem';
import { PDFVariantViewer } from '../PDFVariantViewer';
import { InvestigationTextRenderer } from '../InvestigationTextRenderer';
import { DocumentInsightsDrawer } from './DocumentInsightsDrawer';
import { AnimatedSegmentedControl } from '@client/components/common/AnimatedSegmentedControl';
import type { IconName } from '@client/components/common/Icon';
import type { PublicDocumentAnnotation } from '@shared/dto/annotations';
import type { DocRecord, DocEntityRecord } from '../DocumentModal';
// Design System
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Box } from '@client/design-system/components/layout/Box';
import { Flex } from '@client/design-system/components/layout/Flex';
import { LqText } from '@client/design-system/components/typography/Text';
import { Button, annotationTokens } from '@client/design-system/lib';
import styles from './DocumentUnifiedTab.module.css';

// ─────────────────────────────────────────────────────────────────────────────
// Exported types
// ─────────────────────────────────────────────────────────────────────────────

export type ViewMode = 'clean' | 'ocr' | 'pdf' | 'sidebyside';
export const VALID_VIEW_MODES = new Set<ViewMode>(['clean', 'ocr', 'pdf', 'sidebyside']);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RelatedDoc {
  id: string | number;
  title?: string;
  fileName?: string;
  evidenceType?: string;
  dateCreated?: string;
}

interface DocumentUnifiedTabProps {
  doc: DocRecord;
  id: string;
  localSearchTerm: string;
  // Optional so the component stays backward-compatible with the existing
  // DocumentModal.tsx call-site that doesn't yet pass these props.
  summary?: { bullets: string[]; sourceLabel: string };
  setSelectedEntity?: (e: DocEntityRecord | null) => void;
  setEntityModalId?: (id: string) => void;
  entities?: DocEntityRecord[];
  groupedEntities?: Array<[string, DocEntityRecord[]]>;
  relatedDocs?: RelatedDoc[];
  isLoadingRelated?: boolean;
  cleanText: string;
  ocrText: string;
  openOriginalDocument?: () => void;
  isEmail?: boolean;
  metadata?: Record<string, unknown> | null;
  title?: string;
  onNavigateToDoc?: (id: string) => void;
  showRecoveryHighlights?: boolean;
  setShowRecoveryHighlights?: (v: boolean) => void;
  isReadingMode?: boolean;
  setIsReadingMode?: (v: boolean) => void;
  viewMode?: ViewMode;
  setViewMode?: (mode: ViewMode) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Annotation list panel (not exported — rendered inside ocr/pdf views)
// ─────────────────────────────────────────────────────────────────────────────

const ANNOT_COLORS: Record<string, string> = annotationTokens.dot;

const AnnotationListPanel: React.FC<{ annotations: PublicDocumentAnnotation[] }> = ({
  annotations,
}) => {
  if (annotations.length === 0) {
    return (
      <Box className={styles.annotEmpty}>
        <LqText variant="xs" color="muted">
          No annotations yet. Switch to Clean Text view to annotate.
        </LqText>
      </Box>
    );
  }

  return (
    <Box className={styles.annotList}>
      <LqText variant="xs" weight="bold" color="muted" className={styles.annotListTitle}>
        Annotations ({annotations.length})
      </LqText>
      {annotations.map((a) => (
        <Box key={a.id} className={styles.annotItem}>
          <Flex align="center" gap="xs">
            <span
              className={styles.annotDot}
              style={{ backgroundColor: ANNOT_COLORS[a.type] ?? annotationTokens.dot.fallback }}
            />
            <LqText variant="xs" weight="semibold">
              {a.type}
            </LqText>
            <LqText variant="xs" color="muted" className={styles.annotAuthor}>
              {a.author || 'anonymous'}
            </LqText>
          </Flex>
          <LqText variant="xs" className={styles.annotExcerpt}>
            &ldquo;
            {a.selectedText.length > 80 ? a.selectedText.slice(0, 80) + '\u2026' : a.selectedText}
            &rdquo;
          </LqText>
          {a.note && (
            <LqText variant="xs" color="muted" className={styles.annotNote}>
              {a.note}
            </LqText>
          )}
        </Box>
      ))}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentUnifiedTab: React.FC<DocumentUnifiedTabProps> = ({
  doc,
  id,
  localSearchTerm,
  summary = { bullets: [], sourceLabel: 'No summary available.' },
  setSelectedEntity = () => {},
  setEntityModalId = () => {},
  entities = [],
  groupedEntities = [],
  relatedDocs = [],
  isLoadingRelated = false,
  cleanText,
  ocrText,
  openOriginalDocument: _openOriginalDocument,
  isEmail: _isEmail = false,
  onNavigateToDoc = () => {},
  showRecoveryHighlights: showRecoveryHighlightsProp,
  setShowRecoveryHighlights: setShowRecoveryHighlightsProp,
  isReadingMode: isReadingModeProp,
  setIsReadingMode: setIsReadingModeProp,
  viewMode: viewModeProp,
  setViewMode: setViewModeProp,
}) => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlViewMode = urlParams.get('viewMode') as ViewMode | null;

  // Internal state
  const [_isReadingMode, _setIsReadingMode] = useState(false);
  const [_showRecoveryHighlights, _setShowRecoveryHighlights] = useState(false);

  // Sync logic
  const viewMode =
    viewModeProp ?? (urlViewMode && VALID_VIEW_MODES.has(urlViewMode) ? urlViewMode : 'clean');
  const setViewMode = (mode: ViewMode) => {
    if (setViewModeProp) {
      setViewModeProp(mode);
    } else {
      const params = new URLSearchParams(location.search);
      params.set('viewMode', mode);
      navigate(`${location.pathname}?${params.toString()}`, {
        replace: true,
        state: location.state,
      });
    }
  };

  const isReadingMode = isReadingModeProp ?? _isReadingMode;
  const setIsReadingMode = setIsReadingModeProp ?? _setIsReadingMode;
  const showRecoveryHighlights = showRecoveryHighlightsProp ?? _showRecoveryHighlights;
  const setShowRecoveryHighlights = setShowRecoveryHighlightsProp ?? _setShowRecoveryHighlights;

  const [showAnnotations, setShowAnnotations] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const { data: annotations = [], isLoading: annotationsLoading } = useQuery<
    PublicDocumentAnnotation[]
  >({
    queryKey: ['documentAnnotations', id],
    queryFn: () => apiClient.getPublicDocumentAnnotations(id),
    staleTime: 30_000,
  });

  const effectiveMode: ViewMode = isMobile && viewMode === 'sidebyside' ? 'clean' : viewMode;

  const handleAnnotationCreated = useCallback(
    (annotation: PublicDocumentAnnotation) => {
      queryClient.setQueryData<PublicDocumentAnnotation[]>(['documentAnnotations', id], (prev) => [
        ...(prev ?? []),
        annotation,
      ]);
    },
    [id, queryClient],
  );

  const hasText = Boolean((cleanText || ocrText).trim());

  const viewModeOptions = [
    {
      value: 'clean' as ViewMode,
      label: isMobile ? 'Text' : 'Clean Text',
      icon: 'Type' as IconName,
    },
    {
      value: 'ocr' as ViewMode,
      label: isMobile ? 'OCR' : 'Raw OCR',
      icon: 'ScanText' as IconName,
    },
    {
      value: 'pdf' as ViewMode,
      label: isMobile ? 'PDF' : 'Original PDF',
      icon: 'FileText' as IconName,
    },
    ...(!isMobile
      ? [
          {
            value: 'sidebyside' as ViewMode,
            label: 'Side by Side',
            icon: 'Layout' as IconName,
          },
        ]
      : []),
  ];

  const renderViewModeToolbar = () => (
    <Flex align="center" justify="between" wrap="wrap" gap="sm" className={styles.toolbar}>
      <div className={styles.modeGroup}>
        <AnimatedSegmentedControl
          ariaLabel="Document view mode"
          options={viewModeOptions}
          value={effectiveMode}
          onChange={setViewMode}
          minItemWidth={isMobile ? '0' : '8.75rem'}
          fullWidth={isMobile}
          compact
          className={styles.modeControl}
        />
      </div>

      <Flex align="center" gap="sm">
        {annotationsLoading ? (
          <LqText variant="xs" color="muted">
            Loading\u2026
          </LqText>
        ) : (
          <LqText variant="xs" color="muted" className={styles.annotCount}>
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
          </LqText>
        )}
        <Button
          type="button"
          variant={showAnnotations ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setShowAnnotations((v) => !v)}
          className={cn(styles.annotToggle, showAnnotations && styles.annotToggleActive)}
          aria-pressed={showAnnotations}
          title={showAnnotations ? 'Hide annotations' : 'Show annotations'}
        >
          <Icon name="MessageSquare" size="sm" />
          <span className={styles.modeBtnLabel}>{showAnnotations ? 'Hide' : 'Annotate'}</span>
        </Button>
      </Flex>
    </Flex>
  );

  const renderEmptyTextState = () => (
    <Box className={styles.emptyTextWrap}>
      <Surface variant="glass-highlight" className={styles.emptyTextState}>
        <Icon name="FileText" className={styles.emptyIcon} />
        <LqText color="muted" className={styles.emptyText}>
          Text extraction is pending for this record. Use the Original PDF view to access the source
          document.
        </LqText>
        <Button variant="secondary" size="sm" onClick={() => setViewMode('pdf')}>
          Open Original PDF
        </Button>
      </Surface>
    </Box>
  );

  const renderCleanView = () => (
    <DocumentAnnotationSystem
      documentId={id}
      content={cleanText || ocrText}
      searchTerm={localSearchTerm}
      mode={showAnnotations ? 'full' : 'inline'}
      showAnnotations={showAnnotations}
      externalAnnotations={annotations}
      onAnnotationCreated={handleAnnotationCreated}
    />
  );

  const renderOcrView = () => (
    <>
      <InvestigationTextRenderer
        document={doc as unknown as Parameters<typeof InvestigationTextRenderer>[0]['document']}
        mode="ocr"
        searchTerm={localSearchTerm}
        showRecoveryHighlights={showRecoveryHighlights}
        isReadingMode={isReadingMode}
        onToggleReadingMode={() => setIsReadingMode(!isReadingMode)}
        onToggleRecoveryHighlights={setShowRecoveryHighlights}
        onEntitySelect={(e) => setSelectedEntity(e as DocEntityRecord)}
      />
      {showAnnotations && annotations.length > 0 && (
        <Surface variant="glass-highlight" className={styles.annotPanelOcr}>
          <AnnotationListPanel annotations={annotations} />
        </Surface>
      )}
    </>
  );

  const renderPdfView = () => (
    <>
      <PDFVariantViewer
        documentId={id}
        className={styles.pdfViewer}
        annotations={annotations}
        showAnnotations={showAnnotations}
      />
      {showAnnotations && annotations.length > 0 && (
        <Surface variant="glass-highlight" className={styles.annotPanelPdf}>
          <AnnotationListPanel annotations={annotations} />
        </Surface>
      )}
    </>
  );

  const renderSideBySideView = () => (
    <div className={styles.sideBySide}>
      <div className={styles.sidePane}>
        <LqText variant="xs" color="muted" className={styles.sidePaneLabel}>
          Clean Text
        </LqText>
        <DocumentAnnotationSystem
          documentId={id}
          content={cleanText || ocrText}
          searchTerm={localSearchTerm}
          mode="inline"
          showAnnotations={showAnnotations}
          externalAnnotations={annotations}
          onAnnotationCreated={handleAnnotationCreated}
        />
      </div>
      <div className={styles.sidePaneDivider} />
      <div className={styles.sidePane}>
        <LqText variant="xs" color="muted" className={styles.sidePaneLabel}>
          Original PDF
        </LqText>
        <PDFVariantViewer
          documentId={id}
          className={styles.pdfViewerSide}
          annotations={annotations}
          showAnnotations={showAnnotations}
        />
      </div>
    </div>
  );

  return (
    <Box className={styles.root}>
      {renderViewModeToolbar()}
      <Box className={styles.contentArea}>
        {(() => {
          if (!hasText && (effectiveMode === 'clean' || effectiveMode === 'ocr')) {
            return renderEmptyTextState();
          }
          switch (effectiveMode) {
            case 'clean':
              return renderCleanView();
            case 'ocr':
              return renderOcrView();
            case 'pdf':
              return renderPdfView();
            case 'sidebyside':
              return renderSideBySideView();
            default:
              return null;
          }
        })()}
      </Box>

      <DocumentInsightsDrawer
        isOpen={insightsOpen}
        onToggle={() => setInsightsOpen((v) => !v)}
        summary={summary}
        entities={entities}
        groupedEntities={groupedEntities}
        relatedDocs={relatedDocs}
        isLoadingRelated={isLoadingRelated}
        setSelectedEntity={setSelectedEntity}
        setEntityModalId={setEntityModalId}
        onNavigateToDoc={onNavigateToDoc}
      />
    </Box>
  );
};

export default DocumentUnifiedTab;
