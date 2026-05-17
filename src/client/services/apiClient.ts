/// <reference types="vite/client" />
import { z } from 'zod';
import { Person } from '@client/types';
import type { MediaImage, MediaTag } from '@client/types/media.types';
import { mapEntityListItemToPerson } from '@client/mappers/entityMapper';
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
import type { ConnectionDossierDto } from '@shared/dto/connections';
import type {
  EntityListResponseDto,
  SubjectCardListItemDto,
  SubjectsListResponseDto,
} from '@shared/dto/entities';
import type {
  InvestigationEvidenceListResponseDto,
  InvestigationTaskDto,
  InvestigationTaskSummaryDto,
} from '@shared/dto/investigations';
import {
  documentsListResponseSchema,
  emailThreadDetailsResponseSchema,
  emailThreadsResponseSchema,
  investigationEvidenceListResponseSchema,
  subjectsListResponseSchema,
} from '@shared/contracts';
import { Semaphore, isHeavyRoute } from '@client/utils/semaphore';
import { singleFlight, stableStringify } from '@client/utils/singleFlight';
import { GlobalStatsPayload, EntityConnectionsResponse } from '@client/types/api';

export interface ReadinessResponse {
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
}

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

export type SearchMode = 'lexical' | 'semantic' | 'hybrid';

export interface DownloadResponse {
  blob: Blob;
  filename: string | null;
  headers: Headers;
}

export interface MediaBatchResult<T = Record<string, unknown>> {
  id: number;
  success: boolean;
  error?: string;
  image?: MediaImage | null;
  data?: T;
}

