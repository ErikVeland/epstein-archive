import { Person } from '../types';
import { apiClient } from './apiClient';

interface EntityStatsCache {
  totalPeople: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  totalMentions: number;
  totalFiles: number;
}

export interface RealPerson extends Person {
  fullName: string;
  primaryRole: string;
  secondaryRoles: string[];
  keyEvidence: string;
  fileReferences: Array<{
    filename: string;
    filePath: string;
    content?: string;
    contextText?: string;
    redFlagRating?: number;
  }>;
  connectionsToEpstein: string;
  title?: string;
  role?: string;
  title_variants?: string[];
}

export interface PaginatedResponse {
  data: RealPerson[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SearchFilters {
  searchTerm?: string;
  likelihoodScore?: ('HIGH' | 'MEDIUM' | 'LOW')[];
  minMentions?: number;
  maxMentions?: number;
  evidenceTypes?: string[];
  sortBy?: 'name' | 'mentions' | 'red_flag' | 'risk';
  sortOrder?: 'asc' | 'desc';
  minRedFlagIndex?: number;
  maxRedFlagIndex?: number;
  entityType?: string;
}

export class OptimizedDataService {
  private static instance: OptimizedDataService;
  private isInitialized: boolean = false;
  private statsCache: EntityStatsCache | null = null;
  private readonly PAGE_SIZE = 24; // Show 24 items per page (4x6 grid)

  static getInstance(): OptimizedDataService {
    if (!OptimizedDataService.instance) {
      OptimizedDataService.instance = new OptimizedDataService();
    }
    return OptimizedDataService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Test API connection
      const healthCheck = await apiClient.healthCheck();
      console.log('API connection successful:', healthCheck);

      this.isInitialized = true;
      console.log('OptimizedDataService initialized with API backend');
    } catch (error) {
      console.error('Error initializing OptimizedDataService:', error);
      throw error;
    }
  }

  /**
   * Get paginated data from database
   */
  async getPaginatedData(
    filters: SearchFilters = {},
    page: number = 1,
  ): Promise<PaginatedResponse> {
    await this.initialize();

    try {
      // Use API client instead of database
      const result = await apiClient.getEntities(filters, page, this.PAGE_SIZE);

      // Transform API entities to RealPerson format
      const data = result.data.map((entity) => this.transformApiEntityToRealPerson(entity));

      console.log('getPaginatedData debug:', {
        filters,
        page,
        total: result.total,
        pageSize: this.PAGE_SIZE,
        totalPages: result.totalPages,
        dataLength: data.length,
      });

      return {
        data,
        total: result.total,
        page,
        pageSize: this.PAGE_SIZE,
        totalPages: result.totalPages,
      };
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        pageSize: this.PAGE_SIZE,
        totalPages: 0,
      };
    }
  }

  /**
   * Transform API entity to RealPerson format
   */
  private transformApiEntityToRealPerson(
    entity: Person & { title_variants?: string[]; keyEvidence?: string },
  ): RealPerson {
    return {
      id: entity.id,
      name: entity.name,
      title: entity.title,
      role: entity.role,
      title_variants: entity.title_variants,
      fullName: entity.fullName || entity.name,
      primaryRole: entity.primaryRole || entity.title || 'Unknown',
      secondaryRoles: entity.secondaryRoles || [],
      mentions: entity.mentions || 0,
      files: entity.files || 0,
      contexts: entity.contexts || [],
      evidenceTypes: entity.evidenceTypes || [],
      significantPassages: entity.significantPassages || [],
      likelihoodScore: entity.likelihoodScore || 'LOW',
      redFlagScore: entity.redFlagScore || entity.mentions || 0,
      redFlagRating: entity.redFlagRating || 1,
      redFlagPeppers: entity.redFlagPeppers || '🚩',
      redFlagDescription: entity.redFlagDescription || 'Low',
      keyEvidence: entity.keyEvidence || 'No specific evidence available',
      fileReferences: entity.fileReferences || [],
      connectionsToEpstein:
        entity.connectionsToEpstein || 'Various connections mentioned in documents',
    };
  }

  /**
   * Get statistics from database
   */
  getStats(): EntityStatsCache {
    // This is a synchronous method, so we'll return cached stats
    // The stats will be updated asynchronously when needed
    if (!this.statsCache) {
      // Initialize stats cache with a basic structure
      this.updateStatsCache();
      return {
        totalPeople: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        totalMentions: 0,
        totalFiles: 0,
      };
    }

    return this.statsCache;
  }

  /**
   * Update stats cache from API (async)
   */
  private async updateStatsCache(): Promise<void> {
    try {
      const stats = (await apiClient.getStats()) as {
        totalEntities: number;
        likelihoodDistribution?: Array<{ level: string; count: number }>;
        totalMentions: number;
        totalDocuments: number;
      };

      this.statsCache = {
        totalPeople: stats.totalEntities,
        highRisk: stats.likelihoodDistribution?.find((d) => d.level === 'HIGH')?.count || 0,
        mediumRisk: stats.likelihoodDistribution?.find((d) => d.level === 'MEDIUM')?.count || 0,
        lowRisk: stats.likelihoodDistribution?.find((d) => d.level === 'LOW')?.count || 0,
        totalMentions: stats.totalMentions,
        totalFiles: stats.totalDocuments,
      };
    } catch (error) {
      console.error('Error updating stats cache:', error);
    }
  }

  /**
   * Search entities using API
   */
  async searchEntities(query: string, limit: number = 50): Promise<RealPerson[]> {
    await this.initialize();

    try {
      const searchResults = await apiClient.searchEntities(query, limit);
      return searchResults.map((entity) => this.transformApiEntityToRealPerson(entity));
    } catch (error) {
      console.error('Error searching entities:', error);
      return [];
    }
  }

  /**
   * Get entity by ID
   */
  async getEntityById(id: string): Promise<RealPerson | null> {
    await this.initialize();

    try {
      const entity = await apiClient.getEntity(id);
      return entity ? this.transformApiEntityToRealPerson(entity) : null;
    } catch (error) {
      console.error(`Error fetching entity ${id}:`, error);
      return null;
    }
  }

  /**
   * Get API information
   */
  async getDatabaseInfo(): Promise<{
    isReady: boolean;
    size: number;
    stats: EntityStatsCache;
    cacheStats: Record<string, string>;
  }> {
    try {
      const healthCheck = await apiClient.healthCheck();
      const stats = (await apiClient.getStats()) as { totalEntities: number };

      return {
        isReady: healthCheck.status === 'healthy',
        size: stats.totalEntities || 0,
        stats: this.getStats(),
        cacheStats: { api: 'connected' },
      };
    } catch (error) {
      console.error('Error getting API info:', error);
      return {
        isReady: false,
        size: 0,
        stats: this.getStats(),
        cacheStats: { api: 'disconnected' },
      };
    }
  }
}

export const optimizedDataService = OptimizedDataService.getInstance();
