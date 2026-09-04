import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { Investigation, Investigator } from '@client/types/investigation';
import { investigationsApi } from '../investigations.api';
import { mapApiInvestigation } from '../investigations.model';
import { trackInvestigationEvent } from '@client/utils/investigationTelemetry';

interface UseInvestigationListOptions {
  currentUser?: Investigator;
  onError?: (message: string) => void;
}

export const useInvestigationList = (options: UseInvestigationListOptions = {}) => {
  const onErrorRef = useRef(options.onError);
  useLayoutEffect(() => {
    onErrorRef.current = options.onError;
  });
  const currentUserId = options.currentUser?.id;
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvestigations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await investigationsApi.list();
      const mapped = (data?.data || []).map(mapApiInvestigation);
      setInvestigations(mapped);
      trackInvestigationEvent('investigation_list_loaded', {
        metadata: { caseCount: mapped.length },
      });
      return mapped;
    } catch (error) {
      console.error('Error loading investigations:', error);
      const message = 'Cases could not be loaded. Please try again.';
      setError(message);
      onErrorRef.current?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInvestigation = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const inv = await investigationsApi.getById(id);
      const mapped = mapApiInvestigation(inv);
      setSelectedInvestigation(mapped);
      trackInvestigationEvent('investigation_case_opened', { caseId: mapped.id });
      return { investigation: mapped, raw: inv };
    } catch (error) {
      console.error('Error loading investigation:', error);
      const message = 'This case could not be loaded. Please try again.';
      setError(message);
      onErrorRef.current?.(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createInvestigation = useCallback(
    async (payload: { title: string; description?: string; hypothesis?: string }) => {
      if (!currentUserId) throw new Error('Current user is required to create a case');
      const created = await investigationsApi.create({
        title: payload.title,
        description: payload.description,
        scope: payload.hypothesis,
      });
      const mapped = mapApiInvestigation(created);
      setSelectedInvestigation(mapped);
      setInvestigations((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
      trackInvestigationEvent('investigation_created', { caseId: mapped.id });
      return { investigation: mapped, raw: created };
    },
    [currentUserId],
  );

  return {
    investigations,
    setInvestigations,
    selectedInvestigation,
    setSelectedInvestigation,
    isLoading,
    error,
    clearError: () => setError(null),
    loadInvestigations,
    loadInvestigation,
    createInvestigation,
  };
};
