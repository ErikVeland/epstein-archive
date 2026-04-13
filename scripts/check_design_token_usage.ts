import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'src/client');
const strictMode = process.env.STRICT_DESIGN_TOKENS === '1';
const writeStrictBaseline = process.env.WRITE_STRICT_BASELINE === '1';
const strictBaselinePath = path.join(rootDir, 'scripts/design-token-strict-baseline.json');
const exceptionPath = path.join(rootDir, 'scripts/design-system-exceptions.json');
const enforcedFiles = [
  'src/client/App.tsx',
  // Core common primitives
  'src/client/components/common/FormField.tsx',
  'src/client/design-system/components/forms/Select.tsx',
  'src/client/components/common/SourceBadge.tsx',
  'src/client/components/common/Card.tsx',
  'src/client/components/common/BaseCard.tsx',
  'src/client/components/common/CloseButton.tsx',
  'src/client/components/common/ProgressBar.tsx',
  'src/client/components/common/Skeleton.tsx',
  'src/client/components/common/Tabs.tsx',
  'src/client/components/common/BatchToolbar.tsx',
  'src/client/components/common/FormLayout.tsx',
  // Glass UI primitives — must be 100% token-clean
  'src/client/components/ui/GlassButton.tsx',
  'src/client/components/ui/GlassModal.tsx',
  'src/client/components/ui/GlassTooltip.tsx',
  'src/client/components/ui/GlassDropdown.tsx',
  'src/client/components/ui/GlassSwitch.tsx',
]
  .map((filePath) => path.join(rootDir, filePath))
  .filter((filePath) => fs.existsSync(filePath));
const forbiddenArbitraryUtilities = [
  /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y)-\[(?:\d+|\d+\.\d+)(?:px|rem)\]/g,
  /\brounded-\[(?:\d+|\d+\.\d+)(?:px|rem)\]/g,
];
const classPattern =
  /\b(?:bg|text|border|from|to|via|ring)-(?:slate|gray|red|orange|amber|yellow|green|emerald|teal|cyan|blue|indigo|violet|purple|pink)-\d{2,3}\b/g;
const strictClassPattern =
  /\b(?:bg|text|border|from|to|via|ring)-(?:slate|gray|red|orange|amber|yellow|green|emerald|teal|cyan|blue|indigo|violet|purple|pink)-\d{2,3}\b/g;
const strictSpacingPattern =
  /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y)-(?:0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16)\b/g;

