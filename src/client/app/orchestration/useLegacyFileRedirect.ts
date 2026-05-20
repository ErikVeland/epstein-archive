import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

export function useLegacyFileRedirect(params: {
  apiEnabled: boolean;
  pathname: string;
  navigate: NavigateFunction;
}) {
  const legacyFileSuffix = params.pathname.startsWith('/epstein/files/')
    ? params.pathname.replace(/^\/epstein\/files\//, '')
    : null;

  const { data: legacyFilePayload } = useQuery<{
    redirectTo?: string;
    documentId?: string;
  } | null>({
    queryKey: ['legacyFilePath', legacyFileSuffix],
    queryFn: async () => {
      if (!legacyFileSuffix) return null;
      const response = await fetch(
        `/api/resolve/epstein-file?path=${encodeURIComponent(legacyFileSuffix)}`,
        { credentials: 'include' },
      );
      if (!response.ok) return null;
      return (await response.json()) as { redirectTo?: string; documentId?: string };
    },
    enabled: params.apiEnabled && !!legacyFileSuffix,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!legacyFilePayload) return;
    if (legacyFilePayload.redirectTo) {
      params.navigate(legacyFilePayload.redirectTo, { replace: true });
    } else if (legacyFilePayload.documentId) {
      params.navigate(`/documents/${encodeURIComponent(legacyFilePayload.documentId)}`, {
        replace: true,
      });
    }
  }, [legacyFilePayload, params.navigate]);
}
