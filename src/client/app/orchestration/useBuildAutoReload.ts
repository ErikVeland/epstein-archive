import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export function useBuildAutoReload() {
  const currentHash = (() => {
    const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
    const src = entry?.src || '';
    return (src.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null;
  })();

  const { data: buildCheckHtml } = useQuery<string | null>({
    queryKey: ['buildCheck'],
    queryFn: async () => {
      if (!currentHash) return null;
      const res = await fetch(`/?build_check=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!res.ok) return null;
      return res.text();
    },
    enabled: !!currentHash,
    refetchInterval: 15_000,
    staleTime: 0,
  });

  useEffect(() => {
    if (!buildCheckHtml || !currentHash) return;
    const latestHash = (buildCheckHtml.match(/index-([A-Za-z0-9_-]+)\.js/) || [])[1] || null;
    if (latestHash && latestHash !== currentHash) {
      window.location.reload();
    }
  }, [buildCheckHtml, currentHash]);
}