export interface MediaBatchResponse<T = Record<string, unknown>> {
  ok?: boolean;
  results: MediaBatchResult<T>[];
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

type EntitySearchFilters = Omit<SearchFilters, 'likelihoodScore'> & {
  likelihood?: string | string[];
  likelihoodScore?: SearchFilters['likelihoodScore'] | string;
};

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
    const maybeMessage =
      (value as Record<string, unknown>).message ||
      (value as Record<string, unknown>).error ||
      (value as Record<string, unknown>).detail;
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
  private static readonly MAX_CACHE_SIZE = 200;

  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];
  private responseCache = new Map<string, { data: unknown; expiresAt: number }>();

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

  private getCachedData<T>(key: string): T | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.responseCache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setCachedData(key: string, data: unknown, ttlMs: number) {
    if (this.responseCache.size >= ApiClient.MAX_CACHE_SIZE) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
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
      if (options?.useCache) {
        const cached = this.getCachedData<T>(key);
        if (cached !== null) return cached;
      }
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

    const { useCache: _, cacheTtl: _ttl, _retryCount, signal, ...fetchOptions } = options || {};
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
          const isIdempotent =
            method === 'GET' || !!(options?.headers as Record<string, string>)?.['Idempotency-Key'];
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
          stringifyApiErrorMessage((errorData as Record<string, unknown>)?.error) ||
          stringifyApiErrorMessage((errorData as Record<string, unknown>)?.message) ||
          `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(msg);
      }

      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      if (method === 'GET' && options?.useCache) {
        const bodyString = options.body ? stableStringify(options.body) : '{}';
        this.setCachedData(`GET:${url}?${bodyString}`, data, options.cacheTtl ?? 60_000);
      }

      const duration = performance.now() - startTime;
      if (typeof window !== 'undefined') {
        import('@client/utils/performanceMonitor.js')
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

      return data as T;
    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') throw error;
      if (error instanceof ContractError || (error as Record<string, unknown>).isContractError) {
        throw error;
      }

      if (!(error as Record<string, unknown>).status) {
        if (method === 'GET' && retryCount < 1) {
          await new Promise((r) => setTimeout(r, 500));
          return this.executeFetchWithRetries(url, { ...options, _retryCount: retryCount + 1 });
        }
      }

      const duration = performance.now() - startTime;
      if (typeof window !== 'undefined') {
        import('@client/utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logAPICall(url, duration, 0, 0);
          })
          .catch(() => {});
      }
      throw error;
    }
  }

  private isServiceUnavailableError(error: unknown): error is Error {
    return error instanceof Error && /HTTP 503\b/.test(error.message);
  }

  private isNotFoundError(error: unknown): error is Error {
    return error instanceof Error && /HTTP 404\b/.test(error.message);
  }

  async get<T>(
    endpoint: string,
    options?: { useCache?: boolean; cacheTtl?: number; signal?: AbortSignal },
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, options);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
      useCache: false,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
      useCache: false,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.fetchWithErrorHandling<T>(url, {
      method: 'PATCH',
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

  async download(endpoint: string): Promise<DownloadResponse> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers();
    if (this.accessToken) headers.set('Authorization', `Bearer ${this.accessToken}`);

    let response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      const newToken = await this.refreshToken();
      if (!newToken) throw new Error('Unauthorized: Session expired');
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      const errorData = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);
      const msg =
        stringifyApiErrorMessage((errorData as Record<string, unknown>)?.error) ||
        stringifyApiErrorMessage((errorData as Record<string, unknown>)?.message) ||
        stringifyApiErrorMessage(errorData) ||
        `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(msg);
    }

    const disposition = response.headers.get('content-disposition') ?? '';
    const filenameMatch =
      /filename\*=UTF-8''([^;]+)/i.exec(disposition) || /filename="?([^";]+)"?/i.exec(disposition);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : null;

    return {
      blob: await response.blob(),
      filename,
      headers: response.headers,
    };
  }

  async getSubjects(
    filters: Record<string, unknown> = {},
    page = 1,
    limit = 24,
  ): Promise<SubjectsListResponseDto> {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if ((filters as Record<string, unknown>).search)
      queryParams.append('search', (filters as Record<string, unknown>).search as string);
    if ((filters as Record<string, unknown>).role)
      queryParams.append('role', (filters as Record<string, unknown>).role as string);
    if ((filters as Record<string, unknown>).entityType)
      queryParams.append('entityType', (filters as Record<string, unknown>).entityType as string);
    if ((filters as Record<string, unknown>).sortBy)
      queryParams.append('sortBy', (filters as Record<string, unknown>).sortBy as string);
    if ((filters as Record<string, unknown>).sortOrder)
      queryParams.append('sortOrder', (filters as Record<string, unknown>).sortOrder as string);
    if ((filters as Record<string, unknown>).likelihood) {
      if (Array.isArray((filters as Record<string, unknown>).likelihood)) {
        ((filters as Record<string, unknown>).likelihood as string[]).forEach((l: string) =>
          queryParams.append('likelihoodScore', l),
        );
      } else {
        queryParams.append(
          'likelihoodScore',
          (filters as Record<string, unknown>).likelihood as string,
        );
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

    const f = filters as EntitySearchFilters;
    if (f.searchTerm) params.append('search', f.searchTerm);
    if (f.evidenceTypes && f.evidenceTypes.length > 0) params.append('role', f.evidenceTypes[0]);

    const likelihoodValue = f.likelihood ?? f.likelihoodScore;
    if (likelihoodValue && Array.isArray(likelihoodValue) && likelihoodValue.length > 0) {
      params.append('likelihood', likelihoodValue[0]);
    } else if (likelihoodValue && typeof likelihoodValue === 'string') {
      params.append('likelihood', likelihoodValue);
    }
    if (f.sortBy) params.append('sortBy', f.sortBy);
    if (f.sortOrder) params.append('sortOrder', f.sortOrder);
    if (f.minRedFlagIndex !== undefined)
      params.append('minRedFlagIndex', f.minRedFlagIndex.toString());
    if (f.maxRedFlagIndex !== undefined)
      params.append('maxRedFlagIndex', f.maxRedFlagIndex.toString());
    if (f.entityType && f.entityType !== 'all') params.append('type', f.entityType);
    if (page > 1) params.append('page', page.toString());
    if (limit !== 24) params.append('limit', limit.toString());

    const url = `${API_BASE_URL}/entities${params.toString() ? `?${params.toString()}` : ''}`;
    try {
      const raw = await this.fetchWithErrorHandling<unknown>(url);
      const resp = raw as EntityListResponseDto;
      const data = Array.isArray(resp.data) ? resp.data : [];
      const normalized: RealPerson[] = data.map((e) => {
        const person = mapEntityListItemToPerson(e);
        return {
          ...person,
          fullName: person.fullName || person.name,
          primaryRole: person.primaryRole || person.title || 'Unknown',
          secondaryRoles: person.secondaryRoles || [],
          keyEvidence: 'No specific evidence available',
          connectionsToEpstein: person.connectionsToEpstein || '',
          fileReferences: [],
        } as RealPerson;
      });
      return { ...resp, data: normalized } as unknown as PaginatedResponse;
    } catch (primaryError) {
      console.warn('Primary /api/entities failed, falling back to /api/subjects:', primaryError);

      const subjects = await this.getSubjects({
        searchTerm: f.searchTerm || '',
        role: f.evidenceTypes && f.evidenceTypes.length > 0 ? f.evidenceTypes[0] : '',
        sortBy: f.sortBy || 'red_flag',
        sortOrder: f.sortOrder || 'desc',
        minRedFlagIndex: f.minRedFlagIndex,
        maxRedFlagIndex: f.maxRedFlagIndex,
        entityType: f.entityType,
        likelihood: f.likelihood || f.likelihoodScore,
      });

      const fallbackData: Person[] = (subjects.subjects || []).map((s: SubjectCardListItemDto) => {
        const forensics = s.forensics;
        const stats = s.stats;
        const legacyRedFlag = (s as SubjectCardListItemDto & { redFlagRating?: number })
          .redFlagRating;
        const redFlag =
          forensics?.redFlagObjective ?? forensics?.redFlagSubjective ?? legacyRedFlag ?? 0;
        return {
          id: String(s.id || ''),
          name: String(s.name || 'Unknown'),
          fullName: String(s.name || 'Unknown'),
          bio: String(s.shortBio || ''),
          entityType: 'Person',
          primaryRole: String(s.role || 'Unknown'),
          secondaryRoles: [],
          mentions: Number(stats.mentions || 0),
          files: Number(stats.documents || 0),
          contexts: [],
          evidenceTypes: [],
          photos: [],
          significantPassages: [],
          likelihoodScore: String(forensics.riskLevel || 'LOW'),
          redFlagScore: Number(redFlag || 0),
          redFlagRating: Number(redFlag || 0),
          redFlagPeppers: '',
          redFlagDescription: `Red Flag Index ${Number(redFlag || 0)}`,
          connectionsToEpstein: '',
          fileReferences: [],
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
    const url = `${API_BASE_URL}/entities/${encodeURIComponent(id)}`;
    const e = await this.fetchWithErrorHandling<Record<string, unknown>>(url);
    return {
      id: String(e.id || ''),
      name: String(e.name || e.fullName || ''),
      fullName: String(e.fullName || e.name || ''),
      redFlagRating: Number(e.redFlagRating || 0),
      blackBookEntry: (e.blackBookEntry as Record<string, unknown> | null) || null,
    } as unknown as Person;
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
  ): Promise<{ data: unknown[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.topic) params.append('topic', options.topic);
    if (options?.from) params.append('from', options.from);
    if (options?.to) params.append('to', options.to);
    if (options?.start) params.append('start', options.start);
    if (options?.end) params.append('end', options.end);
    if (options?.limit != null) params.append('limit', String(options.limit));

    const query = params.toString();
    const url = `${API_BASE_URL}/entities/${encodeURIComponent(id)}/analytics/communications${query ? `?${query}` : ''}`;
    return this.fetchWithErrorHandling<{ data: unknown[]; total: number }>(url, {
      useCache: true,
    });
  }

  async getDocumentThread(id: string): Promise<{ threadId: string; messages: unknown[] }> {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(id)}/thread`;
    return this.fetchWithErrorHandling<{ threadId: string; messages: unknown[] }>(url, {
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
    showYahooPostMortem?: boolean;
    showEmptyBodies?: boolean;
    topic?: string;
    sortBy?: string;
    sortOrder?: string;
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
    if (params.showYahooPostMortem) usp.append('showYahooPostMortem', '1');
    if (params.showEmptyBodies) usp.append('showEmptyBodies', '1');
    if (params.topic) usp.append('topic', params.topic);
    if (params.sortBy) usp.append('sortBy', params.sortBy);
    if (params.sortOrder) usp.append('sortOrder', params.sortOrder);
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

  async getRandomEmailThread(): Promise<{ threadId: string }> {
    const url = `${API_BASE_URL}/emails/random`;
    const raw = await this.fetchWithErrorHandling<unknown>(url, {
      useCache: false,
    });
    return raw as { threadId: string };
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
    options: { mode?: SearchMode } = {},
  ): Promise<{
    entities: Person[];
    documents: unknown[];
    investigations?: unknown[];
    articles?: unknown[];
    media?: unknown[];
    semanticCapability?: Record<string, unknown>;
  }> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit !== 20) params.append('limit', limit.toString());
    if (options.mode) params.append('mode', options.mode);

    const url = `${API_BASE_URL}/search?${params.toString()}`;
    const r = await this.fetchWithErrorHandling<unknown>(url);
    const ents = Array.isArray((r as Record<string, unknown>).entities)
      ? ((r as Record<string, unknown>).entities as unknown[]).map((e: unknown) => {
          const _e = e as Record<string, unknown>;
          return {
            ...(_e as object),
            name: _e.name ?? _e.fullName,
            fullName: _e.fullName ?? _e.name,
            redFlagRating: _e.redFlagRating ?? 0,
            blackBookEntry: _e.blackBookEntry || null,
          };
        })
      : [];
    return {
      entities: ents as unknown as Person[] as Person[],
      documents: ((r as Record<string, unknown>).documents || []) as unknown[],
      investigations: ((r as Record<string, unknown>).investigations || []) as unknown[],
      articles: ((r as Record<string, unknown>).articles || []) as unknown[],
      media: ((r as Record<string, unknown>).media || []) as unknown[],
      semanticCapability: ((r as Record<string, unknown>).semanticCapability || undefined) as
        | Record<string, unknown>
        | undefined,
    };
  }

  async searchEntities(query: string, limit: number = 20): Promise<Person[]> {
    const result = await this.search(query, limit);
    return result.entities || [];
  }

  async createEntity(data: unknown): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(`${API_BASE_URL}/entities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRelationship(data: unknown): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(`${API_BASE_URL}/relationships`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getStats(filters: Record<string, unknown> = {}): Promise<GlobalStatsPayload> {
    const params = new URLSearchParams();
    if (
      (filters as Record<string, string[]>).timeRange &&
      (filters as Record<string, string[]>).timeRange[0]
    )
      params.append('startDate', (filters as Record<string, string[]>).timeRange[0]);
    if (
      (filters as Record<string, string[]>).timeRange &&
      (filters as Record<string, string[]>).timeRange[1]
    )
      params.append('endDate', (filters as Record<string, string[]>).timeRange[1]);
    if ((filters as Record<string, number>).limit)
      params.append('limit', (filters as Record<string, number>).limit.toString());

    const url = `${API_BASE_URL}/stats${params.toString() ? `?${params.toString()}` : ''}`;
    return this.fetchWithErrorHandling<GlobalStatsPayload>(url);
  }

  async getDocumentPages(id: string): Promise<{ pages: string[]; total: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(id)}/pages`);
      if (!response.ok) throw new Error('Failed to fetch document pages');
      return (await response.json()) as { pages: string[]; total: number };
    } catch (error) {
      console.error('Error fetching document pages:', error);
      return { pages: [], total: 0 };
    }
  }

  async getEntityGraph(entityId: string, depth: number = 2): Promise<unknown> {
    const url = `${API_BASE_URL}/entities/${encodeURIComponent(entityId)}/analytics/graph?depth=${depth}`;
    return this.fetchWithErrorHandling<unknown>(url);
  }

  async getEntityDocuments(entityId: string): Promise<unknown[]> {
    const url = `${API_BASE_URL}/entities/${encodeURIComponent(entityId)}/documents`;
    const response = await this.fetchWithErrorHandling<unknown>(url);

    // Handle both array (dev/legacy) and paginated object (prod) formats
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray((response as Record<string, unknown>).data)) {
      return (response as Record<string, unknown>).data as unknown[];
    }

    return [];
  }

  async analyzeDocument(documentId: string): Promise<unknown> {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/analytics/analyze`;
    return this.fetchWithErrorHandling<unknown>(url, { method: 'POST' });
  }

  async getEvidence(evidenceId: string): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/evidence/${encodeURIComponent(evidenceId as string)}`,
      {
        useCache: true,
        cacheTtl: 30000,
      },
    );
  }

  async getEvidenceMetrics(documentId: string): Promise<unknown> {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/analytics/metrics`;
    return this.fetchWithErrorHandling<unknown>(url);
  }

  async getChainOfCustody(documentId: string): Promise<unknown> {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/analytics/custody`;
    return this.fetchWithErrorHandling<unknown>(url);
  }

  async removeEvidenceFromInvestigation(
    investigationEvidenceId: string,
  ): Promise<{ success: boolean }> {
    return this.fetchWithErrorHandling(
      `${API_BASE_URL}/investigations/remove-evidence/${investigationEvidenceId}`,
      { method: 'DELETE' },
    );
  }

  async getInvestigationEvidenceSummary(investigationId: string): Promise<unknown> {
    const url = `${API_BASE_URL}/investigations/${encodeURIComponent(investigationId)}/analytics/evidence-summary`;
    return this.fetchWithErrorHandling<unknown>(url, { useCache: false });
  }

  async getEntityConfidence(entityId: string | number): Promise<unknown> {
    const url = `${API_BASE_URL}/entities/${entityId}/analytics/confidence`;
    return this.fetchWithErrorHandling<unknown>(url, { useCache: true });
  }

  async getDocument(id: string): Promise<unknown> {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(id)}`;
    const d = await this.fetchWithErrorHandling<Record<string, unknown>>(url);
    return {
      ...(d as object),
      fileName: (d as Record<string, unknown>).fileName ?? (d as Record<string, unknown>).file_name,
      fileType: (d as Record<string, unknown>).fileType ?? (d as Record<string, unknown>).file_type,
      contentPreview:
        (d as Record<string, unknown>).contentPreview ??
        (d as Record<string, unknown>).content_preview,
      redFlagRating: (d as Record<string, unknown>).redFlagRating ?? 0,
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
    const response = await this.fetchWithErrorHandling<{ annotations?: unknown[] }>(
      `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/annotations`,
      { useCache: false },
    );
    return (Array.isArray(response.annotations) ? response.annotations : []) as Array<{
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
    }>;
  }

  async createDocumentAnnotation(
    documentId: string,
    payload: {
      type: 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';
      selectedText: string;
      note?: string;
      start: number;
      end: number;
      contextBefore?: string;
      contextAfter?: string;
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
    const response = await this.fetchWithErrorHandling<{ annotation: unknown }>(
      `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/annotations`,
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
        useCache: false,
      },
    );
    return response.annotation as {
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
    };
  }

  async getRelatedDocuments(id: string, limit: number = 10): Promise<unknown[]> {
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(id)}/related?limit=${limit}`;
    return this.fetchWithErrorHandling<unknown[]>(url);
  }

  async getCollections(): Promise<unknown[]> {
    try {
      return await this.get<unknown[]>('/documents/collections');
    } catch (error) {
      if (this.isNotFoundError(error) || this.isServiceUnavailableError(error)) {
        return [];
      }
      throw error;
    }
  }

  async getCollectionDocuments(collectionId: string): Promise<unknown[]> {
    try {
      return await this.get<unknown[]>(`/documents/collections/${collectionId}/documents`);
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
  ): Promise<unknown> {
    const usp = new URLSearchParams();
    if (params.status) usp.append('status', params.status);
    if (params.ownerId) usp.append('ownerId', params.ownerId);
    if (params.page) usp.append('page', String(params.page));
    if (params.limit) usp.append('limit', String(params.limit));
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/investigations${usp.toString() ? `?${usp.toString()}` : ''}`,
    );
  }

  async getInvestigativeTasksByInvestigation(
    investigationId: string,
  ): Promise<{ data: InvestigationTaskDto[]; total: number }> {
    const url = `${API_BASE_URL}/tasks/investigation/${investigationId}`;
    const tasks = await this.fetchWithErrorHandling<InvestigationTaskDto[]>(url, {
      useCache: false,
    });
    return { data: tasks, total: tasks.length };
  }

  async getInvestigativeTaskSummary(investigationId: string): Promise<InvestigationTaskSummaryDto> {
    const url = `${API_BASE_URL}/tasks/summary/${investigationId}`;
    return this.fetchWithErrorHandling<InvestigationTaskSummaryDto>(url, { useCache: false });
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
  }): Promise<InvestigationTaskDto> {
    return this.fetchWithErrorHandling<InvestigationTaskDto>(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify(body),
      useCache: false,
    });
  }

  async updateInvestigativeTask(
    id: number,
    updates: Partial<InvestigationTaskDto>,
  ): Promise<InvestigationTaskDto> {
    return this.fetchWithErrorHandling<InvestigationTaskDto>(
      `${API_BASE_URL}/tasks/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
        useCache: false,
      },
    );
  }

  async updateInvestigativeTaskProgress(
    id: number,
    progress: number,
  ): Promise<InvestigationTaskDto> {
    return this.fetchWithErrorHandling<InvestigationTaskDto>(
      `${API_BASE_URL}/tasks/${encodeURIComponent(id)}/progress`,
      {
        method: 'PATCH',
        body: JSON.stringify({ progress }),
        useCache: false,
      },
    );
  }

  async getInvestigationMemoryEntries(params: {
    investigationId: number;
    page?: number;
    limit?: number;
    searchQuery?: string;
  }): Promise<import('@client/types/memory').MemorySearchResult> {
    const usp = new URLSearchParams();
    if (params.page) usp.append('page', String(params.page));
    if (params.limit) usp.append('limit', String(params.limit));
    if (params.searchQuery) usp.append('q', params.searchQuery);
    usp.append('memoryType', 'episodic');
    const url = `${API_BASE_URL}/memory${usp.toString() ? `?${usp.toString()}` : ''}`;
    const result =
      await this.fetchWithErrorHandling<import('@client/types/memory').MemorySearchResult>(url);
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
    metadata?: Record<string, unknown>;
  }): Promise<import('@client/types/memory').MemoryEntry> {
    const payload: import('@client/types/memory').CreateMemoryEntryInput = {
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
    return this.fetchWithErrorHandling<import('@client/types/memory').MemoryEntry>(
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
    updates: import('@client/types/memory').UpdateMemoryEntryInput,
  ): Promise<import('@client/types/memory').MemoryEntry> {
    return this.fetchWithErrorHandling<import('@client/types/memory').MemoryEntry>(
      `${API_BASE_URL}/memory/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
        useCache: false,
      },
    );
  }

  async deleteMemoryEntry(id: number): Promise<{ success: boolean }> {
    return this.fetchWithErrorHandling<{ success: boolean }>(
      `${API_BASE_URL}/memory/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        useCache: false,
      },
    );
  }

  async createInvestigation(body: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
    collaboratorIds?: string[];
  }): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(`${API_BASE_URL}/investigations`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getInvestigation(id: string): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/investigations/${encodeURIComponent(id)}`,
    );
  }

  async getInvestigationBoard(
    id: string,
    params: { evidenceLimit?: number; hypothesisLimit?: number } = {},
  ): Promise<unknown> {
    const usp = new URLSearchParams();
    if (params.evidenceLimit) usp.append('evidenceLimit', String(params.evidenceLimit));
    if (params.hypothesisLimit) usp.append('hypothesisLimit', String(params.hypothesisLimit));
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/investigations/${encodeURIComponent(id)}/board${usp.toString() ? `?${usp.toString()}` : ''}`,
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
      `${API_BASE_URL}/investigations/${encodeURIComponent(id)}/evidence?${usp.toString()}`,
      { useCache: false },
    );
    return parseWithSchema<InvestigationEvidenceListResponseDto>(
      raw,
      investigationEvidenceListResponseSchema,
      '/investigations/:id/evidence',
    );
  }

  async getInvestigationNotebook(id: string): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/investigations/${encodeURIComponent(id)}/notebook`,
      {
        useCache: false,
      },
    );
  }

  async updateInvestigationNotebook(
    id: string,
    payload: { order?: number[]; annotations?: unknown[] },
  ): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/investigations/${encodeURIComponent(id)}/notebook`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
        useCache: false,
      },
    );
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
      includeMedia?: boolean;
      excludedFileTypes?: string[];
      mode?: SearchMode;
      hasFailedRedactions?: boolean;
    } = {},
    page: number = 1,
    limit: number = 50,
  ): Promise<DocumentsListResponseDto> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if ((filters as Record<string, unknown>).search)
      params.append('search', (filters as Record<string, unknown>).search as string);
    if (filters.mode) params.append('mode', filters.mode);
    if ((filters as Record<string, unknown>).sortBy)
      params.append('sortBy', (filters as Record<string, unknown>).sortBy as string);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.evidenceType) params.append('evidenceType', filters.evidenceType);
    if (filters.source && filters.source.length > 0)
      params.append('source', filters.source.join(','));
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.collectionId) params.append('collectionId', filters.collectionId);
    if (filters.includeMedia) params.append('includeMedia', 'true');
    if (filters.excludedFileTypes && filters.excludedFileTypes.length > 0)
      params.append('excludedFileTypes', filters.excludedFileTypes.join(','));
    if (filters.hasFailedRedactions !== undefined)
      params.append('hasFailedRedactions', String(filters.hasFailedRedactions));
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

  async readinessCheck(): Promise<ReadinessResponse> {
    const url = `${API_BASE_URL}/health/ready`;
    return this.fetchWithErrorHandling<ReadinessResponse>(url, {
      useCache: false,
    });
  }

  /**
   * @deprecated Performance risk: This method fetches the entire entity database (131k+ records).
   * Use document-specific entity mentions or paginated getEntities instead.
   */
  async getAllEntities(limit: number = 0): Promise<unknown[]> {
    const url = `${API_BASE_URL}/entities/all${limit > 0 ? `?limit=${limit}` : ''}`;
    try {
      const response = await this.fetchWithErrorHandling<unknown[]>(url);
      return response;
    } catch (error) {
      console.error('Error fetching all entities:', error);
      return [];
    }
  }

  async getMediaByDocumentId(
    documentId: string | number,
  ): Promise<import('@client/types/media.types').MediaImage[]> {
    return this.get<import('@client/types/media.types').MediaImage[]>(
      `/media/images?documentId=${encodeURIComponent(String(documentId))}&limit=200&slim=true&excludeTextScans=false`,
    );
  }

  async extractMediaForDocument(documentId: string | number): Promise<{ extractedCount: number }> {
    return this.post<{ extractedCount: number }>(
      `/media/images/extract/${encodeURIComponent(String(documentId))}`,
      {},
    );
  }

  async getMediaTags(): Promise<MediaTag[]> {
    return this.get<MediaTag[]>('/media/tags', { cacheTtl: 60_000 });
  }

  async createMediaTag(body: { name: string; color: string }): Promise<MediaTag> {
    return this.post<MediaTag>('/media/tags', body);
  }

  async getImageTags(imageId: number): Promise<MediaTag[]> {
    return this.get<MediaTag[]>(`/media/images/${encodeURIComponent(String(imageId))}/tags`);
  }

  async getImagePeople<T = unknown>(imageId: number): Promise<T[]> {
    return this.get<T[]>(`/media/images/${encodeURIComponent(String(imageId))}/people`);
  }

  async updateMediaImage(
    imageId: number,
    updates: { title?: string; description?: string; redFlagRating?: number },
  ): Promise<MediaImage> {
    return this.put<MediaImage>(`/media/images/${encodeURIComponent(String(imageId))}`, updates);
  }

  async rotateMediaImage(imageId: number, direction: 'left' | 'right'): Promise<MediaImage> {
    return this.put<MediaImage>(`/media/images/${encodeURIComponent(String(imageId))}/rotate`, {
      direction,
    });
  }

  async addTagToMediaImage(imageId: number, tagId: number): Promise<{ ok: true }> {
    return this.post<{ ok: true }>(`/media/images/${encodeURIComponent(String(imageId))}/tags`, {
      tagId,
    });
  }

  async removeTagFromMediaImage(imageId: number, tagId: number): Promise<{ ok: true }> {
    return this.delete<{ ok: true }>(
      `/media/images/${encodeURIComponent(String(imageId))}/tags/${encodeURIComponent(String(tagId))}`,
    );
  }

  async addPersonToMediaImage(imageId: number, personId: number): Promise<{ ok: true }> {
    return this.post<{ ok: true }>(`/media/images/${encodeURIComponent(String(imageId))}/people`, {
      personId,
    });
  }

  async removePersonFromMediaImage(imageId: number, personId: number): Promise<{ ok: true }> {
    return this.delete<{ ok: true }>(
      `/media/images/${encodeURIComponent(String(imageId))}/people/${encodeURIComponent(String(personId))}`,
    );
  }

  async batchRotateMediaImages(
    imageIds: number[],
    direction: 'left' | 'right',
  ): Promise<MediaBatchResponse> {
    return this.put<MediaBatchResponse>('/media/images/batch/rotate', { imageIds, direction });
  }

  async batchRateMediaImages(imageIds: number[], rating: number): Promise<MediaBatchResponse> {
    return this.put<MediaBatchResponse>('/media/images/batch/rate', { imageIds, rating });
  }

  async batchUpdateMediaMetadata(
    imageIds: number[],
    updates: { title?: string; description?: string },
  ): Promise<MediaBatchResponse> {
    return this.put<MediaBatchResponse>('/media/images/batch/metadata', { imageIds, updates });
  }

  async batchTagMediaItems(
    itemIds: number[],
    tagIds: number[],
    action: 'add' | 'remove',
  ): Promise<MediaBatchResponse> {
    return this.put<MediaBatchResponse>('/media/items/batch/tags', { itemIds, tagIds, action });
  }

  async batchPeopleMediaItems(
    itemIds: number[],
    personIds: number[],
    action: 'add' | 'remove',
  ): Promise<MediaBatchResponse> {
    return this.put<MediaBatchResponse>('/media/items/batch/people', {
      itemIds,
      personIds,
      action,
    });
  }
  async getDocumentClaims<T = unknown>(documentId: string): Promise<T[]> {
    return this.get<T[]>(`/documents/${encodeURIComponent(documentId)}/claims`);
  }

  async getEntityClaims<T = unknown>(entityId: string): Promise<T[]> {
    return this.get<T[]>(`/entities/${encodeURIComponent(entityId)}/claims`);
  }

  async verifyClaim(
    id: string,
    status: number,
    rejectionReason?: string,
  ): Promise<{ success: boolean }> {
    return this.post(`/claims/${encodeURIComponent(id)}/verify`, { status, rejectionReason });
  }

  async getEntityConnections(
    entityId: string,
    opts: { limit?: number; minScore?: number } = {},
  ): Promise<EntityConnectionsResponse> {
    const params = new URLSearchParams();
    if (opts.limit != null) params.set('limit', String(opts.limit));
    if (opts.minScore != null) params.set('minScore', String(opts.minScore));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.fetchWithErrorHandling<EntityConnectionsResponse>(
      `${API_BASE_URL}/entities/${encodeURIComponent(entityId)}/connections${qs}`,
    );
  }

  async getShortestPath(sourceId: string, targetId: string): Promise<unknown> {
    return this.fetchWithErrorHandling<unknown>(
      `${API_BASE_URL}/graph/paths?sourceId=${encodeURIComponent(sourceId)}&targetId=${encodeURIComponent(targetId)}`,
    );
  }

  async getConnectionDossier(entityAId: string, entityBId: string): Promise<ConnectionDossierDto> {
    return this.get<ConnectionDossierDto>(
      `/connections?a=${encodeURIComponent(entityAId)}&b=${encodeURIComponent(entityBId)}`,
    );
  }
}

export const apiClient = new ApiClient();
