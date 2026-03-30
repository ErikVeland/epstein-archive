import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'src/client');
const strictMode = process.env.STRICT_DESIGN_TOKENS === '1';
const writeStrictBaseline = process.env.WRITE_STRICT_BASELINE === '1';
const strictBaselinePath = path.join(rootDir, 'scripts/design-token-strict-baseline.json');
const enforcedFiles = [
  // Core common primitives
  'src/client/components/common/FormField.tsx',
  'src/client/components/common/Select.tsx',
  'src/client/components/common/SourceBadge.tsx',
  'src/client/components/common/Card.tsx',
  'src/client/components/common/BaseCard.tsx',
  'src/client/components/common/CloseButton.tsx',
  'src/client/components/common/ProgressBar.tsx',
  'src/client/components/common/Skeleton.tsx',
  'src/client/components/common/Tabs.tsx',
  'src/client/components/common/Tooltip.tsx',
  'src/client/components/common/BatchToolbar.tsx',
  'src/client/components/common/FormLayout.tsx',
  // Glass UI primitives — must be 100% token-clean
  'src/client/components/ui/GlassButton.tsx',
  'src/client/components/ui/GlassModal.tsx',
  'src/client/components/ui/GlassTooltip.tsx',
  'src/client/components/ui/GlassDropdown.tsx',
  'src/client/components/ui/GlassSwitch.tsx',
].map((filePath) => path.join(rootDir, filePath));
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
    'src/client/design-system/components/Button.tsx',
    'src/client/components/common/CloseButton.tsx',
    'src/client/components/common/ProgressBar.tsx',
    'src/client/components/common/SourceBadge.tsx',
    'src/client/components/common/Skeleton.tsx',
    'src/client/components/common/LoadingIndicator.tsx',
    'src/client/components/common/Card.tsx',
    'src/client/components/common/FormField.tsx',
    'src/client/components/common/Select.tsx',
    'src/client/components/common/Tabs.tsx',
    'src/client/components/common/Tooltip.tsx',
    'src/client/components/common/LoadingPill.tsx',
    'src/client/components/common/TagSelector.tsx',
    'src/client/components/common/BatchToolbar.tsx',
    'src/client/components/common/AddToInvestigationButton.tsx',
    'src/client/components/pages/LegalPage.tsx',
    'src/client/components/shared/DegradedBanner.tsx',
    'src/client/components/shared/SensitiveWarningBanner.tsx',
    'src/client/components/shared/AlbumSidebar.tsx',
    'src/client/components/shared/MediaBrowserLayout.tsx',
    'src/client/components/common/ErrorBoundary.tsx',
    'src/client/components/common/ToastProvider.tsx',
    'src/client/components/layout/SortFilter.tsx',
    'src/client/components/layout/SearchFilters.tsx',
    // Phase 7 — small common + layout components
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
    // Phase 8 — navigation + layout
    'src/client/components/layout/MobileMenu.tsx',
    'src/client/components/layout/Footer.tsx',
    // Phase 9a — page components
    'src/client/components/pages/StatsSkeleton.tsx',
    'src/client/components/pages/StatsDashboard.tsx',
    'src/client/components/pages/StatsDisplay.tsx',
    // Phase 9b
    'src/client/components/pages/FAQPage.tsx',
    'src/client/components/pages/DataQualityDashboard.tsx',
    // Phase 9c
    'src/client/components/pages/MemoryDashboard.tsx',
    // Phase 9d
    'src/client/components/pages/About.tsx',
  ].map((f) => path.join(rootDir, f)),
);

const tailwindUtilityPattern =
  /["'`][^"'`\n\r]*\b(flex|grid|items-center|items-start|justify-between|justify-center|gap-\d|p-\d|px-\d|py-\d|pt-\d|pb-\d|m-\d|mx-\d|my-\d|mt-\d|mb-\d|w-full|h-\d|text-(?:xs|sm|base|lg|xl)|font-(?:medium|bold|semibold|mono)|rounded(?:-(?:md|lg|xl|full|sm))?|overflow-(?:hidden|auto|scroll)|absolute|relative|hidden|block|inline-flex|inline-block|truncate|uppercase|transition-)\b[^"'`\n\r]*["'`]/;

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
    for (const pattern of forbiddenArbitraryUtilities) {
      pattern.lastIndex = 0;
      if (pattern.test(content)) {
        arbitraryViolations.push(path.relative(rootDir, filePath));
        break;
      }
    }
    if (strictMode || writeStrictBaseline) {
      strictClassPattern.lastIndex = 0;
      strictSpacingPattern.lastIndex = 0;
      if (strictClassPattern.test(content) || strictSpacingPattern.test(content)) {
        strictViolations.push(path.relative(rootDir, filePath));
      }
    }
    if (moduleGovernedFiles.has(filePath)) {
      if (tailwindUtilityPattern.test(content)) {
        violations.push(
          `${path.relative(rootDir, filePath)} — CSS module governed file contains Tailwind utility strings`,
        );
      }
    }
  }
  const configPath = path.join(rootDir, 'tailwind.config.js');
  const configContent = fs.readFileSync(configPath, 'utf8');
  const configRequirements = [
    'tokenizedPaletteFamilies',
    '--twc-',
    'var(--space-',
    'var(--radius-',
    'var(--shadow-',
  ];
  const missingConfigRequirements = configRequirements.filter(
    (requirement) => !configContent.includes(requirement),
  );

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
  }

  if (strictMode && strictViolations.length > 0) {
    console.log(
      `[design-token-usage] strict baseline debt: ${strictViolations.length} files (no new violations)`,
    );
  }

  console.log('[design-token-usage] OK');
}

main();
