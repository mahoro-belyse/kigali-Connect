// src/lib/query-client.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single shared QueryClient instance for the whole app.
// Imported by App.tsx's QueryClientProvider.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,   // 2 minutes — avoids over-fetching
      refetchOnWindowFocus: false,  // Don't refetch just because user switched tabs
    },
    mutations: {
      retry: 0,                     // Never auto-retry mutations (POST/PUT/DELETE)
    },
  },
});