const moduleGovernedFiles = new Set(
  [
    // Design-system barrel and shared/common foundations
    'src/client/design-system/components/Button.tsx',
    'src/client/components/common/CloseButton.tsx',
    'src/client/components/common/ProgressBar.tsx',
    'src/client/components/common/SourceBadge.tsx',
    'src/client/components/common/Skeleton.tsx',
    'src/client/components/common/LoadingIndicator.tsx',
    'src/client/components/common/Card.tsx',
    'src/client/components/common/FormField.tsx',
    'src/client/design-system/components/forms/Select.tsx',
    'src/client/components/common/Tabs.tsx',
    'src/client/components/common/LoadingPill.tsx',
    'src/client/components/common/TagSelector.tsx',
    'src/client/components/common/BatchToolbar.tsx',
    'src/client/components/common/AddToInvestigationButton.tsx',
    'src/client/components/BlackBookReview.tsx',
    'src/client/components/BlackBookViewer.tsx',
    'src/client/components/FinancialTransactionAnalysis.tsx',
    'src/client/components/PatternRecognitionAI.tsx',
    'src/client/components/pages/LegalPage.tsx',
    'src/client/components/shared/DegradedBanner.tsx',
    'src/client/components/shared/SensitiveWarningBanner.tsx',
    'src/client/components/shared/AlbumSidebar.tsx',
    'src/client/components/shared/MediaBrowserLayout.tsx',
    'src/client/components/common/ErrorBoundary.tsx',
    'src/client/components/common/ToastProvider.tsx',
    'src/client/components/layout/SortFilter.tsx',
    'src/client/components/layout/SearchFilters.tsx',
    // Foundation cleanup and shared/common UI migration
    'src/client/components/layout/Layout.tsx',
    'src/client/components/layout/Breadcrumb.tsx',
    'src/client/components/shared/MobileAlbumDropdown.tsx',
    'src/client/components/common/BaseCard.tsx',
    'src/client/components/common/FormLayout.tsx',
    'src/client/components/common/HelpText.tsx',
    'src/client/components/common/TailoredErrorFallback.tsx',
    'src/client/components/common/CircularProgress.tsx',
    'src/client/components/common/LazyImage.tsx',
    'src/client/components/common/WikiLink.tsx',
    'src/client/components/common/CollapsibleSplitPane.tsx',
    'src/client/components/common/ScopedErrorBoundary.tsx',
    'src/client/components/FirstRunOnboarding.tsx',
    'src/client/components/KeyboardShortcutsModal.tsx',
    'src/client/components/ReleaseNotesPanel.tsx',
    'src/client/components/UndoManager.tsx',
    'src/client/components/admin/ReviewQueuePanel.tsx',
    'src/client/components/ArticleFeed.tsx',
    // Navigation and app shell migration
    'src/client/components/layout/MobileMenu.tsx',
    'src/client/components/layout/Footer.tsx',
    'src/client/components/layout/GlobalSearch.tsx',
    // Feature sweep — wave 1
    'src/client/components/documents/DocumentSkeleton.tsx',
    'src/client/components/documents/subcomponents/DocumentHeader.tsx',
    'src/client/components/documents/subcomponents/DocumentMetadataRail.tsx',
    'src/client/components/evidence/DepositionViewer.tsx',
    'src/client/components/evidence/EmailViewer.tsx',
    'src/client/components/flights/FlightCard.tsx',
    'src/client/components/flights/FlightDetailPanel.tsx',
    'src/client/components/flights/FlightTimelineView.tsx',
    'src/client/components/flights/FlightTracker.tsx',
    'src/client/components/properties/PropertyCard.tsx',
    'src/client/components/investigation/BoardOnboarding.tsx',
    'src/client/components/investigation/ChainOfCustodyModal.tsx',
    'src/client/components/investigation/EvidencePacketExporter.tsx',
    'src/client/components/investigation/InvestigationActivityFeed.tsx',
    'src/client/components/investigation/InvestigationBoard.tsx',
    'src/client/components/investigation/InvestigationExportTools.tsx',
    'src/client/components/investigation/InvestigationMemoryPanel.tsx',
    'src/client/components/investigation/InvestigationOnboarding.tsx',
    'src/client/components/entities/EntityEvidencePanel.tsx',
    'src/client/components/entities/EntityRelationshipMapper.tsx',
    'src/client/components/entities/CreateEntityModal.tsx',
    'src/client/components/entities/CreateRelationshipModal.tsx',
    'src/client/components/entities/SubjectCardV2.tsx',
    'src/client/components/investigation/InvestigationCaseFolder.tsx',
    'src/client/components/investigation/InvestigationTasksPanel.tsx',
    'src/client/components/investigation/InvestigationTeamManagement.tsx',
    'src/client/components/investigation/MultiSourceCorrelationEngine.tsx',
    'src/client/components/investigation/InvestigationTimelineBuilder.tsx',
    'src/client/components/investigation/ForensicDocumentAnalyzer.tsx',
    'src/client/components/investigation/HypothesisTestingFramework.tsx',
    'src/client/components/investigation/ForensicAnalysisWorkspace.tsx',
    'src/client/components/investigation/EvidenceNotebook.tsx',
    'src/client/components/investigation/ForensicReportGenerator.tsx',
    'src/client/components/investigation/InvestigationEvidencePanel.tsx',
    'src/client/components/investigation/CommunicationAnalysis.tsx',
    'src/client/components/investigation/InvestigationWorkspace.tsx',
    'src/client/components/email/EmailClient.tsx',
    // Page and top-level shell migration
    'src/client/components/pages/StatsSkeleton.tsx',
    'src/client/components/pages/StatsDashboard.tsx',
    'src/client/components/pages/StatsDisplay.tsx',
    'src/client/components/pages/FAQPage.tsx',
    'src/client/components/pages/DataQualityDashboard.tsx',
    'src/client/components/pages/MemoryDashboard.tsx',
    'src/client/components/pages/About.tsx',
    'src/client/components/pages/EnhancedAnalytics.tsx',
    'src/client/components/pages/AboutPage.tsx',
    'src/client/pages/AnalyticsPage.tsx',
    'src/client/pages/LoginPage.tsx',
    'src/client/pages/AdminDashboard.tsx',
    'src/client/pages/PeoplePage.tsx',
    'src/client/pages/EvidenceDetail.tsx',
    'src/client/pages/ReviewDashboard.tsx',
    'src/client/pages/TheEpsteinFilesPage.tsx',
    // Media and properties follow-up migration
    'src/client/components/media/ArticleCard.tsx',
    'src/client/components/media/ArticlesTab.tsx',
    'src/client/components/media/ArticleViewerModal.tsx',
    'src/client/components/media/AudioBrowser.tsx',
    'src/client/components/media/AudioPlayer.tsx',
    'src/client/components/media/MediaAndArticlesTab.tsx',
    'src/client/components/media/MediaViewer.tsx',
    'src/client/components/media/MediaViewerModal.tsx',
    'src/client/components/media/PhotoBrowser.tsx',
    'src/client/components/media/VideoBrowser.tsx',
    'src/client/components/media/VideoPlayer.tsx',
    'src/client/components/documents/DocumentBrowserHeader.tsx',
    'src/client/components/documents/DocumentBrowserFilters.tsx',
    'src/client/components/documents/DocumentCard.tsx',
    'src/client/components/documents/DocumentAnnotationSystem.tsx',
    'src/client/components/documents/DocumentContentRenderer.tsx',
    'src/client/components/documents/DocumentDiffView.tsx',
    'src/client/components/documents/DocumentModal.tsx',
    'src/client/components/documents/InvestigationTextRenderer.tsx',
    'src/client/components/documents/DocumentList.tsx',
    'src/client/components/documents/DocumentMetadataPanel.tsx',
    'src/client/components/documents/subcomponents/DocumentAnalysisTab.tsx',
    'src/client/components/PropertyBrowser.tsx',
    'src/client/components/properties/PropertyStatsHeader.tsx',
    'src/client/components/properties/PropertyAnalyticsView.tsx',
    'src/client/components/properties/PropertyAssociatesView.tsx',
    'src/client/components/properties/PropertyBrowseView.tsx',
    'src/client/components/properties/PropertyCard.tsx',
    // Glass UI primitives
    'src/client/components/ui/GlassButton.tsx',
    'src/client/components/ui/GlassDropdown.tsx',
    // Evidence components — wave 2
    'src/client/components/evidence/EvidenceDocSnippets.tsx',
    'src/client/components/evidence/ClaimsList.tsx',
    'src/client/components/evidence/EvidenceFilters.tsx',
    'src/client/components/EvidenceSearch.tsx',
    'src/client/components/evidence/ContactListViewer.tsx',
    'src/client/components/evidence/DocumentViewer.tsx',
    'src/client/components/evidence/EvidenceLadder.tsx',
    'src/client/components/evidence/EvidenceResultCard.tsx',
    'src/client/components/evidence/ImageViewer.tsx',
    'src/client/components/evidence/PDFViewer.tsx',
    'src/client/components/evidence/RedactionPlaceholder.tsx',
    'src/client/components/evidence/TableViewer.tsx',
    // Entity components — wave 2
    'src/client/components/entities/EntityConfidenceDisplay.tsx',
    'src/client/components/entities/EntityMediaGallery.tsx',
    'src/client/components/entities/EntityTypeFilter.tsx',
    'src/client/components/entities/cards/EvidenceBadge.tsx',
    'src/client/components/entities/PersonCardSkeleton.tsx',
    'src/client/components/entities/PersonCard.tsx',
    'src/client/components/faces/FaceGallery.tsx',
    'src/client/components/visualizations/AreaTimeline.tsx',
    'src/client/components/visualizations/DataVisualizationEnhanced.tsx',
    'src/client/components/visualizations/DataVisualization.tsx',
    'src/client/components/visualizations/DataIntegrityPanel.tsx',
    'src/client/components/visualizations/DocumentBarChart.tsx',
    'src/client/components/visualizations/EvidenceDrawer.tsx',
    'src/client/components/visualizations/FinancialTransactionMapper.tsx',
    'src/client/components/visualizations/InteractiveEntityMap.tsx',
    'src/client/components/visualizations/LocationMap.tsx',
    'src/client/components/visualizations/NetworkGraph.tsx',
    'src/client/components/visualizations/SunburstChart.tsx',
    'src/client/components/visualizations/NetworkVisualization.tsx',
    'src/client/components/visualizations/Timeline.tsx',
    'src/client/components/visualizations/TimelineVisualization.tsx',
    'src/client/components/visualizations/TreeMap.tsx',
  ]
    .map((f) => path.join(rootDir, f))
    .filter((filePath) => fs.existsSync(filePath)),
);

