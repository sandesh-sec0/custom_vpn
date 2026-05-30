/**
 * API Type Definitions
 *
 * TypeScript interfaces mirroring the backend Pydantic schemas.
 * All types are plain interfaces — no class instances, no circular deps.
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
  user: User;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  is_admin: boolean;
  is_active: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ─── Session ─────────────────────────────────────────────────────────────────

export interface Session {
  id: number;
  user_id: number | null;
  username: string | null;
  client_ip: string;
  session_id: string; // UUID
  status: 'active' | 'disconnected';
  created_at: string;
  last_active: string;
  disconnected_at: string | null;
  bytes_up: number;
  bytes_down: number;
}

// ─── Services & Permissions ──────────────────────────────────────────────────

export interface Service {
  id: number;
  name: string;
  host: string;
  port: number;
  protocol: string;
  description: string;
  is_persistent: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: number;
  user_id: number;
  service_id: number;
  created_at: string;
}

export interface ServiceCreateRequest {
  name: string;
  host: string;
  port: number;
  protocol: string;
  description?: string;
  is_persistent?: boolean;
}

export interface UserPermissionCreateRequest {
  user_id: number;
  service_id: number;
}

export interface PermissionDetail {
  id: number;
  user_id: number;
  username: string;
  email: string;
  service_id: number;
  service_name: string;
  created_at: string;
}

export interface ConfigResponse {
  server: string;
  service_name: string;
  local_port: number;
  credentials?: string;
  target_host: string;
  target_port: number;
  persistent: boolean;
}

// ─── AuditLog ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource: string;
  timestamp: string;
  ip_address: string;
  details: string;
  status_code: number;
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: 'healthy' | 'unhealthy';
  vpn: 'enabled' | 'disabled' | 'unhealthy';
}

export interface VpnStats {
  vpn_online: boolean;
  uptime_seconds: number;
  active_sessions: number;
  max_capacity: number;
  total_bytes_up: number;
  total_bytes_down: number;
  total_connections: number;
  anomalies: string[];
  auth_failures_last_5m: Record<string, number>;
  snapshot_timestamp: string;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
  status: number;
}

export class ApiException extends Error {
  public readonly status: number;
  public readonly detail: string;
  
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiException';
  }
}

