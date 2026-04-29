import { useCallback, useRef, useState } from 'react';
import type { Investigation, Investigator } from '@client/types/investigation';
import { investigationsApi } from '../investigations.api';
import { mapApiInvestigation } from '../investigations.model';

interface UseInvestigationListOptions {
  currentUser?: Investigator;
  onError?: (message: string) => void;
}

export const useInvestigationList = (options: UseInvestigationListOptions = {}) => {
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;
  const currentUserId = options.currentUser?.id;
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInvestigations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await investigationsApi.list();
      const mapped = (data?.data || []).map(mapApiInvestigation);
      setInvestigations(mapped);
      return mapped;
    } catch (error) {
      console.error('Error loading investigations:', error);
      onErrorRef.current?.('Failed to load investigations');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadInvestigation = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const inv = await investigationsApi.getById(id);
      const mapped = mapApiInvestigation(inv);
      setSelectedInvestigation(mapped);
      return { investigation: mapped, raw: inv };
    } catch (error) {
      console.error('Error loading investigation:', error);
      onErrorRef.current?.('Failed to load investigation');
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
        ownerId: currentUserId,
        scope: payload.hypothesis,
      });
      const mapped = mapApiInvestigation(created);
      setSelectedInvestigation(mapped);
      setInvestigations((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
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
    loadInvestigations,
    loadInvestigation,
    createInvestigation,
  };
};
