const fs = require('fs');
const path = require('path');

const cssMap = {
  flex: 'display: flex;',
  'flex-col': 'flex-direction: column;',
  'flex-row': 'flex-direction: row;',
  'flex-wrap': 'flex-wrap: wrap;',
  'flex-1': 'flex: 1 1 0%;',
  grid: 'display: grid;',
  'grid-cols-2': 'grid-template-columns: repeat(2, minmax(0, 1fr));',
  'grid-cols-3': 'grid-template-columns: repeat(3, minmax(0, 1fr));',
  'items-center': 'align-items: center;',
  'items-start': 'align-items: flex-start;',
  'items-end': 'align-items: flex-end;',
  'justify-between': 'justify-content: space-between;',
  'justify-center': 'justify-content: center;',
  'justify-end': 'justify-content: flex-end;',
  'justify-start': 'justify-content: flex-start;',
  'w-full': 'width: 100%;',
  'h-full': 'height: 100%;',
  'min-h-0': 'min-height: 0;',
  relative: 'position: relative;',
  absolute: 'position: absolute;',
  fixed: 'position: fixed;',
  'inset-0': 'inset: 0;',
  hidden: 'display: none;',
  block: 'display: block;',
  'inline-flex': 'display: inline-flex;',
  'inline-block': 'display: inline-block;',
  truncate: 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
  uppercase: 'text-transform: uppercase;',
  'overflow-hidden': 'overflow: hidden;',
  'overflow-auto': 'overflow: auto;',
  'overflow-y-auto': 'overflow-y: auto;',
  'overflow-x-auto': 'overflow-x: auto;',
  'transition-all': 'transition: all 0.2s ease;',
  'transition-colors':
    'transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;',
  'cursor-pointer': 'cursor: pointer;',
  'cursor-not-allowed': 'cursor: not-allowed;',
  'text-center': 'text-align: center;',
  'text-right': 'text-align: right;',
  'text-left': 'text-align: left;',
  'font-medium': 'font-weight: 500;',
  'font-semibold': 'font-weight: 600;',
  'font-bold': 'font-weight: 700;',
  'font-mono': 'font-family: var(--font-mono);',
};

const mapSize = (val) => {
  const num = parseInt(val, 10);
  if (isNaN(num)) return `var(--space-${val})`;
  return `${num * 0.25}rem`;
};

const mapVar = (val) => {
  if (val.startsWith('[var(') && val.endsWith(')]')) {
    return val.slice(1, -1); // var(--xxx)
  }
  return val;
};

const fileList = [
  'EvidenceSearch.tsx',
  'investigation/BoardOnboarding.tsx',
  'investigation/ChainOfCustodyModal.tsx',
  'investigation/CommunicationAnalysis.tsx',
  'investigation/EvidenceNotebook.tsx',
  'investigation/EvidencePacketExporter.tsx',
  'investigation/ForensicAnalysisWorkspace.tsx',
  'investigation/ForensicDocumentAnalyzer.tsx',
  'investigation/ForensicReportGenerator.tsx',
  'investigation/HypothesisTestingFramework.tsx',
  'investigation/InvestigationActivityFeed.tsx',
  'investigation/InvestigationBoard.tsx',
  'investigation/InvestigationCaseFolder.tsx',
  'investigation/InvestigationEvidencePanel.tsx',
  'investigation/InvestigationExportTools.tsx',
  'investigation/InvestigationMemoryPanel.tsx',
  'investigation/InvestigationOnboarding.tsx',
  'investigation/InvestigationTasksPanel.tsx',
  'investigation/InvestigationTeamManagement.tsx',
  'investigation/InvestigationTimelineBuilder.tsx',
  'investigation/MultiSourceCorrelationEngine.tsx',
];

let classCounter = 0;

fileList.forEach((fileRel) => {
  const filePath = path.join(__dirname, '..', 'src', 'client', 'components', fileRel);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;

  const parsedCss = [];

  // Find all className="something"
  content = content.replace(/className=(["'`])([^"'`]+)\1/g, (match, quote, classStr) => {
    // If it doesn't contain tailwind classes, ignore
    if (
      !classStr
        .split(' ')
        .some(
          (c) =>
            Object.keys(cssMap).includes(c) || /^(p|m|gap|w|h|text|bg|border|rounded|z)-/.test(c),
        )
    ) {
      return match;
    }

    const classes = classStr.split(' ').filter((c) => c.trim());
    let cssRules = [];

    classes.forEach((c) => {
      if (cssMap[c]) {
        cssRules.push(cssMap[c]);
      } else if (c.startsWith('gap-')) {
        cssRules.push(`gap: ${mapSize(c.split('-')[1])};`);
      } else if (c.startsWith('p-')) {
        cssRules.push(`padding: ${mapSize(c.split('-')[1])};`);
      } else if (c.startsWith('px-')) {
        const s = mapSize(c.split('-')[1]);
        cssRules.push(`padding-left: ${s}; padding-right: ${s};`);
      } else if (c.startsWith('py-')) {
        const s = mapSize(c.split('-')[1]);
        cssRules.push(`padding-top: ${s}; padding-bottom: ${s};`);
      } else if (c.startsWith('m-')) {
        cssRules.push(`margin: ${mapSize(c.split('-')[1])};`);
      } else if (c.startsWith('mt-')) {
        cssRules.push(`margin-top: ${mapSize(c.split('-')[1])};`);
      } else if (c.startsWith('mb-')) {
        cssRules.push(`margin-bottom: ${mapSize(c.split('-')[1])};`);
      } else if (c.startsWith('text-')) {
        const val = c.replace('text-', '');
        cssRules.push(`color: ${mapVar(val)};`);
      } else if (c.startsWith('bg-')) {
        const val = c.replace('bg-', '');
        cssRules.push(`background-color: ${mapVar(val)};`);
      } else if (c.startsWith('border-')) {
        const val = c.replace('border-', '');
        cssRules.push(`border-color: ${mapVar(val)};`);
      } else if (c === 'border') {
        cssRules.push(`border-width: 1px; border-style: solid;`);
      } else if (c.startsWith('rounded')) {
        if (c === 'rounded-full') cssRules.push(`border-radius: 9999px;`);
        else cssRules.push(`border-radius: var(--radius-${c.replace('rounded-', '')});`);
      } else {
        cssRules.push(`/* Missing: ${c} */`);
      }
    });

    const className = `autoGen${classCounter++}`;
    parsedCss.push(`.${className} {\n  ${cssRules.join('\n  ')}\n}`);
    hasChanges = true;
    return `className={styles.${className}}`;
  });

  if (hasChanges) {
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const cssPath = path.join(path.dirname(filePath), `${baseName}.module.css`);

    fs.appendFileSync(cssPath, `\n${parsedCss.join('\n\n')}\n`);

    if (!content.includes('import styles')) {
      // Find last import
      const lastImport = content.lastIndexOf('import ');
      const endOfImport = content.indexOf('\n', lastImport);
      content =
        content.slice(0, endOfImport + 1) +
        `import styles from './${baseName}.module.css';\n` +
        content.slice(endOfImport + 1);
    }
    fs.writeFileSync(filePath, content);
    console.log(`Processed ${fileRel}`);
  }
});
