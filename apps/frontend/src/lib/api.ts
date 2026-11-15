/**
 * Centralized API Client & Endpoint Resolution
 * Ensures portability across local development, Docker containers, reverse proxies, and production hosts.
 */

export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'http://127.0.0.1:8000'

/**
 * Returns a fully qualified API endpoint URL.
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}

/**
 * Standard fetch wrapper with automatic base URL injection.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}
