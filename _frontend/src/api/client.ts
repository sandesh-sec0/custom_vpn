/**
 * API Client — Custom fetch() wrapper
 *
 * IMPORTANT: axios is FORBIDDEN per project rules (security vulnerability).
 * This module wraps the native fetch() API with:
 *  - Base URL from environment variable
 *  - Bearer token injection from sessionStorage
 *  - Timeout handling via AbortController
 *  - Typed error responses
 *  - 401 auto-logout via custom event
 *
 * Usage:
 *   const users = await apiClient.get<User[]>('/users');
 *   await apiClient.post('/auth/login', { username, password });
 */

import { ApiException } from './types';

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000/api';
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 30_000);

// ─── CSRF Token ──────────────────────────────────────────────────────────────

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(`${BASE_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include'
    });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
    }
    return csrfToken || '';
  } catch (err) {
    console.warn('Failed to fetch CSRF token:', err);
    return '';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build common headers for every request.
 * Skips Content-Type for FormData (browser sets boundary automatically).
 * Automatically injects X-CSRF-Token for state-changing requests.
 */
async function buildHeaders(method: string, body?: unknown): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = await getCsrfToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
  }
  return headers;
}

/**
 * Executes a fetch() with an AbortController timeout.
 * Throws ApiException on non-2xx responses.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = `${BASE_URL}${path}`;
  const headers = await buildHeaders(method, body);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'include', // send cookies if any
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === 'AbortError') {
      throw new ApiException(408, 'Request timed out. Please try again.');
    }
    throw new ApiException(0, 'Network error. Check your connection.');
  }

  clearTimeout(timeoutId);

  // Handle 401 — fire event so AuthContext can react
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('vpn:auth:expired'));
    throw new ApiException(401, 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const json = await response.json();
      if (typeof json.detail === 'string') detail = json.detail;
    } catch {
      // Ignore parse errors
    }
    throw new ApiException(response.status, detail);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>('GET', path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  delete<T = void>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};
