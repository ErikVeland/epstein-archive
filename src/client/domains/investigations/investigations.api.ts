import { apiClient } from '../../services/apiClient';
import type {
  InvestigationEvidenceByTypeResponseDto,
  InvestigationEvidenceListResponseDto,
} from '@shared/dto/investigations';

export interface InvestigationSummaryDto {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  scope?: string;
}

export interface InvestigationNotebookDto {
  order: number[];
  annotations?: unknown[];
}

export interface InvestigationListApiResponse {
  data: InvestigationSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const investigationsApi = {
  list: async (): Promise<InvestigationListApiResponse> => {
    return (await apiClient.getInvestigations()) as InvestigationListApiResponse;
  },

  getById: async (id: string): Promise<Record<string, unknown>> => {
    return (await apiClient.getInvestigation(id)) as Record<string, unknown>;
  },

  create: async (payload: {
    title: string;
    description?: string;
    ownerId: string;
    scope?: string;
  }): Promise<Record<string, unknown>> => {
    return (await apiClient.createInvestigation(payload)) as Record<string, unknown>;
  },

  getBoard: async (id: string, params?: { evidenceLimit?: number; hypothesisLimit?: number }) => {
    return apiClient.getInvestigationBoard(id, params);
  },

  getEvidencePage: async (
    id: string,
    params: { limit: number; offset: number },
  ): Promise<InvestigationEvidenceListResponseDto> => {
    return apiClient.getInvestigationEvidencePage(id, params);
  },

  getCaseFolder: async (id: string): Promise<InvestigationEvidenceByTypeResponseDto> => {
    return apiClient.get(`/investigations/${id}/evidence-by-type`, { useCache: false });
  },

  getHypotheses: async (id: string): Promise<unknown[]> => {
    return apiClient.get(`/investigations/${id}/hypotheses`, { useCache: false });
  },

  getNotebook: async (id: string): Promise<InvestigationNotebookDto> => {
    return apiClient.getInvestigationNotebook(id) as Promise<InvestigationNotebookDto>;
  },

  updateNotebook: async (
    id: string,
    payload: { order?: number[]; annotations?: unknown[] },
  ): Promise<unknown> => {
    return apiClient.updateInvestigationNotebook(id, payload);
  },

  getTimelineEvents: async (id: string): Promise<unknown[]> => {
    return apiClient.get(`/investigations/${id}/timeline-events`, { useCache: false });
  },

  addEvidence: async (id: string, payload: Record<string, unknown>): Promise<unknown> => {
    return apiClient.post(`/investigations/${id}/evidence`, payload);
  },

  removeEvidenceLink: async (investigationEvidenceId: number | string): Promise<unknown> => {
    return apiClient.delete(`/investigation/remove-evidence/${investigationEvidenceId}`);
  },
};
