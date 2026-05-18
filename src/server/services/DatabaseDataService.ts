import { Person, SearchFilters, SortOption } from '../../types.js';
import { entitiesRepository } from '../db/entitiesRepository.js';
import { statsRepository } from '../db/statsRepository.js';
import { searchRepository } from '../db/searchRepository.js';
import { cacheService } from '../cache/cacheService.js';
import { logger } from './Logger.js';

type ExportablePerson = Person & {
  currentStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

export class DatabaseDataService {
  private static instance: DatabaseDataService;
  private readonly CACHE_TTL_SECONDS = 5 * 60;

  private constructor() {}

  static getInstance(): DatabaseDataService {
    if (!DatabaseDataService.instance) {
      DatabaseDataService.instance = new DatabaseDataService();
    }
    return DatabaseDataService.instance;
  }

  /**
   * Get paginated entities with filtering and sorting
   * Uses database queries instead of loading all data into memory
   */
  async getEntities(
    page: number = 1,
    limit: number = 24,
    filters?: SearchFilters,
    sortBy?: SortOption,
  ): Promise<{ entities: Person[]; total: number }> {
    try {
      const cacheKey = JSON.stringify({ page, limit, filters, sortBy });
      return await cacheService.getOrCompute(
        'search',
        `entities:${cacheKey}`,
        async () => {
          const result = await entitiesRepository.getSubjectCards(page, limit, filters, sortBy);
          return {
            entities: result.subjects as unknown as Person[],
            total: result.total,
          };
        },
        this.CACHE_TTL_SECONDS,
      );
    } catch (error) {
      logger.error({ err: error }, 'Error fetching entities from database');
      throw new Error(
        `Failed to fetch entities: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get single entity by ID
   */
  async getEntityById(id: string): Promise<Person | null> {
    try {
      const subject = await entitiesRepository.getEntityById(id);
      return subject as Person | null;
    } catch (error) {
      logger.error({ err: error }, `Error fetching entity ${id} from database`);
      throw new Error(
        `Failed to fetch entity: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Search entities using full-text search
   */
  async searchEntities(
    query: string,
    limit: number = 50,
  ): Promise<{ entities: Person[]; documents: Record<string, unknown>[] }> {
    try {
      if (!query || query.trim().length === 0) {
        return { entities: [], documents: [] };
      }

      const searchResults = (await searchRepository.search(query.trim(), limit, {
        mode: 'web',
        evidenceType: 'ALL',
      })) as unknown as { entities: Person[]; documents: Record<string, unknown>[] };
      return searchResults;
    } catch (error) {
      logger.error({ err: error }, 'Error searching entities');
      throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get statistics for dashboard
   */
  async getStatistics(): Promise<{
    totalEntities: number;
    totalDocuments: number;
    totalMentions: number;
    averageRedFlagRating: number;
    topRoles: { role: string; count: number }[];
    likelihoodDistribution: { level: string; count: number }[];
  }> {
    try {
      const rawStats = await statsRepository.getStatistics();
      return {
        totalEntities: Number(rawStats.totalEntities || 0),
        totalDocuments: Number(rawStats.totalDocuments || 0),
        totalMentions: Number(rawStats.totalMentions || 0),
        averageRedFlagRating: Number(rawStats.averageRedFlagRating || 0),
        topRoles: Array.isArray(rawStats.topRoles)
          ? rawStats.topRoles.map((r) => ({
              role: String((r as Record<string, unknown>)['role'] || ''),
              count: Number(r.count || 0),
            }))
          : [],
        likelihoodDistribution: Array.isArray(rawStats.likelihoodDistribution)
          ? rawStats.likelihoodDistribution.map((entry) => ({
              level: String(entry.level || ''),
              count: Number(entry.count || 0),
            }))
          : [],
      };
    } catch (error) {
      logger.error({ err: error }, 'Error fetching statistics');
      throw new Error(
        `Failed to fetch statistics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get entities by likelihood level
   */
  async getEntitiesByLikelihood(
    levels: ('HIGH' | 'MEDIUM' | 'LOW')[],
    page: number = 1,
    limit: number = 24,
  ): Promise<{ entities: Person[]; total: number }> {
    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
      likelihoodScore: levels,
    };

    return this.getEntities(page, limit, filters, 'red_flag');
  }

  /**
   * Get top entities by Red Flag rating
   */
  async getTopRedFlagEntities(
    page: number = 1,
    limit: number = 24,
  ): Promise<{ entities: Person[]; total: number }> {
    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
    };

    return this.getEntities(page, limit, filters, 'red_flag');
  }

  /**
   * Get entities by role
   */
  async getEntitiesByRole(
    roles: string[],
    page: number = 1,
    limit: number = 24,
  ): Promise<{ entities: Person[]; total: number }> {
    const filters: SearchFilters = {
      likelihood: 'all',
      role: 'all',
      status: 'all',
      minMentions: 0,
      evidenceTypes: roles,
    };

    return this.getEntities(page, limit, filters, 'mentions');
  }

  /**
   * Get recently updated entities
   */
  async getRecentEntities(
    page: number = 1,
    limit: number = 24,
  ): Promise<{ entities: Person[]; total: number }> {
    return this.getEntities(page, limit, undefined, 'recent');
  }

  /**
   * Get entities with most mentions
   */
  async getMostMentionedEntities(
    page: number = 1,
    limit: number = 24,
  ): Promise<{ entities: Person[]; total: number }> {
    return this.getEntities(page, limit, undefined, 'mentions');
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    cacheService.purgeByPattern('search', /^entities:/);
    logger.info('Search cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string }>;
  } {
    const stats = cacheService.stats('search');
    const entries = stats.keys.filter((key) => key.startsWith('entities:')).map((key) => ({ key }));
    return {
      size: entries.length,
      entries,
    };
  }

  /**
   * Check if database is properly initialized
   */
  async isDatabaseReady(): Promise<boolean> {
    try {
      const stats = await statsRepository.getStatistics();
      return stats.totalEntities > 0;
    } catch (error) {
      logger.error({ err: error }, 'Database readiness check failed');
      return false;
    }
  }

  /**
   * Get database size for monitoring
   */
  getDatabaseSize(): number {
    // Database size is managed by Postgres; not available via this service anymore.
    return 0;
  }

  /**
   * Export data for backup or analysis
   */
  async exportData(format: 'json' | 'csv' = 'json', filters?: SearchFilters): Promise<string> {
    try {
      // Get all entities (no pagination for export)
      const { subjects } = await entitiesRepository.getSubjectCards(1, 100000, filters, 'name');

      if (format === 'csv') {
        return this.convertToCSV(subjects as unknown as ExportablePerson[]);
      } else {
        return JSON.stringify(subjects, null, 2);
      }
    } catch (error) {
      logger.error({ err: error }, 'Data export failed');
      throw new Error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert entities to CSV format
   */
  private convertToCSV(entities: ExportablePerson[]): string {
    const headers = [
      'ID',
      'Full Name',
      'Primary Role',
      'Secondary Roles',
      'Likelihood Level',
      'Mentions',
      'Current Status',
      'Connections Summary',
      'Red Flag Rating',
      'Red Flag Score',
      'File References Count',
      'Created At',
      'Updated At',
    ];

    const rows = entities.map((entity) => [
      entity.id,
      `"${entity.fullName.replace(/"/g, '""')}"`,
      `"${(entity.primaryRole || '').replace(/"/g, '""')}"`,
      `"${(entity.secondaryRoles || []).join('; ').replace(/"/g, '""')}"`,
      entity.likelihoodLevel || '',
      entity.mentions || 0,
      `"${(entity.currentStatus || '').replace(/"/g, '""')}"`,
      `"${(entity.connectionsSummary || '').replace(/"/g, '""')}"`,
      entity.redFlagRating || 0,
      entity.redFlagScore || 0,
      (entity.fileReferences || []).length,
      entity.createdAt || '',
      entity.updatedAt || '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}

export const databaseDataService = DatabaseDataService.getInstance();
