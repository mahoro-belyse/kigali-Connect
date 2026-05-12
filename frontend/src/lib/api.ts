// src/lib/api.ts
// ─────────────────────────────────────────────────────────────────────────────
// Compatibility shim — re-exports the main apiClient so any file that does
//   import api from '@/lib/api'
//   import api from '../../lib/api'
// continues to work without changes during conversion.
//
// The real axios instance (with JWT interceptors, base URL, 401 handling)
// lives in src/api/client.ts — this just re-exports it.
// ─────────────────────────────────────────────────────────────────────────────
export { default } from '@/api/client';

// Also re-export all named API helpers so files can optionally do:
//   import api, { eventsApi, bookingsApi } from '@/lib/api'
export {
  authApi,
  usersApi,
  eventsApi,
  bookingsApi,
  paymentsApi,
  analyticsApi,
  reviewsApi,
  notificationsApi,
} from '@/api/client';
