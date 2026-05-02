import { EvidenceChain, AuthenticityScore, TransformationEvent } from '@client/types/investigation';
import { apiClient } from './apiClient';

/**
 * Evidence Chain Service
 *
 * Tracks document authenticity, provenance, and chain of custody
 * Essential for investigative journalism credibility and legal admissibility
 */
export class EvidenceChainService {
  private static instance: EvidenceChainService;

  private constructor() {}

  static getInstance(): EvidenceChainService {
    if (!EvidenceChainService.instance) {
      EvidenceChainService.instance = new EvidenceChainService();
    }
    return EvidenceChainService.instance;
  }

  /**
   * Generate evidence chain for a document
   */
  async generateEvidenceChain(documentId: string): Promise<EvidenceChain> {
    try {
      // Get document metadata
      const document = (await apiClient.getDocument(documentId)) as Record<string, unknown>;

      // Trigger/Get Server-side Analysis
      // This moves the heavy lifting to the server
      const analysis = (await apiClient.analyzeDocument(documentId)) as {
        metrics?: {
          readability?: boolean;
          metadataAnalysis?: boolean;
        };
        authenticityScore?: number;
      };
      const serverMetrics = analysis.metrics || {};
      const serverScore = (analysis.authenticityScore || 0) * 100;

      // Get Chain of Custody from Server
      const custodyChain = (await apiClient.getChainOfCustody(documentId)) as Array<
        Record<string, unknown>
      >;

      // Generate content hash (still useful client-side for verification)
      const contentHash = await this.generateContentHash((document.content as string) || '');

      // Build source provenance
      const sourceProvenance = this.buildSourceProvenance(document);

      // Track transformations (could also be from server, but we'll keep minimal logic here)
      const transformations = await this.trackTransformations(documentId);

      // Construct Authenticity Score object based on server data
      const authenticity: AuthenticityScore = {
        overall: Math.round(serverScore),
        factors: {
          sourceReliability: this.scoreSourceReliability(document), // Can move to server later
          chainIntegrity: custodyChain.length > 0 ? Math.min(100, custodyChain.length * 20 + 40) : 50,
          contentConsistency: serverMetrics.readability ? 80 : 50, // inferred from server metrics
          technicalAuthenticity: serverMetrics.metadataAnalysis ? 80 : 50,
          corroboration: 50,
        },
        assessmentDate: new Date(),
        assessedBy: 'Evidence Chain Service (Server Verified)',
        methodology: 'Server-side forensic analysis with client-side verification',
      };

      return {
        documentId,
        contentHash,
        sourceProvenance,
        transformations,
        authenticity,
        custodyChain: custodyChain.map((e: Record<string, unknown>) => ({
          ...e,
          date: new Date(e.date as string | number | Date),
        })) as NonNullable<EvidenceChain['custodyChain']>,
        verificationStatus: authenticity.overall > 80 ? 'verified' : 'pending',
      };
    } catch (error) {
      console.error('Error generating evidence chain:', error);
      throw new Error(`Failed to generate evidence chain for document ${documentId}`);
    }
  }

  /**
   * Generate cryptographic hash of document content
   */
  private async generateContentHash(content: string): Promise<string> {
    // Use Web Crypto API for browser compatibility
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Build source provenance information
   */
  private buildSourceProvenance(
    document: Record<string, unknown>,
  ): EvidenceChain['sourceProvenance'] {
    return {
      originalPath: String(document.file_path || document.fileName || 'unknown'),
      importDate: new Date((document.created_at as string | number | undefined) ?? Date.now()),
      importSource: String(document.source || 'archive'),
      importMethod: this.determineImportMethod(document),
      sourceReliability: this.assessSourceReliability(document),
      sourceDescription: String(document.description || 'Document from Epstein Archive'),
      chainOfCustodyDocuments: (document.custody_documents as string[]) || [],
    };
  }

  /**
   * Determine import method based on document metadata
   */
  private determineImportMethod(
    document: Record<string, unknown>,
  ): 'manual' | 'api' | 'scrape' | 'leak' {
    const source = String(document.source || '');
    const metadata = document.metadata as Record<string, unknown> | undefined;
    if (source.includes('leak') || source.includes('whistleblower')) {
      return 'leak';
    }
    if (source.includes('scrape') || source.includes('crawl')) {
      return 'scrape';
    }
    if (source.includes('api') || metadata?.api_source) {
      return 'api';
    }
    return 'manual';
  }

  /**
   * Assess source reliability
   */
  private assessSourceReliability(
    document: Record<string, unknown>,
  ): 'high' | 'medium' | 'low' | 'unknown' {
    const source = String(document.source || '').toLowerCase();

    if (source.includes('court') || source.includes('government') || source.includes('official')) {
      return 'high';
    }
    if (source.includes('news') || source.includes('media') || source.includes('report')) {
      return 'medium';
    }
    if (source.includes('leak') || source.includes('rumor') || source.includes('social')) {
      return 'low';
    }
    return 'unknown';
  }

  private scoreSourceReliability(document: Record<string, unknown>): number {
    const reliability = this.assessSourceReliability(document);
    switch (reliability) {
      case 'high':
        return 90;
      case 'medium':
        return 70;
      case 'low':
        return 40;
      default:
        return 20;
    }
  }

  /**
   * Track document transformations
   */
  private async trackTransformations(documentId: string): Promise<TransformationEvent[]> {
    const transformations: TransformationEvent[] = [];
    if (documentId.includes('_ocr')) {
      transformations.push({
        date: new Date(),
        type: 'ocr',
        description: 'Optical Character Recognition performed on document',
        inputHash: 'original_scan_hash',
        outputHash: 'ocr_text_hash',
        tool: 'Tesseract OCR',
        confidence: 0.85,
        operator: 'system',
      });
    }
    return transformations;
  }

  /**
   * Verify evidence chain integrity
   */
  async verifyEvidenceChain(evidenceChain: EvidenceChain): Promise<boolean> {
    try {
      // Verify content hash
      const document = (await apiClient.getDocument(evidenceChain.documentId)) as Record<
        string,
        unknown
      >;
      const currentHash = await this.generateContentHash((document.content as string) || '');

      if (currentHash !== evidenceChain.contentHash) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying evidence chain:', error);
      return false;
    }
  }

  /**
   * Get evidence chain summary
   */
  getEvidenceChainSummary(evidenceChain: EvidenceChain): string {
    const { authenticity, sourceProvenance, custodyChain } = evidenceChain;

    return `
Evidence Chain Summary:
- Overall Authenticity: ${authenticity.overall}/100
- Source Reliability: ${sourceProvenance.sourceReliability}
- Import Method: ${sourceProvenance.importMethod}
- Chain Length: ${custodyChain.length} events
- Verification Status: ${evidenceChain.verificationStatus}
- Last Assessment: ${authenticity.assessmentDate.toLocaleDateString()}
    `.trim();
  }
}
