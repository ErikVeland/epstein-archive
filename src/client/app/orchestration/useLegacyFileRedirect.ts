import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

export function useLegacyFileRedirect(params: {
  apiEnabled: boolean;
  pathname: string;
  navigate: NavigateFunction;
}) {
  const { apiEnabled, pathname, navigate } = params;
  const legacyFileSuffix = pathname.startsWith('/epstein/files/')
    ? pathname.replace(/^\/epstein\/files\//, '')
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
    enabled: apiEnabled && !!legacyFileSuffix,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!legacyFilePayload) return;
    if (legacyFilePayload.redirectTo) {
      navigate(legacyFilePayload.redirectTo, { replace: true });
    } else if (legacyFilePayload.documentId) {
      navigate(`/documents/${encodeURIComponent(legacyFilePayload.documentId)}`, {
        replace: true,
      });
    }
  }, [legacyFilePayload, navigate]);
}
