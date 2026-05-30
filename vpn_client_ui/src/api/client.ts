import { ApiException } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:8000/api'
const DEFAULT_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? 30_000)

let csrfToken: string | null = null

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken
  try {
    const res = await fetch(`${BASE_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      csrfToken = data.csrfToken
    }
    return csrfToken || ''
  } catch {
    return ''
  }
}

async function buildHeaders(method: string, body?: unknown): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = await getCsrfToken()
    if (token) headers['X-CSRF-Token'] = token
  }
  return headers
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const url = `${BASE_URL}${path}`
  const headers = await buildHeaders(method, body)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'include',
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if ((err as Error).name === 'AbortError') {
      throw new ApiException(408, 'Request timed out.')
    }
    throw new ApiException(0, 'Network error. Is the backend running?')
  }

  clearTimeout(timeoutId)

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('vpn:auth:expired'))
    throw new ApiException(401, 'Session expired. Please log in again.')
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const json = await response.json()
      if (typeof json.detail === 'string') detail = json.detail
    } catch { /* ignore */ }
    throw new ApiException(response.status, detail)
  }

  if (response.status === 204) return undefined as unknown as T
  return response.json() as Promise<T>
}

export const apiClient = {
  get<T>(path: string): Promise<T> { return request<T>('GET', path) },
  post<T>(path: string, body?: unknown): Promise<T> { return request<T>('POST', path, body) },
  delete<T = void>(path: string): Promise<T> { return request<T>('DELETE', path) },
}
