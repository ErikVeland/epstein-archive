import { EntityNameService } from './EntityNameService';

export interface TitleExtractionResult {
  cleanName: string;
  title: string | null;
  role: string | null;
  confidence: number; // 0-1 score
}

export class TitleExtractor {
  // Title patterns with their corresponding roles
  private static readonly TITLE_PATTERNS = [
    // Political titles
    {
      pattern: /^(Former\s+)?(President|Vice President)\s+(.+)$/i,
      title: '$2',
      role: 'Political',
      titleGroup: 2,
      nameGroup: 3,
    },
    {
      pattern: /^(Senator|Sen\.)\s+(.+)$/i,
      title: 'Senator',
      role: 'Political',
      titleGroup: 1,
      nameGroup: 2,
    },
    {
      pattern: /^(Governor|Gov\.)\s+(.+)$/i,
      title: 'Governor',
      role: 'Political',
      titleGroup: 1,
      nameGroup: 2,
    },
    {
      pattern: /^(Representative|Rep\.)\s+(.+)$/i,
      title: 'Representative',
      role: 'Political',
      titleGroup: 1,
      nameGroup: 2,
    },
    {
      pattern: /^(Congressman|Congresswoman)\s+(.+)$/i,
      title: '$1',
      role: 'Political',
      titleGroup: 1,
      nameGroup: 2,
    },

    // Academic titles
    {
      pattern: /^(Professor|Prof\.)\s+(.+)$/i,
      title: 'Professor',
      role: 'Academic',
      titleGroup: 1,
      nameGroup: 2,
    },
    {
      pattern: /^(Dr\.|Doctor)\s+(.+)$/i,
      title: 'Dr',
      role: 'Academic',
      titleGroup: 1,
      nameGroup: 2,
    },

    // Royal/Noble titles
    {
      pattern: /^(Prince|Princess|King|Queen|Duke|Duchess|Lord|Lady|Sir)\s+(.+)$/i,
      title: '$1',
      role: 'Royal',
      titleGroup: 1,
      nameGroup: 2,
    },

    // Business titles
    {
      pattern: /^(CEO|CFO|COO|CTO|Chairman|Director)\s+(.+)$/i,
      title: '$1',
      role: 'Business',
      titleGroup: 1,
      nameGroup: 2,
    },

    // Military titles
    {
      pattern: /^(General|Colonel|Major|Captain|Lieutenant|Admiral)\s+(.+)$/i,
      title: '$1',
      role: 'Military',
      titleGroup: 1,
      nameGroup: 2,
    },
  ];

  /**
   * Extract title from entity name
   */
  static extract(fullName: string): TitleExtractionResult | null {
    const trimmed = fullName.trim();

    // Try each pattern
    for (const { pattern, role, titleGroup, nameGroup } of this.TITLE_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        const extractedTitle = match[titleGroup];
        const extractedName = match[nameGroup];

        // Validate the extracted name
        if (!EntityNameService.isValidPersonName(extractedName)) {
          // Invalid name after title extraction - reject entire entity
          return null;
        }

        return {
          cleanName: extractedName.trim(),
          title: extractedTitle.trim(),
          role: role,
          confidence: 0.95, // High confidence for pattern match
        };
      }
    }

    // No title found - check if name itself is valid
    if (EntityNameService.isValidPersonName(trimmed)) {
      return {
        cleanName: trimmed,
        title: null,
        role: null,
        confidence: 1.0, // Highest confidence for clean name
      };
    }

    // Check if it's a valid organization
    if (EntityNameService.isValidOrganizationName(trimmed)) {
      return {
        cleanName: trimmed,
        title: null,
        role: 'Organization',
        confidence: 1.0,
      };
    }

    // Invalid entity
    return null;
  }

  /**
   * Batch extract titles from multiple entities
   */
  static extractBatch(
    entities: Array<{ id: string; fullName: string }>,
  ): Map<string, TitleExtractionResult> {
    const results = new Map<string, TitleExtractionResult>();

    for (const entity of entities) {
      const result = this.extract(entity.fullName);
      if (result) {
        results.set(entity.id, result);
      }
    }

    return results;
  }

  /**
   * Get statistics on title extraction
   */
  static getExtractionStats(results: Map<string, TitleExtractionResult>): {
    total: number;
    withTitle: number;
    withoutTitle: number;
    byRole: { [role: string]: number };
    avgConfidence: number;
  } {
    let withTitle = 0;
    let withoutTitle = 0;
    const byRole: { [role: string]: number } = {};
    let totalConfidence = 0;

    for (const result of results.values()) {
      if (result.title) {
        withTitle++;
        const role = result.role || 'Unknown';
        byRole[role] = (byRole[role] || 0) + 1;
      } else {
        withoutTitle++;
      }
      totalConfidence += result.confidence;
    }

    return {
      total: results.size,
      withTitle,
      withoutTitle,
      byRole,
      avgConfidence: totalConfidence / results.size,
    };
  }

  /**
   * Normalize title variations
   */
  static normalizeTitle(title: string): string {
    const normalized = title.trim().toLowerCase();

    // Normalize common variations
    const titleMap: { [key: string]: string } = {
      pres: 'President',
      'pres.': 'President',
      sen: 'Senator',
      'sen.': 'Senator',
      gov: 'Governor',
      'gov.': 'Governor',
      rep: 'Representative',
      'rep.': 'Representative',
      prof: 'Professor',
      'prof.': 'Professor',
      dr: 'Dr',
      'dr.': 'Dr',
    };

    return titleMap[normalized] || title;
  }
}
