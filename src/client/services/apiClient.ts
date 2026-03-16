/// <reference types="vite/client" />
import { z } from 'zod';
import { Person } from '../types';
import type { SearchFilters, PaginatedResponse } from './optimizedDataLoader';
import type {
  EmailMailboxesResponseDto,
  EmailMessageBodyDto,
  EmailRawMessageDto,
  EmailSearchResponseDto,
  EmailThreadDetailsDto,
  EmailThreadForMessageDto,
  EmailThreadsResponseDto,
} from '@shared/dto/emails';
import type { DocumentsListResponseDto } from '@shared/dto/documents';
import type { EntityListResponseDto, SubjectsListResponseDto } from '@shared/dto/entities';
import type { InvestigationEvidenceListResponseDto } from '@shared/dto/investigations';
import {
  documentsListResponseSchema,
  emailThreadDetailsResponseSchema,
  emailThreadsResponseSchema,
  entityListResponseSchema,
  investigationEvidenceListResponseSchema,
  subjectsListResponseSchema,
} from '@shared/contracts';
import { Semaphore, isHeavyRoute } from '../utils/semaphore';
import { singleFlight, stableStringify } from '../utils/singleFlight';

const globalSemaphore = new Semaphore(6);
const heavySemaphore = new Semaphore(2);

export type {
  EmailMailboxDto as EmailMailboxDTO,
  EmailMessageBodyDto as EmailMessageBodyDTO,
  EmailThreadDetailsDto as EmailThreadDetailsDTO,
  EmailThreadListItemDto as EmailThreadDTO,
} from '@shared/dto/emails';

const API_BASE_URL =
  (typeof window !== 'undefined' &&
    typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  '/api';

// --- In-Memory Cache with TTL ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL = 30000; // 30 seconds

function getCachedData<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if expired
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCachedData<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

class ContractError extends Error {
  isContractError: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
    this.isContractError = true;
  }
}

function parseWithSchema<T>(data: unknown, schema: z.ZodTypeAny, context: string): T {
  try {
    return schema.parse(data);
  } catch (err) {
    console.error('[API CONTRACT VIOLATION]', context, err);
    throw new ContractError(`API contract violation for ${context}`);
  }
}

function stringifyApiErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (value instanceof Error && value.message) return value.message;
  if (value && typeof value === 'object') {
    const maybeMessage = (value as any).message || (value as any).error || (value as any).detail;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (value == null) return null;
  return String(value);
}

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];

  private outcomes: { timestamp: number; is5xx: boolean }[] = [];
  private isCircuitTripped = false;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private recordOutcome(status: number) {
    const now = Date.now();
    this.outcomes.push({ timestamp: now, is5xx: status >= 500 && status < 600 });
    this.outcomes = this.outcomes.filter((o) => now - o.timestamp < 30000);

    const count5xx = this.outcomes.filter((o) => o.is5xx).length;
    const rate5xx = count5xx / Math.max(1, this.outcomes.length);

    let consecutive5xx = 0;
    for (let i = this.outcomes.length - 1; i >= 0; i--) {
      if (this.outcomes[i].is5xx) consecutive5xx++;
      else break;
    }

    if ((rate5xx > 0.15 && this.outcomes.length >= 20) || consecutive5xx >= 5) {
      if (!this.isCircuitTripped) {
        this.isCircuitTripped = true;
        console.warn('[CIRCUIT BREAKER] System under load. Suspending auto-retries.');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:degraded', { detail: true }));
          setTimeout(() => {
            this.isCircuitTripped = false;
            window.dispatchEvent(new CustomEvent('api:degraded', { detail: false }));
          }, 30000);
        }
      }
    }
  }

  private onTokenRefreshed(token: string | null) {
    this.refreshSubscribers.map((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string | null) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.addRefreshSubscriber((token: string | null) => {
          if (token) resolve(token);
          else reject(new Error('Session expired'));
        });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Refresh failed');

      const data = await response.json();
      this.accessToken = data.accessToken;
      this.onTokenRefreshed(data.accessToken);
      return data.accessToken;
    } catch {
      this.accessToken = null;
      this.onTokenRefreshed(null);
      this.isRefreshing = false;
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit & {
      useCache?: boolean;
      cacheTtl?: number;
      _retryCount?: number;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const method = options?.method || 'GET';
    const isGet = method === 'GET';

    if (this.isCircuitTripped) {
      throw new Error('System under heavy load. Please try again later.');
    }

    if (isGet) {
      const bodyString = options?.body ? stableStringify(options.body) : '{}';
      const key = `GET:${url}?${bodyString}`;
      return singleFlight(key, () => this.executeFetchWithRetries<T>(url, options));
    }

    return this.executeFetchWithRetries<T>(url, options);
  }

  private async executeFetchWithRetries<T>(
    url: string,
    options?: RequestInit & {
      useCache?: boolean;
      cacheTtl?: number;
      _retryCount?: number;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const method = options?.method || 'GET';
    const shouldCache = options?.useCache !== false && method === 'GET';

    if (shouldCache) {
      const cached = getCachedData<T>(url);
      if (cached) return cached;
    }

    const { useCache: _, cacheTtl, _retryCount, signal, ...fetchOptions } = options || {};
    const retryCount = _retryCount || 0;

    const executeRequest = async (token: string | null): Promise<Response> => {
      const headers = new Headers(fetchOptions?.headers);
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (retryCount > 0) {
        headers.set('x-retry-count', String(retryCount));
        headers.set('x-retry-attempt', String(retryCount));
      }
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

      const releaseGlobal = await globalSemaphore.acquire();
      const releaseHeavy = isHeavyRoute(url) ? await heavySemaphore.acquire() : () => {};

      try {
        return await fetch(url, { ...fetchOptions, headers, credentials: 'include', signal });
      } finally {
        releaseHeavy();
        releaseGlobal();
      }
    };

    const startTime = performance.now();

    try {
      let response = await executeRequest(this.accessToken);
      this.recordOutcome(response.status);

      if (
        response.status === 401 &&
        !url.includes('/auth/login') &&
        !url.includes('/auth/refresh')
      ) {
        const newToken = await this.refreshToken();
        if (newToken) {
          response = await executeRequest(newToken);
          this.recordOutcome(response.status);
        } else {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('auth:logout'));
          }
          throw new Error('Unauthorized: Session expired');
        }
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Handled externally or intentionally rejected
        } else if (response.status === 429 && retryCount < 2) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : retryCount === 0
              ? 1000
              : 2000;
          await new Promise((r) => setTimeout(r, delay));
          return this.executeFetchWithRetries(url, { ...options, _retryCount: retryCount + 1 });
        } else if (response.status >= 500 && response.status < 600) {
          const isIdempotent = method === 'GET' || !!(options?.headers as any)?.['Idempotency-Key'];
          const maxRetries = method === 'GET' ? 2 : isIdempotent ? 1 : 0;

          if (retryCount < maxRetries) {
            const retryAfter = response.headers.get('Retry-After');
            let delay;
            if (retryAfter) {
              delay = parseInt(retryAfter, 10) * 1000;
            } else {
              delay = retryCount === 0 ? Math.random() * 100 + 200 : Math.random() * 200 + 800;
            }
            await new Promise((r) => setTimeout(r, delay));
            return this.executeFetchWithRetries(url, { ...options, _retryCount: retryCount + 1 });
          }
        }

        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const msg =
          stringifyApiErrorMessage((errorData as any)?.error) ||
          stringifyApiErrorMessage((errorData as any)?.message) ||
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(msg);
      }

      const data = await response.json();

      const duration = performance.now() - startTime;
      if (typeof window !== 'undefined') {
        import('../utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logAPICall(
              url,
              duration,
              JSON.stringify(data).length,
              response.status,
            );
          })
          .catch(() => {});
      }

      if (shouldCache) setCachedData(url, data, cacheTtl);
      return data as T;
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      if (error instanceof ContractError || (error as any).isContractError) {
        throw error;
      }

      if (!error.status) {
        if (method === 'GET' && retryCount < 1) {
          await new Promise((r) => setTimeout(r, 500));
          return this.executeFetchWithRetries(url, { ...options, _retryCount: retryCount + 1 });
        }
      }

      const duration = performance.now() - startTime;
      if (typeof window !== 'undefined') {
        import('../utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logAPICall(url, duration, 0, 0);
          })
          .catch(() => {});
      }
      throw error;
    }
  }

  private isNotFoundError(error: unknown): error is Error {
    return error instanceof Error && /HTTP 404\b/.test(error.message);
  }

  private isServiceUnavailableError(error: unknown): error is Error {
    return error instanceof Error && /HTTP 503\b/.test(error.message);
  }

  private async fetchWithLegacyFallback<T>(
    canonicalUrl: string,
    legacyUrl: string,
    options?: RequestInit & { useCache?: boolean; cacheTtl?: number },
  ): Promise<T> {
    try {
      return await this.fetchWithErrorHandling<T>(canonicalUrl, options as any);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return this.fetchWithErrorHandling<T>(legacyUrl, options as any);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: { useCache?: boolean; cacheTtl?: number }): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, options);
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      useCache: false,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
      useCache: false,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'DELETE',
      useCache: false,
    });
  }

  // Clear cache (useful after mutations)
  clearCache(pattern?: string): void {
    invalidateCache(pattern);
  }

  async getSubjects(
    filters: Record<string, any> = {},
    page = 1,
    limit = 24,
  ): Promise<SubjectsListResponseDto> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) queryParams.append('search', filters.search);
    if (filters.role) queryParams.append('role', filters.role);
    if (filters.entityType) queryParams.append('entityType', filters.entityType);
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    if (filters.likelihood) {
      if (Array.isArray(filters.likelihood)) {
        filters.likelihood.forEach((l: string) => queryParams.append('likelihoodScore', l));
      } else {
        queryParams.append('likelihoodScore', filters.likelihood);
      }
    }
    queryParams.append('v', String(Date.now()));

    const raw = await this.fetchWithErrorHandling<unknown>(
      `/api/subjects?${queryParams.toString()}`,
      {
        useCache: false,
      },
    );
    return parseWithSchema<SubjectsListResponseDto>(
      raw,
      subjectsListResponseSchema,
      '/api/subjects',
    );
  }

  async getEntities(
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 24,
  ): Promise<PaginatedResponse> {
    const params = new URLSearchParams();

    if (filters.searchTerm) params.append('search', filters.searchTerm);
    if (filters.evidenceTypes && filters.evidenceTypes.length > 0)
      params.append('role', filters.evidenceTypes[0]);
    // Support both 'likelihood' and 'likelihoodScore' filter property names
    const likelihoodValue = (filters as any).likelihood || filters.likelihoodScore;
    if (likelihoodValue && Array.isArray(likelihoodValue) && likelihoodValue.length > 0) {
      params.append('likelihood', likelihoodValue[0]);
    } else if (likelihoodValue && typeof likelihoodValue === 'string') {
      params.append('likelihood', likelihoodValue);
    }
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.minRedFlagIndex !== undefined)
      params.append('minRedFlagIndex', filters.minRedFlagIndex.toString());
    if (filters.maxRedFlagIndex !== undefined)
      params.append('maxRedFlagIndex', filters.maxRedFlagIndex.toString());
    if (filters.entityType && filters.entityType !== 'all')
      params.append('type', filters.entityType);
    if (page > 1) params.append('page', page.toString());
    if (limit !== 24) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/entities${params.toString() ? `?${params.toString()}` : ''}`;
    try {
      const raw = await this.fetchWithErrorHandling<unknown>(url);
      const resp = parseWithSchema<EntityListResponseDto>(
        raw,
        entityListResponseSchema,
        '/api/entities',
      );
      const data = Array.isArray(resp.data) ? resp.data : [];
      const normalized = data.map((e: any) => ({
        ...e,
        name: e.name ?? e.fullName,
        fullName: e.fullName ?? e.name,
        redFlagRating: e.redFlagRating ?? 0,
        files: e.files ?? e.documentCount ?? 0,
        blackBookEntry: e.blackBookEntry || null,
      }));
      return { ...(resp as any), data: normalized } as PaginatedResponse;
    } catch (primaryError) {
      console.warn('Primary /api/entities failed, falling back to /api/subjects:', primaryError);

      const subjects = await this.getSubjects({
        searchTerm: filters.searchTerm,
        role:
          filters.evidenceTypes && filters.evidenceTypes.length > 0 ? filters.evidenceTypes[0] : '',
        sortBy: (filters.sortBy as any) || 'red_flag',
        sortOrder: filters.sortOrder || 'desc',
        minRedFlagIndex: filters.minRedFlagIndex,
        maxRedFlagIndex: filters.maxRedFlagIndex,
        entityType: filters.entityType,
        likelihood: (filters as any).likelihood || filters.likelihoodScore,
      } as any);

      const fallbackData = (subjects.subjects || []).map((s: any) => {
        const redFlag =
          s?.forensics?.redFlagObjective ??
          s?.forensics?.redFlagSubjective ??
          s?.redFlagRating ??
          0;
        return {
          id: s.id,
          name: s.name || 'Unknown',
          fullName: s.name || 'Unknown',
          bio: s.shortBio || '',
          entityType: 'Person',
          primaryRole: s.role || 'Unknown',
          secondaryRoles: [],
          mentions: Number(s?.stats?.mentions || 0),
          files: Number(s?.stats?.documents || 0),
          contexts: [],
          evidenceTypes: [],
          photos: [],
          significantPassages: [],
          keyEvidence: '',
          fileReferences: [],
          likelihoodScore: s?.forensics?.riskLevel || 'LOW',
          redFlagScore: Number(redFlag || 0),
          redFlagRating: Number(redFlag || 0),
          redFlagPeppers: Number(redFlag || 0) > 0 ? '🚩'.repeat(Number(redFlag || 0)) : '🏳️',
          redFlagDescription: `Red Flag Index ${Number(redFlag || 0)}`,
          connectionsToEpstein: '',
          blackBookEntry: null,
        };
      });

      return {
        data: fallbackData,
        total: Number(subjects.total || fallbackData.length),
        page,
        pageSize: limit,
        totalPages: Math.max(1, Math.ceil(Number(subjects.total || fallbackData.length) / limit)),
      } as PaginatedResponse;
    }
  }

  async getEntity(id: string): Promise<Person> {
    const url = `${API_BASE_URL}/entities/${id}`;
    const e = await this.fetchWithErrorHandling<any>(url);
    return {
      ...e,
      name: e.name ?? e.fullName,
      fullName: e.fullName ?? e.name,
      redFlagRating: e.redFlagRating ?? 0,
      blackBookEntry: e.blackBookEntry || null,
    } as Person;
  }

  async getEntityCommunications(
    id: string,
    options?: {
      topic?: string;
      from?: string;
      to?: string;
      start?: string;
      end?: string;
      limit?: number;
    },
  ): Promise<{ data: any[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.topic) params.append('topic', options.topic);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.start) params.append('start', options.start);
    if (options?.end) params.append('end', options.end);
    if (options?.limit != null) params.append('limit', String(options.limit));

    const query = params.toString();
    const canonicalUrl = `${API_BASE_URL}/entities/${id}/analytics/communications${query ? `?${query}` : ''}`;
    const legacyUrl = `${API_BASE_URL}/entities/${id}/communications${query ? `?${query}` : ''}`;
    return this.fetchWithLegacyFallback<{ data: any[]; total: number }>(canonicalUrl, legacyUrl, {
      useCache: true,
    });
  }

  async getDocumentThread(id: string): Promise<{ threadId: string; messages: any[] }> {
    const url = `${API_BASE_URL}/documents/${id}/thread`;
    return this.fetchWithErrorHandling<{ threadId: string; messages: any[] }>(url, {
      useCache: true,
    });
  }

  async getEmailMailboxes(
    params: { showSuppressedJunk?: boolean } = {},
  ): Promise<EmailMailboxesResponseDto> {
    const usp = new URLSearchParams();
    if (params.showSuppressedJunk) usp.append('showSuppressedJunk', '1');
    const url = `${API_BASE_URL}/emails/mailboxes${usp.toString() ? `?${usp.toString()}` : ''}`;
    return this.fetchWithErrorHandling<EmailMailboxesResponseDto>(url, {
      useCache: true,
      cacheTtl: 30000,
    });
  }

  async getEmailThreads(params: {
    mailboxId?: string;
    q?: string;
    tab?: 'all' | 'primary' | 'updates' | 'promotions';
    from?: string;
    to?: string;
    dateFrom?: string;
    dateTo?: string;
    hasAttachments?: boolean;
    minRisk?: number;
    cursor?: string | null;
    limit?: number;
    showSuppressedJunk?: boolean;
  }): Promise<EmailThreadsResponseDto> {
    const usp = new URLSearchParams();
    if (params.mailboxId) usp.append('mailboxId', params.mailboxId);
    if (params.q) usp.append('q', params.q);
    if (params.tab) usp.append('tab', params.tab);
    if (params.from) usp.append('from', params.from);
    if (params.to) usp.append('to', params.to);
    if (params.dateFrom) usp.append('dateFrom', params.dateFrom);
    if (params.dateTo) usp.append('dateTo', params.dateTo);
    if (params.hasAttachments) usp.append('hasAttachments', '1');
    if (params.minRisk && params.minRisk > 0) usp.append('minRisk', String(params.minRisk));
    if (params.cursor) usp.append('cursor', params.cursor);
    if (params.limit) usp.append('limit', String(params.limit));
    if (params.showSuppressedJunk) usp.append('showSuppressedJunk', '1');
    const url = `${API_BASE_URL}/emails/threads${usp.toString() ? `?${usp.toString()}` : ''}`;
    const raw = await this.fetchWithErrorHandling<unknown>(url, {
      useCache: true,
      cacheTtl: 30000,
    });
    const parsed = parseWithSchema(raw, emailThreadsResponseSchema, '/emails/threads');
    return parsed as EmailThreadsResponseDto;
  }

  async getEmailThread(threadId: string): Promise<EmailThreadDetailsDto> {
    const url = `${API_BASE_URL}/emails/threads/${encodeURIComponent(threadId)}`;
    const raw = await this.fetchWithErrorHandling<unknown>(url, {
      useCache: true,
      cacheTtl: 30000,
    });
    const parsed = parseWithSchema(raw, emailThreadDetailsResponseSchema, '/emails/threads/:id');
    return parsed as EmailThreadDetailsDto;
  }

  async getEmailMessageBody(
    messageId: string,
    options: { showQuoted?: boolean } = {},
  ): Promise<EmailMessageBodyDto> {
    const usp = new URLSearchParams();
    if (options.showQuoted) usp.append('showQuoted', '1');
    const url = `${API_BASE_URL}/emails/messages/${encodeURIComponent(messageId)}/body${usp.toString() ? `?${usp.toString()}` : ''}`;
    return this.fetchWithErrorHandling<EmailMessageBodyDto>(url, {
      useCache: true,
      cacheTtl: 60000,
    });
  }

  async getEmailRawMessage(messageId: string): Promise<{
    messageId: string;
    raw: string;
    warning: string;
    determinism: string;
  }> {
    const url = `${API_BASE_URL}/emails/messages/${encodeURIComponent(messageId)}/raw`;
    return this.fetchWithErrorHandling<EmailRawMessageDto>(url, {
      useCache: true,
      cacheTtl: 60000,
    });
  }

  async getEmailThreadForMessage(messageId: string): Promise<EmailThreadForMessageDto> {
    const url = `${API_BASE_URL}/emails/messages/${encodeURIComponent(messageId)}/thread`;
    return this.fetchWithErrorHandling<EmailThreadForMessageDto>(url, {
      useCache: true,
      cacheTtl: 60000,
    });
  }

  async searchEmails(params: {
    q: string;
    scope?: 'global' | 'mailbox';
    mailboxId?: string;
    limit?: number;
  }): Promise<EmailSearchResponseDto> {
    const usp = new URLSearchParams({ q: params.q });
    if (params.scope) usp.append('scope', params.scope);
    if (params.mailboxId) usp.append('mailboxId', params.mailboxId);
    if (params.limit) usp.append('limit', String(params.limit));
    const url = `${API_BASE_URL}/emails/search?${usp.toString()}`;
    return this.fetchWithErrorHandling<EmailSearchResponseDto>(url, { useCache: false });
  }

  async search(
    query: string,
    limit: number = 20,
  ): Promise<{
    entities: Person[];
    documents: any[];
    investigations?: any[];
    articles?: any[];
    media?: any[];
  }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit !== 20) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/search?${params.toString()}`;
    const r = await this.fetchWithErrorHandling<any>(url);
    const ents = Array.isArray(r.entities)
      ? r.entities.map((e: any) => ({
          ...e,
          name: e.name ?? e.fullName,
          fullName: e.fullName ?? e.name,
          redFlagRating: e.redFlagRating ?? 0,
          blackBookEntry: e.blackBookEntry || null,
        }))
      : [];
    return {
      entities: ents as Person[],
      documents: r.documents || [],
      investigations: r.investigations || [],
      articles: r.articles || [],
      media: r.media || [],
    };
  }

  async searchEntities(query: string, limit: number = 20): Promise<Person[]> {
    const result = await this.search(query, limit);
    return result.entities || [];
  }

  async createEntity(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/entities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRelationship(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/relationships`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStats(filters: Record<string, any> = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.timeRange && filters.timeRange[0]) params.append('startDate', filters.timeRange[0]);
    if (filters.timeRange && filters.timeRange[1]) params.append('endDate', filters.timeRange[1]);
    if (filters.limit) params.append('limit', filters.limit.toString());

    const url = `${API_BASE_URL}/stats${params.toString() ? `?${params.toString()}` : ''}`;
    return this.fetchWithErrorHandling<any>(url);
  }

  async getDocumentPages(id: string): Promise<{ pages: string[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${id}/pages`);
      if (!response.ok) throw new Error('Failed to fetch document pages');
      return await response.json();
    } catch (error) {
      console.error('Error fetching document pages:', error);
      return { pages: [], total: 0 };
    }
  }

  async getEntityGraph(entityId: string, depth: number = 2): Promise<any> {
    const canonicalUrl = `${API_BASE_URL}/entities/${entityId}/analytics/graph?depth=${depth}`;
    const legacyUrl = `${API_BASE_URL}/entities/${entityId}/graph?depth=${depth}`;
    return this.fetchWithLegacyFallback<any>(canonicalUrl, legacyUrl);
  }

  async getEntityDocuments(entityId: string): Promise<any[]> {
    const url = `${API_BASE_URL}/entities/${entityId}/documents`;
    const response = await this.fetchWithErrorHandling<any>(url);

    // Handle both array (dev/legacy) and paginated object (prod) formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  async analyzeDocument(documentId: string): Promise<any> {
    const canonicalUrl = `${API_BASE_URL}/documents/${documentId}/analytics/analyze`;
    const legacyUrl = `${API_BASE_URL}/evidence/${documentId}/analyze`;
    return this.fetchWithLegacyFallback<any>(canonicalUrl, legacyUrl, { method: 'POST' });
  }

  async getEvidence(evidenceId: string): Promise<any> {
    return this.fetchWithErrorHandling<any>(
      `${API_BASE_URL}/evidence/${encodeURIComponent(evidenceId)}`,
      {
        useCache: true,
        cacheTtl: 30000,
      },
    );
  }

  async getEvidenceMetrics(documentId: string): Promise<any> {
    const canonicalUrl = `${API_BASE_URL}/documents/${documentId}/analytics/metrics`;
    const legacyUrl = `${API_BASE_URL}/evidence/${documentId}/metrics`;
    return this.fetchWithLegacyFallback<any>(canonicalUrl, legacyUrl);
  }

  async getChainOfCustody(documentId: string): Promise<any> {
    const canonicalUrl = `${API_BASE_URL}/documents/${documentId}/analytics/custody`;
    const legacyUrl = `${API_BASE_URL}/evidence/${documentId}/custody`;
    return this.fetchWithLegacyFallback<any>(canonicalUrl, legacyUrl);
  }

  async removeEvidenceFromInvestigation(
    investigationEvidenceId: string,
  ): Promise<{ success: boolean }> {
    return this.fetchWithErrorHandling(
      `${API_BASE_URL}/investigation/remove-evidence/${investigationEvidenceId}`,
      { method: 'DELETE' },
    );
  }

  async getInvestigationEvidenceSummary(investigationId: string): Promise<any> {
    const canonicalUrl = `${API_BASE_URL}/investigations/${investigationId}/analytics/evidence-summary`;
    const legacyPluralUrl = `${API_BASE_URL}/investigations/${investigationId}/evidence-summary`;
    const legacySingularUrl = `${API_BASE_URL}/investigation/${investigationId}/evidence-summary`;

    try {
      return await this.fetchWithErrorHandling<any>(canonicalUrl, { useCache: false });
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;
    }

    try {
      return await this.fetchWithErrorHandling<any>(legacyPluralUrl, { useCache: false });
    } catch (error) {
      if (!this.isNotFoundError(error)) throw error;
    }

    return this.fetchWithErrorHandling<any>(legacySingularUrl, { useCache: false });
  }

  async getEntityConfidence(entityId: string | number): Promise<any> {
    const canonicalUrl = `${API_BASE_URL}/entities/${entityId}/analytics/confidence`;
    const legacyUrl = `${API_BASE_URL}/entities/${entityId}/confidence`;
    return this.fetchWithLegacyFallback<any>(canonicalUrl, legacyUrl, { useCache: true });
  }

  async getDocument(id: string): Promise<any> {
    const url = `${API_BASE_URL}/documents/${id}`;
    const d = await this.fetchWithErrorHandling<any>(url);
    return {
      ...d,
      fileName: d.fileName ?? d.file_name,
      fileType: d.fileType ?? d.file_type,
      contentPreview: d.contentPreview ?? d.content_preview,
      redFlagRating: d.redFlagRating ?? 0,
      title: d.title ?? d.fileName,
    };
  }

  async getPublicDocumentAnnotations(documentId: string): Promise<
    Array<{
      id: string;
      documentId: string;
      type: 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';
      selectedText: string;
      note: string;
      position: { start: number; end: number };
      contextBefore?: string | null;
      contextAfter?: string | null;
      author?: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    const response = await this.fetchWithErrorHandling<{ annotations?: any[] }>(
      `${API_BASE_URL}/documents/${documentId}/annotations`,
      { useCache: false },
    );
    return Array.isArray(response.annotations) ? response.annotations : [];
  }

  async createPublicDocumentAnnotation(
    documentId: string,
    payload: {
      type: 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';
      selectedText: string;
      note?: string;
      start: number;
      end: number;
      contextBefore?: string;
      contextAfter?: string;
      author?: string;
    },
  ): Promise<{
    id: string;
    documentId: string;
    type: 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';
    selectedText: string;
    note: string;
    position: { start: number; end: number };
    contextBefore?: string | null;
    contextAfter?: string | null;
    author?: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.fetchWithErrorHandling<{ annotation: any }>(
      `${API_BASE_URL}/documents/${documentId}/annotations`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: payload.type,
          selectedText: payload.selectedText,
          note: payload.note || '',
          start: payload.start,
          end: payload.end,
          contextBefore: payload.contextBefore,
          contextAfter: payload.contextAfter,
        }),
        headers: payload.author ? { 'x-public-author': payload.author } : undefined,
        useCache: false,
      },
    );
    return response.annotation;
  }

  async getRelatedDocuments(id: string, limit: number = 10): Promise<any[]> {
    const url = `${API_BASE_URL}/documents/${id}/related?limit=${limit}`;
    return this.fetchWithErrorHandling<any[]>(url);
  }

  async getCollections(): Promise<any[]> {
    try {
      return await this.get<any[]>('/documents/collections');
    } catch (error) {
      if (this.isNotFoundError(error) || this.isServiceUnavailableError(error)) {
        return [];
      }
      throw error;
    }
  }

  async getCollectionDocuments(collectionId: string): Promise<any[]> {
    try {
      return await this.get<any[]>(`/documents/collections/${collectionId}/documents`);
    } catch (error) {
      if (this.isNotFoundError(error) || this.isServiceUnavailableError(error)) {
        return [];
      }
      throw error;
    }
  }

  async addToCollection(documentId: string, collectionId: string, notes?: string): Promise<void> {
    await this.post(`/documents/collections/${collectionId}/documents`, {
      documentId,
      notes,
    });
  }

  async getInvestigations(
    params: { status?: string; ownerId?: string; page?: number; limit?: number } = {},
  ): Promise<any> {
    const usp = new URLSearchParams();
    if (params.status) usp.append('status', params.status);
    if (params.ownerId) usp.append('ownerId', params.ownerId);
    if (params.page) usp.append('page', String(params.page));
    if (params.limit) usp.append('limit', String(params.limit));
    return this.fetchWithErrorHandling<any>(
      `${API_BASE_URL}/investigations${usp.toString() ? `?${usp.toString()}` : ''}`,
    );
  }

  async getInvestigativeTasksByInvestigation(
    investigationId: string,
  ): Promise<{ data: any[]; total: number }> {
    const url = `${API_BASE_URL}/investigative-tasks/investigation/${investigationId}`;
    const tasks = await this.fetchWithErrorHandling<any[]>(url, { useCache: false });
    return { data: tasks, total: tasks.length };
  }

  async getInvestigativeTaskSummary(investigationId: string): Promise<{
    statusBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
    overdueTasks: number;
    averageProgress: number;
    assignmentBreakdown: { assigned_to: string; count: number }[];
  }> {
    const url = `${API_BASE_URL}/investigative-tasks/summary/${investigationId}`;
    return this.fetchWithErrorHandling(url, { useCache: false });
  }

  async createInvestigativeTask(body: {
    investigationId: number;
    title: string;
    description?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
    evidenceIds?: number[];
    relatedEntities?: number[];
  }): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigative-tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
      useCache: false,
    });
  }

  async updateInvestigativeTask(id: number, updates: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigative-tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      useCache: false,
    });
  }

  async updateInvestigativeTaskProgress(id: number, progress: number): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigative-tasks/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
      useCache: false,
    });
  }

  async getInvestigationMemoryEntries(params: {
    investigationId: number;
    page?: number;
    limit?: number;
    searchQuery?: string;
  }): Promise<import('../types/memory').MemorySearchResult> {
    const usp = new URLSearchParams();
    if (params.page) usp.append('page', String(params.page));
    if (params.limit) usp.append('limit', String(params.limit));
    if (params.searchQuery) usp.append('q', params.searchQuery);
    usp.append('memoryType', 'episodic');
    const url = `${API_BASE_URL}/memory${usp.toString() ? `?${usp.toString()}` : ''}`;
    const result =
      await this.fetchWithErrorHandling<import('../types/memory').MemorySearchResult>(url);
    const filtered = result.data.filter(
      (entry) => entry.sourceType === 'investigation' && entry.sourceId === params.investigationId,
    );
    return { ...result, data: filtered, total: filtered.length };
  }

  async createInvestigationMemoryEntry(body: {
    investigationId: number;
    content: string;
    importanceScore?: number;
    contextTags?: string[];
    metadata?: Record<string, any>;
  }): Promise<import('../types/memory').MemoryEntry> {
    const payload: import('../types/memory').CreateMemoryEntryInput = {
      memoryType: 'episodic',
      content: body.content,
      importanceScore: body.importanceScore,
      contextTags: body.contextTags ?? [],
      metadata: {
        ...(body.metadata || {}),
        investigationId: body.investigationId,
      },
      sourceId: body.investigationId,
      sourceType: 'investigation',
    };
    return this.fetchWithErrorHandling<import('../types/memory').MemoryEntry>(
      `${API_BASE_URL}/memory`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        useCache: false,
      },
    );
  }

  async updateMemoryEntry(
    id: number,
    updates: import('../types/memory').UpdateMemoryEntryInput,
  ): Promise<import('../types/memory').MemoryEntry> {
    return this.fetchWithErrorHandling<import('../types/memory').MemoryEntry>(
      `${API_BASE_URL}/memory/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
        useCache: false,
      },
    );
  }

  async deleteMemoryEntry(id: number): Promise<{ success: boolean }> {
    return this.fetchWithErrorHandling<{ success: boolean }>(`${API_BASE_URL}/memory/${id}`, {
      method: 'DELETE',
      useCache: false,
    });
  }

  async createInvestigation(body: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
    collaboratorIds?: string[];
  }): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getInvestigation(id: string): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}`);
  }

  async getInvestigationBoard(
    id: string,
    params: { evidenceLimit?: number; hypothesisLimit?: number } = {},
  ): Promise<any> {
    const usp = new URLSearchParams();
    if (params.evidenceLimit) usp.append('evidenceLimit', String(params.evidenceLimit));
    if (params.hypothesisLimit) usp.append('hypothesisLimit', String(params.hypothesisLimit));
    return this.fetchWithErrorHandling<any>(
      `${API_BASE_URL}/investigations/${id}/board${usp.toString() ? `?${usp.toString()}` : ''}`,
      { useCache: false },
    );
  }

  async getInvestigationEvidencePage(
    id: string,
    params: { limit: number; offset: number },
  ): Promise<InvestigationEvidenceListResponseDto> {
    const usp = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    const raw = await this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/investigations/${id}/evidence?${usp.toString()}`,
      { useCache: false },
    );
    return parseWithSchema<InvestigationEvidenceListResponseDto>(
      raw,
      investigationEvidenceListResponseSchema,
      '/investigations/:id/evidence',
    );
  }

  async getInvestigationNotebook(id: string): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}/notebook`, {
      useCache: false,
    });
  }

  async updateInvestigationNotebook(
    id: string,
    payload: { order?: number[]; annotations?: any[] },
  ): Promise<any> {
    return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/investigations/${id}/notebook`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      useCache: false,
    });
  }

  async getDocuments(
    filters: {
      fileType?: string[];
      redFlagLevel?: { min: number; max: number };
      sortBy?: string;
      sortOrder?: string;
      evidenceType?: string;
      source?: string[];
      search?: string;
      startDate?: string;
      endDate?: string;
      collectionId?: string;
    } = {},
    page: number = 1,
    limit: number = 50,
  ): Promise<DocumentsListResponseDto> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.evidenceType) params.append('evidenceType', filters.evidenceType);
    if (filters.source && filters.source.length > 0)
      params.append('source', filters.source.join(','));
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.collectionId) params.append('collectionId', filters.collectionId);
    if (filters.fileType && filters.fileType.length > 0)
      params.append('fileType', filters.fileType.join(','));
    if (filters.redFlagLevel?.min !== undefined)
      params.append('minRedFlag', filters.redFlagLevel.min.toString());
    if (filters.redFlagLevel?.max !== undefined)
      params.append('maxRedFlag', filters.redFlagLevel.max.toString());

    const url = `${API_BASE_URL}/documents?${params.toString()}`;
    const raw = await this.fetchWithErrorHandling<unknown>(url);
    return parseWithSchema<DocumentsListResponseDto>(
      raw,
      documentsListResponseSchema,
      '/documents',
    );
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; database: string }> {
    const url = `${API_BASE_URL}/health`;
    return this.fetchWithErrorHandling<{ status: string; timestamp: string; database: string }>(
      url,
    );
  }

  async readinessCheck(): Promise<{
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    checks: {
      db: { ok: boolean; latencyMs?: number; error?: string; dialect?: string };
      schema?: { missingTables?: string[]; missingOptionalTables?: string[] };
      data?: {
        ok?: boolean;
        entities?: number;
        documents?: number;
        latencyMs?: number;
        error?: string;
      };
      pool?: { total?: number; idle?: number; waiting?: number; max?: number } | null;
      readiness?: { mode?: string; timeoutMs?: number };
    };
    durationMs: number;
  }> {
    const url = `${API_BASE_URL}/health/ready?soft=1`;
    return this.fetchWithErrorHandling<any>(url, { useCache: false });
  }

  /**
   * @deprecated Performance risk: This method fetches the entire entity database (131k+ records).
   * Use document-specific entity mentions or paginated getEntities instead.
   */
  async getAllEntities(limit: number = 0): Promise<any[]> {
    const url = `${API_BASE_URL}/entities/all${limit > 0 ? `?limit=${limit}` : ''}`;
    try {
      const response = await this.fetchWithErrorHandling<any[]>(url);
      return response;
    } catch (error) {
      console.error('Error fetching all entities:', error);
      return [];
    }
  }
}

export const apiClient = new ApiClient();