const tailwindUtilityPattern =
  /className\s*=\s*(?:\{\s*)?["'`][^"'`\n\r]*\b(flex|grid|items-center|items-start|justify-between|justify-center|gap-\d|p-\d|px-\d|py-\d|pt-\d|pb-\d|m-\d|mx-\d|my-\d|mt-\d|mb-\d|w-full|h-\d|text-(?:xs|sm|base|lg|xl)|font-(?:medium|bold|semibold|mono)|rounded(?:-(?:md|lg|xl|full|sm))?|overflow-(?:hidden|auto|scroll)|absolute|relative|hidden|block|inline-flex|inline-block|truncate|uppercase|transition-)\b[^"'`\n\r]*["'`]/;
const deprecatedUiImportPattern = /from\s+['"][^'"]*components\/ui(?:\/[^'"]+)?['"]/g;
const bannedPresentationClassPattern =
  /\b(surface-glass(?:-card|-header|-strong)?|glass-panel|app-header-glass|modal-header|control)\b/g;
const rawInteractivePattern = /<(button|input|select|textarea)\b/g;
const presentationalInlineStylePattern =
  /style\s*=\s*\{\{[^}]*\b(background|border|padding|margin|color|boxShadow|display|alignItems|justifyContent|textAlign|overflow)\b[^}]*\}\}/g;
