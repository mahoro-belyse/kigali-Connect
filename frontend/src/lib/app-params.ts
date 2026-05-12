// src/lib/app-params.ts
// ─────────────────────────────────────────────────────────────────────────────
// REPLACES the Base44 app-params.js entirely.
//
// Base44's version read appId, token, functionsVersion etc. from URL params
// and localStorage — all Base44 SDK concepts we no longer need.
//
// Our app uses standard environment variables + our own JWT auth.
// This file is kept ONLY so any lingering import of 'app-params' doesn't
// crash. It exports an empty-compatible object.
// ─────────────────────────────────────────────────────────────────────────────

export const appParams = {
  // These were Base44 SDK fields — all null/empty in our app
  appId:            import.meta.env.VITE_APP_ID            ?? '',
  token:            null,   // We use our own JWT in localStorage
  functionsVersion: null,
  appBaseUrl:       import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  fromUrl:          typeof window !== 'undefined' ? window.location.href : '',
};

// ─── Our actual environment config (use this in new files) ───────────────────
export const ENV = {
  API_URL:      import.meta.env.VITE_API_URL      ?? 'http://localhost:8000/api/v1',
  APP_NAME:     import.meta.env.VITE_APP_NAME     ?? 'SmartEvent',
  APP_VERSION:  import.meta.env.VITE_APP_VERSION  ?? '1.0.0',
  IS_DEV:       import.meta.env.DEV               ?? false,
  IS_PROD:      import.meta.env.PROD              ?? false,
} as const;
