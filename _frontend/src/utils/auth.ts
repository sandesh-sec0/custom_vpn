/**
 * Auth Utility — sessionStorage token helpers
 *
 * Token is stored in sessionStorage so it is automatically cleared when the
 * browser tab is closed. This is the safest client-side option before true
 * httpOnly cookie support is added to the backend.
 *
 * NOTE: For production, migrate to httpOnly Secure cookies set by the backend.
 */

const TOKEN_KEY = 'vpn_access_token';
const USER_KEY = 'vpn_user';



// ─── User cache ──────────────────────────────────────────────────────────────

import type { User } from '@/api/types';

/** Cache the current user object. Only non-sensitive fields stored. */
export function setStoredUser(user: User): void {
  // Never store password or sensitive fields
  const safe: Pick<User, 'id' | 'username' | 'email' | 'is_admin' | 'is_active'> = {
    id: user.id,
    username: user.username,
    email: user.email,
    is_admin: user.is_admin,
    is_active: user.is_active,
  };
  sessionStorage.setItem(USER_KEY, JSON.stringify(safe));
}

/** Retrieve the cached user, or null if not found / parse error. */
export function getStoredUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Remove the cached user from storage. */
export function clearStoredUser(): void {
  sessionStorage.removeItem(USER_KEY);
}

/** Clear all auth-related keys from sessionStorage. */
export function clearAllAuth(): void {
  clearStoredUser();
}