const hardcodedColorPattern = /#[0-9a-fA-F]{3,8}|rgba?\(|hsl\(/g;

type RuleName =
  | 'deprecated-ui-import'
  | 'banned-presentation-class'
  | 'raw-interactive-element'
  | 'presentational-inline-style'
  | 'hardcoded-color';

interface ExceptionEntry {
  rule: RuleName;
  pattern: string;
  owner: string;
  reason: string;
  expiresOn: string;
}

const exceptions: ExceptionEntry[] = fs.existsSync(exceptionPath)
  ? (JSON.parse(fs.readFileSync(exceptionPath, 'utf8')) as ExceptionEntry[])
  : [];

function isExcepted(relPath: string, rule: RuleName): boolean {
  return exceptions.some((entry) => entry.rule === rule && relPath.includes(entry.pattern));
}

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function main() {
  const violations: string[] = [];
  const governedDesignSystemViolations: string[] = [];
  const advisoryViolations = {
    deprecatedUiImports: [] as string[],
    bannedPresentationClasses: [] as string[],
    rawInteractiveElements: [] as string[],
    presentationalInlineStyles: [] as string[],
    hardcodedColors: [] as string[],
  };
  for (const filePath of enforcedFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    classPattern.lastIndex = 0;
    if (classPattern.test(content)) {
      const rel = path.relative(rootDir, filePath);
      violations.push(rel);
    }
  }
  const arbitraryViolations: string[] = [];
  const strictViolations: string[] = [];
  for (const filePath of walk(clientDir)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(rootDir, filePath);
    for (const pattern of forbiddenArbitraryUtilities) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        arbitraryViolations.push(relPath);
        break;
      }
    }
    if (strictMode || writeStrictBaseline) {
      strictClassPattern.lastIndex = 0;
      strictSpacingPattern.lastIndex = 0;
      if (strictClassPattern.test(content) || strictSpacingPattern.test(content)) {
        strictViolations.push(relPath);
      }
    }
    if (moduleGovernedFiles.has(filePath)) {
      if (tailwindUtilityPattern.test(content)) {
        violations.push(`${relPath} — CSS module governed file contains Tailwind utility strings`);
      }
    }

    deprecatedUiImportPattern.lastIndex = 0;
    if (deprecatedUiImportPattern.test(content) && !isExcepted(relPath, 'deprecated-ui-import')) {
      advisoryViolations.deprecatedUiImports.push(relPath);
      if (moduleGovernedFiles.has(filePath)) {
        governedDesignSystemViolations.push(
          `${relPath} — imports deprecated components/ui surface`,
        );
      }
    }

    bannedPresentationClassPattern.lastIndex = 0;
    if (
      bannedPresentationClassPattern.test(content) &&
      !isExcepted(relPath, 'banned-presentation-class')
    ) {
      advisoryViolations.bannedPresentationClasses.push(relPath);
      if (moduleGovernedFiles.has(filePath)) {
        governedDesignSystemViolations.push(
          `${relPath} — uses deprecated global presentation classes`,
        );
      }
    }

    rawInteractivePattern.lastIndex = 0;
    if (rawInteractivePattern.test(content) && !isExcepted(relPath, 'raw-interactive-element')) {
      advisoryViolations.rawInteractiveElements.push(relPath);
    }

    presentationalInlineStylePattern.lastIndex = 0;
    if (
      presentationalInlineStylePattern.test(content) &&
      !isExcepted(relPath, 'presentational-inline-style')
    ) {
      advisoryViolations.presentationalInlineStyles.push(relPath);
    }

    hardcodedColorPattern.lastIndex = 0;
    if (
      hardcodedColorPattern.test(content) &&
      !relPath.endsWith('designTokens.ts') &&
      !isExcepted(relPath, 'hardcoded-color')
    ) {
      advisoryViolations.hardcodedColors.push(relPath);
    }
  }
  const configPath = path.join(rootDir, 'tailwind.config.js');
  const missingConfigRequirements: string[] = [];
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const configRequirements = [
      'tokenizedPaletteFamilies',
      '--twc-',
      'var(--space-',
      'var(--radius-',
      'var(--shadow-',
    ];
    missingConfigRequirements.push(
      ...configRequirements.filter((requirement) => !configContent.includes(requirement)),
    );
  }

  if (writeStrictBaseline) {
    const baseline = Array.from(new Set(strictViolations)).sort();
    fs.writeFileSync(strictBaselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
    console.log(`[design-token-usage] wrote strict baseline: ${baseline.length} files`);
    return;
  }

  const strictBaseline = fs.existsSync(strictBaselinePath)
    ? (JSON.parse(fs.readFileSync(strictBaselinePath, 'utf8')) as string[])
    : [];
  const strictBaselineSet = new Set(strictBaseline);
  const strictNewViolations = strictViolations.filter(
    (filePath) => !strictBaselineSet.has(filePath),
  );

  if (
    violations.length ||
    arbitraryViolations.length ||
    missingConfigRequirements.length ||
    strictNewViolations.length
  ) {
    const parts: string[] = [];
    if (violations.length) {
      parts.push(`Hardcoded palette classes in governed primitives: ${violations.join(', ')}`);
    }
    if (arbitraryViolations.length) {
      parts.push(`Arbitrary px/rem utility usage found: ${arbitraryViolations.join(', ')}`);
    }
    if (missingConfigRequirements.length) {
      parts.push(`Tailwind token wiring missing: ${missingConfigRequirements.join(', ')}`);
    }
    if (strictNewViolations.length) {
      parts.push(
        `STRICT_DESIGN_TOKENS new violations (raw palette/spacing classes): ${strictNewViolations.slice(0, 20).join(', ')}`,
      );
    }
    throw new Error(`Design token guard failed. ${parts.join(' | ')}`);
  }

  if (!strictMode) {
    const advisoryCount = walk(clientDir).reduce((count, filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      strictClassPattern.lastIndex = 0;
      strictSpacingPattern.lastIndex = 0;
      return (
        count + (strictClassPattern.test(content) || strictSpacingPattern.test(content) ? 1 : 0)
      );
    }, 0);
    if (advisoryCount > 0) {
      console.log(
        `[design-token-usage] advisory: ${advisoryCount} files still use raw palette/spacing classes`,
      );
      console.log('[design-token-usage] set STRICT_DESIGN_TOKENS=1 to enforce hard failure');
    }
    const advisoryParts = [
      ['deprecated components/ui imports', advisoryViolations.deprecatedUiImports.length],
      [
        'deprecated global presentation classes',
        advisoryViolations.bannedPresentationClasses.length,
      ],
      ['raw interactive elements', advisoryViolations.rawInteractiveElements.length],
      ['presentational inline styles', advisoryViolations.presentationalInlineStyles.length],
      ['hardcoded colors', advisoryViolations.hardcodedColors.length],
    ].filter(([, count]) => (count as number) > 0);
    if (advisoryParts.length > 0) {
      console.log(
        `[design-token-usage] design-system advisory: ${advisoryParts.map(([label, count]) => `${label}=${count}`).join(', ')}`,
      );
    }
    if (governedDesignSystemViolations.length > 0) {
      console.log(
        `[design-token-usage] governed migration backlog: ${governedDesignSystemViolations.length} files still use deprecated system patterns`,
      );
    }
  }

  if (strictMode && strictViolations.length > 0) {
    console.log(
      `[design-token-usage] strict baseline debt: ${strictViolations.length} files (no new violations)`,
    );
  }

  console.log('[design-token-usage] OK');
}

main();
