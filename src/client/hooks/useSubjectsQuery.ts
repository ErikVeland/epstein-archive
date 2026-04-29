import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@client/services/apiClient';
import type { SubjectsListResponseDto } from '@shared/dto/entities';

interface SubjectsQueryInput {
  page: number;
  pageSize: number;
  searchTerm: string;
  entityType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
}

export const useSubjectsQuery = (input: SubjectsQueryInput) => {
  const filters = {
    search: input.searchTerm,
    role: undefined,
    entityType: input.entityType === 'all' ? undefined : input.entityType,
    sortBy: input.sortBy,
    likelihood: input.selectedRiskLevel || undefined,
    sortOrder: input.sortOrder,
  };

  return useQuery<SubjectsListResponseDto>({
    queryKey: [
      'subjects',
      input.page,
      input.pageSize,
      input.searchTerm,
      input.entityType,
      input.sortBy,
      input.sortOrder,
      input.selectedRiskLevel,
    ],
    queryFn: () => apiClient.getSubjects(filters, input.page, input.pageSize),
    placeholderData: (previousData) => previousData,
  });
};
