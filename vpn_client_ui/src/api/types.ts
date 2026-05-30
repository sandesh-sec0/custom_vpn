export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: number
  username: string
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface Service {
  id: number
  name: string
  host: string
  port: number
  protocol: string
  description: string
  is_persistent: boolean
  created_at: string
}

export interface ConfigResponse {
  server: string
  service_name: string
  local_port: number
  credentials: string
  target_host: string
  target_port: number
  persistent: boolean
}

export interface VpnStats {
  vpn_online: boolean
  uptime_seconds: number
  active_sessions: number
  max_capacity: number
  total_bytes_up: number
  total_bytes_down: number
  total_connections: number
  anomalies: string[]
  snapshot_timestamp: string
}

export interface Session {
  id: number
  user_id: number | null
  username: string | null
  client_ip: string
  session_id: string
  status: 'active' | 'disconnected'
  created_at: string
  last_active: string
  disconnected_at: string | null
  bytes_up: number
  bytes_down: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

export class ApiException extends Error {
  public readonly status: number
  public readonly detail: string
  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
    this.name = 'ApiException'
  }
}
