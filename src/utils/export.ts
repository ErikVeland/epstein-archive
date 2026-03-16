import { Person } from '../types';

export const exportData = {
  // Export data as CSV
  toCSV: (people: Person[], filename: string = 'epstein_data.csv') => {
    const headers = [
      'Full Name',
      'Primary Role',
      'Secondary Roles',
      'Likelihood Level',
      'Mentions',
      'Current Status',
      'Key Evidence',
      'File References',
      'Connections to Epstein',
    ];

    const csvContent = [
      headers.join(','),
      ...people.map((person) =>
        [
          `"${person.name}"`,
          `"${person.evidenceTypes?.[0] || 'Unknown'}"`,
          `"${person.evidenceTypes?.slice(1).join(', ') || ''}"`,
          `"${person.likelihoodScore}"`,
          `"${person.mentions}"`,
          `"${person.likelihoodScore}"`,
          `"${person.redFlagDescription || 'No key evidence'}"`,
          '${person.files}',
          "${person.contexts?.[0]?.context || 'No connections data'}",
        ].join(','),
      ),
    ].join('\n');

    downloadFile(csvContent, filename, 'text/csv');
  },

  // Export data as JSON
  toJSON: (people: Person[], filename: string = 'epstein_data.json') => {
    const jsonContent = JSON.stringify(people, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
  },

  // Export summary statistics
  toSummary: (people: Person[], filename: string = 'epstein_summary.txt') => {
    const summary = generateSummary(people);
    downloadFile(summary, filename, 'text/plain');
  },

  // Export chart as image
  exportChart: (_chartElement: HTMLElement, _filename: string = 'chart.png') => {
    // This would require html2canvas or similar library
    // For now, we'll create a placeholder function
    console.log('Chart export functionality requires html2canvas library');
  },
};

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateSummary(people: Person[]): string {
  const highRisk = people.filter((p) => p.likelihoodScore === 'HIGH').length;
  const mediumRisk = people.filter((p) => p.likelihoodScore === 'MEDIUM').length;
  const lowRisk = people.filter((p) => p.likelihoodScore === 'LOW').length;
  const totalMentions = people.reduce((sum, p) => sum + p.mentions, 0);
  const avgMentions = Math.round(totalMentions / people.length);

  const topMentioned = people
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 5)
    .map((p, i) => `${i + 1}. ${p.name}: ${p.mentions.toLocaleString()} mentions`)
    .join('\n');

  const roleDistribution = people.reduce(
    (acc, person) => {
      const role = person.evidenceTypes?.[0] || 'Unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topRoles = Object.entries(roleDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([role, count]) => `${role}: ${count} people`)
    .join('\n');

  return `EPSTEIN FILES ANALYSIS SUMMARY
Generated on: ${new Date().toLocaleDateString()}

=== OVERVIEW ===
Total Individuals Analyzed: ${people.length}
Total Mentions: ${totalMentions.toLocaleString()}
Average Mentions per Person: ${avgMentions}

=== RISK ASSESSMENT ===
HIGH Risk: ${highRisk} people (${Math.round((highRisk / people.length) * 100)}%)
MEDIUM Risk: ${mediumRisk} people (${Math.round((mediumRisk / people.length) * 100)}%)
LOW Risk: ${lowRisk} people (${Math.round((lowRisk / people.length) * 100)}%)

=== TOP MENTIONED INDIVIDUALS ===
${topMentioned}

=== ROLE DISTRIBUTION ===
${topRoles}

=== KEY FINDINGS ===
- Most mentioned individual appears in ${Math.max(...people.map((p) => p.mentions)).toLocaleString()} documents
- 0 individuals have been convicted (no conviction data available)
- 0 individuals are deceased (no deceased data available)
- Analysis covers ${people.reduce((sum, p) => sum + p.files, 0)} total files

=== METHODOLOGY ===
This analysis is based on text extraction from Epstein Files including emails, flight logs, testimonies, and legal documents. 
Mention counts represent frequency of name appearances across all processed documents.
Risk levels are classified based on evidence patterns and legal outcomes.

=== DATA SOURCES ===
- OCR text from image files (001-OCR.txt through 012-OCR.txt)
- Email communications and correspondence
- Flight logs and travel records
- Legal documents and court filings
- Testimonies and witness statements
- Financial records and business documents

This summary provides a high-level overview of the comprehensive Epstein Files analysis.`;
}
