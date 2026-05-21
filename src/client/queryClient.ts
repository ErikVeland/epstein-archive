import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});
