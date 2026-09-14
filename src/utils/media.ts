/**
 * Resolves media URLs (e.g. /api/files/:id, avatars, post photos/videos)
 * ensuring relative paths point to the backend API origin instead of the frontend Vite port.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';

  // If already absolute or local preview protocol, return as-is
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  // Resolve backend origin from environment or default local port
  const apiBase: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const backendOrigin = apiBase.replace(/\/api\/?$/, '');

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${backendOrigin}${normalizedPath}`;
}
