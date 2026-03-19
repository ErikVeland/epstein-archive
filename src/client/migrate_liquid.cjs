const fs = require('fs');
const path = require('path');

const dirToProcess = process.argv[2] || path.join(__dirname, 'components');

const replacements = [
  // Backgrounds specific opacities
  {
    regex: /bg-(?:slate|gray|zinc|neutral|stone)-900\/(\d+)/g,
    replacement: 'bg-[var(--glass-bg-strong)]/$1',
  },
  {
    regex: /bg-(?:slate|gray|zinc|neutral|stone)-800\/(\d+)/g,
    replacement: 'bg-[var(--glass-bg)]/$1',
  },
  {
    regex: /bg-(?:slate|gray|zinc|neutral|stone)-700\/(\d+)/g,
    replacement: 'bg-[var(--glass-bg-highlight)]/$1',
  },
  {
    regex: /bg-(?:slate|gray|zinc|neutral|stone)-[5-6]00\/(\d+)/g,
    replacement: 'bg-[var(--glass-bg-highlight)]/$1',
  },
  {
    regex: /bg-(?:slate|gray|zinc|neutral|stone)-900/g,
    replacement: 'bg-[var(--glass-bg-strong)]',
  },
  { regex: /bg-(?:slate|gray|zinc|neutral|stone)-800/g, replacement: 'bg-[var(--glass-bg)]' },
  {
    regex: /bg-(?:slate|gray|zinc|neutral|stone)-[5-7]00/g,
    replacement: 'bg-[var(--glass-bg-highlight)]',
  },
  { regex: /bg-(?:slate|gray|zinc|neutral|stone)-[1-4]00/g, replacement: 'bg-[var(--app-bg)]' },
  { regex: /bg-(?:slate|gray|zinc|neutral|stone)-50/g, replacement: 'bg-[var(--app-bg)]' },

  // Accents
  { regex: /bg-(?:cyan|blue|indigo)-(?:400|500|600)/g, replacement: 'bg-[var(--accent)]' },
  { regex: /text-(?:cyan|blue|indigo)-(?:300|400|500|600)/g, replacement: 'text-[var(--accent)]' },
  { regex: /border-(?:cyan|blue|indigo)-(?:400|500|600)/g, replacement: 'border-[var(--accent)]' },
  { regex: /ring-(?:cyan|blue|indigo)-(?:400|500|600)/g, replacement: 'ring-[var(--accent)]' },

  // Borders
  {
    regex: /border-(?:slate|gray|zinc|neutral|stone)-[6-9]00(?:\/[0-9]+)?/g,
    replacement: 'border-[var(--glass-border)]',
  },
  {
    regex: /border-(?:slate|gray|zinc|neutral|stone)-[1-5]00(?:\/[0-9]+)?/g,
    replacement: 'border-[var(--glass-border)]',
  },

  // Text
  { regex: /text-white/g, replacement: 'text-[var(--text-primary)]' },
  {
    regex: /text-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200)/g,
    replacement: 'text-[var(--text-primary)]',
  },
  {
    regex: /text-(?:slate|gray|zinc|neutral|stone)-300/g,
    replacement: 'text-[var(--text-secondary)]',
  },
  {
    regex: /text-(?:slate|gray|zinc|neutral|stone)-(?:400|500)/g,
    replacement: 'text-[var(--text-muted)]',
  },
  {
    regex: /text-(?:slate|gray|zinc|neutral|stone)-(?:600|700|800|900)/g,
    replacement: 'text-[var(--text-primary)]',
  },

  // Shadows
  {
    regex: /shadow-(?:slate|gray|zinc|neutral|stone)-[0-9]{2,3}(?:\/[0-9]+)?/g,
    replacement: 'shadow-[var(--glass-shadow)]',
  },
  { regex: /shadow-(?:2xl|xl|lg|md)/g, replacement: 'shadow-[var(--glass-shadow)]' },

  // Rounded
  { regex: /rounded-2xl/g, replacement: 'rounded-[var(--radius-xl)]' },
  { regex: /rounded-xl/g, replacement: 'rounded-[var(--radius-xl)]' },
  { regex: /rounded-lg/g, replacement: 'rounded-[var(--radius-lg)]' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  replacements.forEach(({ regex, replacement }) => {
    newContent = newContent.replace(regex, replacement);
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir) {
  let count = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      count += walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (processFile(fullPath)) {
        count++;
      }
    }
  }
  return count;
}

const numUpdated = walkDir(dirToProcess);
console.log(`\nTotal files updated: ${numUpdated}`);
