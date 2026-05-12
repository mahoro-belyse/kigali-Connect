export const appParams = {
  appId:            import.meta.env.VITE_APP_ID            ?? '',
  token:            null,   
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
