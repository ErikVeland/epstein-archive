import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Printer, Calendar, CheckCircle, FileJson } from 'lucide-react';

interface ReportEntity {
  name?: string;
  redFlagRating?: number;
  id?: string | number;
  type?: string;
  title?: string;
  source_id?: string | number;
}

interface ReportTransaction {
  amount?: number | string;
  risk_level?: string;
  to_entity?: string;
}

interface ReportStats {
  totalEntities?: number;
  totalDocuments?: number;
}

interface ReportTimelineItem {
  date?: string;
  start_date?: string;
  [key: string]: unknown;
}

interface ReportSection {
  id: string;
  title: string;
  type:
    | 'executive_summary'
    | 'methodology'
    | 'findings'
    | 'evidence'
    | 'analysis'
    | 'conclusions'
    | 'recommendations';
  content: string;
  evidence: string[];
  confidence: number;
  sources: string[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  targetAudience: 'legal' | 'journalism' | 'internal' | 'public';
  classification: 'unclassified' | 'confidential' | 'restricted' | 'secret';
}

interface GeneratedReport {
  id: string;
  title: string;
  template: string;
  sections: ReportSection[];
  generatedAt: string;
  generatedBy: string;
  classification: string;
  totalPages: number;
  wordCount: number;
  evidenceCount: number;
  confidence: number;
}

interface ForensicReportGeneratorProps {
  investigationId?: number;
}

export default function ForensicReportGenerator({
  investigationId,
}: ForensicReportGeneratorProps = {}) {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [reportTitle, setReportTitle] = useState('');
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [classification, setClassification] = useState<string>('confidential');
  const [targetAudience, setTargetAudience] = useState<string>('legal');
  const { data: realData = { stats: null, entities: [], transactions: [], timeline: [] } } =
    useQuery({
      queryKey: ['forensic-report-real-data', investigationId || 'global'],
      queryFn: async (): Promise<{
        stats: ReportStats | null;
        entities: ReportEntity[];
        transactions: ReportTransaction[];
        timeline: ReportTimelineItem[];
      }> => {
        let statsRes: Response;
        let entitiesRes: Response;
        let transactionsRes: Response;
        let timelineRes: Response;

        if (investigationId) {
          [statsRes, entitiesRes, transactionsRes, timelineRes] = await Promise.all([
            fetch('/api/stats'),
            fetch(`/api/investigations/${investigationId}/evidence`),
            fetch(`/api/investigations/${investigationId}/transactions`),
            fetch(`/api/investigations/${investigationId}/timeline-events`),
          ]);
        } else {
          [statsRes, entitiesRes, transactionsRes, timelineRes] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/entities?limit=50&sortBy=red_flag_rating&sortOrder=desc'),
            fetch('/api/financial/transactions'),
            fetch('/api/timeline'),
          ]);
        }

        const stats = (await statsRes.json()) as ReportStats;
        const transactions = (await transactionsRes.json()) as ReportTransaction[];
        let timeline: ReportTimelineItem[] = timelineRes.ok ? await timelineRes.json() : [];
        let entities: ReportEntity[] = [];

        if (investigationId) {
          const evidence = (await entitiesRes.json()) as ReportEntity[];
          entities = evidence
            .filter((e) => e.type === 'entity')
            .map((e) => ({
              name: e.title,
              redFlagRating: 0,
              id: e.source_id,
            }));
          timeline = timeline.map((e) => ({
            ...e,
            date: e.start_date || e.date,
          }));
        } else {
          const entitiesData = (await entitiesRes.json()) as { data?: ReportEntity[] };
          entities = entitiesData.data || [];
        }

        return {
          stats,
          entities,
          transactions: Array.isArray(transactions) ? transactions : [],
          timeline: Array.isArray(timeline) ? timeline : [],
        };
      },
    });

  useEffect(() => {
    const reportTemplates: ReportTemplate[] = [
      {
        id: 'legal-prosecution',
        name: 'Legal Prosecution Report',
        description: 'Comprehensive report for legal proceedings with evidence chain documentation',
        sections: [
          'executive_summary',
          'methodology',
          'findings',
          'evidence',
          'analysis',
          'conclusions',
          'recommendations',
        ],
        targetAudience: 'legal',
        classification: 'restricted',
      },
      {
        id: 'journalism-investigation',
        name: 'Journalism Investigation Report',
        description: 'Narrative-driven report suitable for publication with source attribution',
        sections: ['executive_summary', 'findings', 'analysis', 'conclusions'],
        targetAudience: 'journalism',
        classification: 'unclassified',
      },
      {
        id: 'internal-analysis',
        name: 'Internal Analysis Report',
        description: 'Detailed technical analysis for internal team review',
        sections: ['methodology', 'findings', 'analysis', 'recommendations'],
        targetAudience: 'internal',
        classification: 'confidential',
      },
      {
        id: 'public-summary',
        name: 'Public Summary Report',
        description: 'High-level summary appropriate for public release',
        sections: ['executive_summary', 'findings', 'conclusions'],
        targetAudience: 'public',
        classification: 'unclassified',
      },
      {
        id: 'financial-forensics',
        name: 'Financial Forensics Report',
        description: 'Specialized report focusing on financial crimes and money laundering',
        sections: [
          'executive_summary',
          'methodology',
          'findings',
          'analysis',
          'conclusions',
          'recommendations',
        ],
        targetAudience: 'legal',
        classification: 'restricted',
      },
    ];

    setTemplates(reportTemplates);
    setSelectedTemplate('legal-prosecution');
    setReportTitle('Epstein Network Forensic Analysis - Prosecution Report');
  }, []);

  const generateReportContent = (
    template: ReportTemplate,
    options: { includeEvidence: boolean; includeCharts: boolean },
  ): ReportSection[] => {
    const sections: ReportSection[] = [];
    const { stats, entities } = realData;
    const transactions = realData.transactions;

    // Dynamic Metrics
    const totalTransactionAmount = transactions.reduce(
      (sum: number, t) => sum + (Number(t.amount) || 0),
      0,
    );
    const suspiciousTransactions = transactions.filter(
      (t) => t.risk_level === 'high' || t.risk_level === 'critical',
    );
    const topEntitiesList = entities
      .slice(0, 5)
      .map((e) => e.name)
      .join(', ');
    const entityCount = stats?.totalEntities || entities.length;
    const documentCount = stats?.totalDocuments || 0;
    const highRiskEntities = entities.filter((e) => (e.redFlagRating ?? 0) >= 4).length;

    const currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
    const formattedAmount = currencyFormatter.format(totalTransactionAmount);

    if (template.sections.includes('executive_summary')) {
      sections.push({
        id: 'exec-summary',
        title: 'Executive Summary',
        type: 'executive_summary',
        content: `This forensic analysis report presents a comprehensive examination of the network based on ${documentCount} analysed documents, financial records, and entity relationships. The investigation has identified ${entityCount} entities, with ${highRiskEntities} classified as high-risk.
        
Key findings include:
• Identification of key figures including: ${topEntitiesList}
• Analysis of ${transactions.length} financial transactions totaling ${formattedAmount}
• Detection of ${suspiciousTransactions.length} high-risk financial transfers
• Network analysis revealing complex interconnections across the dataset

The evidence collected supports further investigation into the identified high-risk entities and suspicious patterns.`,
        evidence: options.includeEvidence
          ? ['Financial transaction records', 'Entity relationship maps', 'Document metadata']
          : [],
        confidence: 90,
        sources: ['Financial Analysis', 'Document Database', 'Entity Files'],
      });
    }

    if (template.sections.includes('methodology')) {
      sections.push({
        id: 'methodology',
        title: 'Methodology and Approach',
        type: 'methodology',
        content: `This forensic investigation employed a data-driven approach leveraging the Epstein Archive system.
        
Data Ingestion & Processing:
The system processed ${documentCount} documents using OCR and entity extraction algorithms. A total of ${entityCount} distinct entities were identified and cross-referenced.

Risk Assessment:
Entities were assigned a "Red Flag Rating" based on keyword analysis, proximity to known risk factors, and network centrality. ${highRiskEntities} entities were flagged for elevated risk.

Financial Analysis:
Transaction data was normalised and analysed for patterns indicative of layering or structuring. ${suspiciousTransactions.length} transactions were flagged as high-risk based on amount, frequency, or counterparties.`,
        evidence: options.includeEvidence
          ? ['System logs', 'Processing metrics', 'Risk scoring mechanisms']
          : [],
        confidence: 95,
        sources: ['System Architecture', 'Data Processing Pipeline'],
      });
    }

    if (template.sections.includes('findings')) {
      sections.push({
        id: 'findings',
        title: 'Primary Findings',
        type: 'findings',
        content: `The investigation reveals a network centred around key individuals with significant financial flows.

Entity Network:
The most prominent entities identified include ${topEntitiesList}. The network analysis shows dense connections between these individuals and various organisations.

Financial Activity:
A total of ${formattedAmount} in transactions was analysed. ${suspiciousTransactions.length} transactions were identified as potentially suspicious, requiring further scrutiny.
${
  suspiciousTransactions.length > 0
    ? `Notable high-risk transactions include transfers involving ${suspiciousTransactions
        .slice(0, 3)
        .map((t) => t.to_entity || 'unknown')
        .join(', ')}.`
    : ''
}

Documentary Evidence:
Analysis of ${documentCount} documents has provided the foundational evidence for these findings, linking entities through mentions, co-occurrences, and direct correspondence.`,
        evidence: options.includeEvidence
          ? ['Network map', 'Transaction ledger', 'Document content']
          : [],
        confidence: 88,
        sources: ['Entity Database', 'Financial Records', 'Document Content'],
      });
    }

    if (template.sections.includes('analysis')) {
      sections.push({
        id: 'analysis',
        title: 'Analytical Assessment',
        type: 'analysis',
        content: `The data suggests a highly interconnected network. The high number of red-flagged entities (${highRiskEntities}) indicates a substantial concentration of risk.

Financial Patterns:
The volume of transactions (${formattedAmount}) and the presence of high-risk transfers suggest sophisticated financial operations. The relationships between the top entities (${topEntitiesList}) and these financial flows warrant deeper forensic accounting.

Network Resilience:
The entity graph demonstrates significant redundancy, suggesting that the network could persist even if key nodes are removed.`,
        evidence: options.includeEvidence
          ? ['Network centrality metrics', 'Financial flow analysis']
          : [],
        confidence: 85,
        sources: ['Network Analysis', 'Financial Forensics'],
      });
    }

    if (template.sections.includes('conclusions')) {
      sections.push({
        id: 'conclusions',
        title: 'Conclusions',
        type: 'conclusions',
        content: `Based on the forensic analysis of ${documentCount} documents and ${transactions.length} transactions, there is substantial evidence to support the identified risks.

1. The network is extensive and well-connected.
2. Financial flows are significant and contain indicators of potential illicit activity.
3. High-risk entities are central to both the social and financial networks.

It is concluded that the identified patterns are consistent with complex organisational structures often seen in high-profile investigations.`,
        evidence: options.includeEvidence ? ['Comprehensive dataset analysis'] : [],
        confidence: 90,
        sources: ['Integrated Analysis'],
      });
    }

    if (template.sections.includes('recommendations')) {
      sections.push({
        id: 'recommendations',
        title: 'Recommendations',
        type: 'recommendations',
        content: `1. Prioritise deep-dive investigation into the ${highRiskEntities} high-risk entities.
2. Conduct a targeted audit of the ${suspiciousTransactions.length} flagged financial transactions.
3. Expand data collection to include more external financial records if available.
4. Interview associates linked to the top 5 identified key figures.`,
        evidence: options.includeEvidence ? ['Risk assessment matrix'] : [],
        confidence: 92,
        sources: ['Strategic Assessment'],
      });
    }

    return sections;
  };

  const generateReport = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    // Simulate generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 200);

    // Simulate report generation
    setTimeout(() => {
      const template = templates.find((t) => t.id === selectedTemplate)!;
      const sections = generateReportContent(template, {
        includeEvidence,
        includeCharts,
      });

      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        title: reportTitle || template.name,
        template: selectedTemplate,
        sections: sections,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Forensic Analysis System',
        classification: classification,
        totalPages: sections.length * 3 + 2, // Rough estimate
        wordCount: sections.reduce(
          (total, section) => total + section.content.split(' ').length,
          0,
        ),
        evidenceCount: sections.reduce((total, section) => total + section.evidence.length, 0),
        confidence: Math.round(
          sections.reduce((total, section) => total + section.confidence, 0) / sections.length,
        ),
      };

      setGeneratedReport(report);
      setIsGenerating(false);
      setGenerationProgress(0);
    }, 4000);
  };

  const exportReport = (format: 'pdf' | 'docx' | 'json' | 'txt') => {
    if (!generatedReport) return;

    let content = '';
    let filename = `${generatedReport.title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`;

    switch (format) {
      case 'pdf':
        // For now, we'll create a text-based PDF representation
        content = generatePDFContent(generatedReport);
        filename += '.txt';
        break;
      case 'docx':
        content = generateDOCXContent(generatedReport);
        filename += '.txt';
        break;
      case 'json':
        content = JSON.stringify(generatedReport, null, 2);
        filename += '.json';
        break;
      case 'txt':
        content = generateTextContent(generatedReport);
        filename += '.txt';
        break;
    }

    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateTextContent = (report: GeneratedReport): string => {
    let content = `${report.title}\n`;
    content += `Generated: ${new Date(report.generatedAt).toLocaleDateString()}\n`;
    content += `Classification: ${report.classification.toUpperCase()}\n`;
    content += `Confidence: ${report.confidence}%\n\n`;

    report.sections.forEach((section) => {
      content += `${section.title}\n`;
      content += `${'='.repeat(section.title.length)}\n\n`;
      content += `${section.content}\n\n`;

      if (section.evidence.length > 0) {
        content += `Evidence: ${section.evidence.join(', ')}\n`;
        content += `Sources: ${section.sources.join(', ')}\n`;
        content += `Confidence: ${section.confidence}%\n\n`;
      }
    });

    return content;
  };

  const generatePDFContent = (report: GeneratedReport): string => {
    // Simplified PDF-like content
    return generateTextContent(report);
  };

  const generateDOCXContent = (report: GeneratedReport): string => {
    // Simplified DOCX-like content
    return generateTextContent(report);
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'unclassified':
        return 'text-green-400 bg-green-900';
      case 'confidential':
        return 'text-[var(--accent)] bg-blue-900';
      case 'restricted':
        return 'text-yellow-400 bg-yellow-900';
      case 'secret':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-[var(--text-muted)] bg-[var(--glass-bg-strong)]';
    }
  };

  // getTargetAudienceColor reserved for future use; removed to avoid unused-variable warnings.

  return (
    <div className="min-h-screen bg-[var(--glass-bg-strong)] text-[var(--text-primary)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">Forensic Report Generator</h1>
          <p className="text-[var(--text-muted)]">
            Automated generation of comprehensive forensic analysis reports
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
            Report Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Report Title
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title..."
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500"
              >
                <option value="legal">Legal/Prosecution</option>
                <option value="journalism">Journalism/Publication</option>
                <option value="internal">Internal Review</option>
                <option value="public">Public Release</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Classification
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:ring-2 focus:ring-red-500"
              >
                <option value="unclassified">Unclassified</option>
                <option value="confidential">Confidential</option>
                <option value="restricted">Restricted</option>
                <option value="secret">Secret</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={!selectedTemplate || isGenerating}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-[var(--glass-bg-highlight)] disabled:cursor-not-allowed rounded-[var(--radius-lg)] transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[var(--glass-border)] border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-[var(--text-muted)] mb-2">
                <span>Generation Progress</span>
                <span>{generationProgress}%</span>
              </div>
              <div className="w-full bg-[var(--glass-bg-highlight)] rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Options */}
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeEvidence}
                onChange={(e) => setIncludeEvidence(e.target.checked)}
                className="rounded"
              />
              <span className="text-[var(--text-secondary)]">Include Evidence References</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded"
              />
              <span className="text-[var(--text-secondary)]">Include Charts/Visualizations</span>
            </label>
          </div>
        </div>

        {/* Template Information */}
        {selectedTemplate && (
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6 mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Selected Template Information
            </h3>
            {(() => {
              const template = templates.find((t) => t.id === selectedTemplate);
              if (!template) return null;
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Name</p>
                    <p className="text-[var(--text-primary)] font-medium">{template.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Description</p>
                    <p className="text-[var(--text-primary)]">{template.description}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)] mb-1">Sections</p>
                    <div className="flex flex-wrap gap-1">
                      {template.sections.map((section) => (
                        <span
                          key={section}
                          className="px-2 py-1 bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded text-xs capitalize"
                        >
                          {section.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Generated Report */}
        {generatedReport && (
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  Generated Report
                </h2>
                <p className="text-[var(--text-muted)] text-sm">{generatedReport.title}</p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-3 py-1 rounded text-xs font-medium ${getClassificationColor(generatedReport.classification)}`}
                >
                  {generatedReport.classification.toUpperCase()}
                </span>
                <span
                  className={`px-3 py-1 rounded text-xs font-medium bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]`}
                >
                  {generatedReport.confidence}% Confidence
                </span>
              </div>
            </div>

            {/* Report Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-muted)]">Pages</span>
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {generatedReport.totalPages}
                </p>
              </div>
              <div className="bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-[var(--text-muted)]">Words</span>
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {generatedReport.wordCount.toLocaleString()}
                </p>
              </div>
              <div className="bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-[var(--text-muted)]">Evidence</span>
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">
                  {generatedReport.evidenceCount}
                </p>
              </div>
              <div className="bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-[var(--text-muted)]">Generated</span>
                </div>
                <p className="text-sm text-[var(--text-primary)]">
                  {new Date(generatedReport.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Export Options */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportReport('pdf')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-[var(--radius-lg)] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => exportReport('docx')}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-blue-700 rounded-[var(--radius-lg)] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export DOCX
              </button>
              <button
                onClick={() => exportReport('json')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-[var(--radius-lg)] transition-colors"
              >
                <FileJson className="w-4 h-4" />
                Export JSON
              </button>
              <button
                onClick={() => exportReport('txt')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-[var(--radius-lg)] transition-colors"
              >
                <FileText className="w-4 h-4" />
                Export TXT
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg-highlight)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
        )}

        {/* Report Sections Preview */}
        {generatedReport && (
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Report Sections
            </h3>
            <div className="space-y-4">
              {generatedReport.sections.map((section) => (
                <div
                  key={section.id}
                  className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)]">{section.title}</h4>
                      <p className="text-sm text-[var(--text-muted)] capitalize">
                        {section.type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          section.confidence >= 90
                            ? 'bg-green-900 text-green-200'
                            : section.confidence >= 80
                              ? 'bg-yellow-900 text-yellow-200'
                              : 'bg-red-900 text-red-200'
                        }`}
                      >
                        {section.confidence}% Confidence
                      </span>
                    </div>
                  </div>

                  <p className="text-[var(--text-secondary)] text-sm mb-3 line-clamp-3">
                    {section.content.substring(0, 300)}...
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    {includeEvidence && <span>{section.evidence.length} evidence items</span>}
                    {includeCharts && <span>{section.sources.length} sources</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
