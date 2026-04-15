import * as React from 'react';

const isChunkLoadError = (err: unknown): boolean => {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : err == null
          ? ''
          : String(err);
  return (
    /Importing a module script failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  );
};

/**
 * Wrap React.lazy with a one-time "cache bust + reload" retry on chunk load failures.
 * This prevents users from getting stuck after a deploy when an old HTML references a removed chunk.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  key: string,
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      if (typeof window !== 'undefined' && isChunkLoadError(err)) {
        const guardKey = `__chunk_reload__${key}`;
        try {
          if (!sessionStorage.getItem(guardKey)) {
            sessionStorage.setItem(guardKey, '1');
            const url = new URL(window.location.href);
            url.searchParams.set('cachebust', Date.now().toString());
            window.location.replace(url.toString());
            // Return a never-resolving promise so React doesn't continue rendering.
            return new Promise<{ default: T }>(() => {});
          }
        } catch {
          // ignore and fall through
        }
      }
      throw err;
    }
  });
}
