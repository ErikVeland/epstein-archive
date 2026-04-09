export interface ParsedReleaseNote {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

/**
 * Parses markdown release notes into a structured format.
 * Expects versions to be denoted by '## version x.x.x' or similar.
 */
export const parseReleaseNotes = (markdown: string): ParsedReleaseNote[] => {
  try {
    const sections: string[] = [];
    const lines = markdown.split('\n');
    let current: string[] = [];

    const isVersionHeading = (line: string): boolean =>
      /^##\s+(?:[Vv]ersion\s+|[Vv])?\d+\.\d+\.\d+\b/.test(line) ||
      /^#\s*📣\s*Epstein Archive\s+[Vv]\d+\.\d+\.\d+\b/.test(line);

    for (const line of lines) {
      if (isVersionHeading(line)) {
        if (current.length > 0) {
          sections.push(current.join('\n'));
          current = [];
        }
      }
      if (current.length > 0 || isVersionHeading(line)) {
        current.push(line);
      }
    }
    if (current.length > 0) {
      sections.push(current.join('\n'));
    }

    return sections
      .map((section): ParsedReleaseNote | null => {
        const sectionLines = section.split('\n').map((l) => l.trim());
        if (sectionLines.length === 0) return null;

        const headerLine = sectionLines[0];
        const versionMatch = headerLine.match(/(?:[Vv]ersion\s+|[Vv])?(\d+\.\d+\.\d+)/);
        const version = versionMatch ? `v${versionMatch[1]}` : 'Update';

        let date = 'Recent';
        const isoDate = headerLine.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoDate) date = isoDate[1];
        const parenDate = headerLine.match(/\(([^)]+)\)/);
        if (parenDate) date = parenDate[1];

        let title = 'Maintenance Update';
        const dashTitle = headerLine.match(/[—-]\s*(.+)$/);
        if (dashTitle) {
          const candidate = dashTitle[1].trim().replace(/^\d{4}-\d{2}-\d{2}\s*[—-]\s*/, '');
          if (candidate.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
            title = candidate;
          }
        }
        if (title === 'Maintenance Update') {
          const sectionHeading = sectionLines.find((line) => line.startsWith('### '));
          if (sectionHeading) {
            title = sectionHeading.replace(/^###\s+/, '').trim();
          }
        }

        const notes: string[] = [];
        for (const line of sectionLines) {
          if (line.startsWith('- ') || line.startsWith('* ')) {
            notes.push(line.substring(2));
          } else if (line.startsWith('### ')) {
            notes.push(line);
          }
        }

        return { version, date, title, notes };
      })
      .filter((record): record is ParsedReleaseNote => record !== null)
      .filter((record) => record.notes.length > 0 || record.title !== 'Maintenance Update')
      .sort((a, b) => {
        // Sort by version (descending)
        const vA = a.version.replace('v', '').split('.').map(Number);
        const vB = b.version.replace('v', '').split('.').map(Number);
        for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
          const numA = vA[i] || 0;
          const numB = vB[i] || 0;
          if (numA !== numB) return numB - numA;
        }
        return 0;
      });
  } catch (e) {
    console.error('Failed to parse release notes', e);
    return [];
  }
};
