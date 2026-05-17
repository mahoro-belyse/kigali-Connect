// frontend/src/utils/imageUrl.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Remove trailing /api/v1 to get base URL for static files
const STATIC_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

export function getImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  // If it's already an absolute URL, return as is
  if (path.startsWith('http')) return path;
  // Ensure path starts with /
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${STATIC_BASE_URL}${normalized}`;
}