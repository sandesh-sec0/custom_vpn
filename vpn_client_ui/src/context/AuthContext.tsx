import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiClient } from '@/api/client'
import type { AuthResponse, LoginRequest, User } from '@/api/types'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  error: string | null
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const raw = sessionStorage.getItem('vpn_client_user')
    const user = raw ? (JSON.parse(raw) as User) : null
    return { isAuthenticated: !!user, isLoading: false, user, error: null }
  })

  useEffect(() => {
    function handleExpired() {
      sessionStorage.removeItem('vpn_client_user')
      setState({ isAuthenticated: false, isLoading: false, user: null, error: null })
    }
    window.addEventListener('vpn:auth:expired', handleExpired)
    return () => window.removeEventListener('vpn:auth:expired', handleExpired)
  }, [])

  const login = useCallback(async (credentials: LoginRequest) => {
    setState(s => ({ ...s, isLoading: true, error: null }))
    try {
      const data = await apiClient.post<AuthResponse>('/auth/login', credentials)
      sessionStorage.setItem('vpn_client_user', JSON.stringify(data.user))
      setState({ isAuthenticated: true, isLoading: false, user: data.user, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setState(s => ({ ...s, isLoading: false, error: msg }))
      throw err
    }
  }, [])

  const logout = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }))
    try { await apiClient.post('/auth/logout') } catch { /* ignore */ }
    sessionStorage.removeItem('vpn_client_user')
    setState({ isAuthenticated: false, isLoading: false, user: null, error: null })
  }, [])

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
