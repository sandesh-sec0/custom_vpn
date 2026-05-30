/**
 * useSessions — Session management hook
 *
 * Provides listing, filtering, and termination of VPN sessions.
 * Supports auto-refresh for live monitoring.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { Session } from '@/api/types';
import { parseError } from '@/utils/errors';

interface SessionFilters {
  skip?: number;
  limit?: number;
  userId?: number;
  activeOnly?: boolean;
  autoRefreshMs?: number; // Set to enable auto-refresh (e.g. 5000 for 5s)
  enabled?: boolean; // Set to false to prevent initial fetch and auto-refresh
}

interface UseSessionsState {
  sessions: Session[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

interface UseSessionsActions {
  refresh: () => Promise<void>;
  terminateSession: (id: number) => Promise<void>;
}

export function useSessions(filters: SessionFilters = {}): UseSessionsState & UseSessionsActions {
  const { skip = 0, limit = 20, userId, activeOnly, autoRefreshMs, enabled = true } = filters;

  const [state, setState] = useState<UseSessionsState>({
    sessions: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const fetchSessions = useCallback(async () => {
    if (!enabled) return;
    // Anti-flicker: only set isLoading: true if we don't have sessions data yet
    setState((s) => ({ ...s, isLoading: s.sessions.length === 0, error: null }));
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
      if (userId !== undefined) params.set('user_id', String(userId));
      if (activeOnly) params.set('active_only', 'true');
      const data = await apiClient.get<{ items: Session[]; total: number }>(
        `/sessions?${params.toString()}`
      );
      setState({ sessions: data.items, total: data.total, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: parseError(err) }));
    }
  }, [skip, limit, userId, activeOnly, enabled]);

  useEffect(() => { 
    if (enabled) {
      void fetchSessions(); 
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [fetchSessions, enabled]);

  // Auto-refresh interval
  useEffect(() => {
    if (!enabled || !autoRefreshMs || autoRefreshMs < 1000) return;
    const interval = setInterval(() => {
      void fetchSessions();
    }, autoRefreshMs);
    return () => clearInterval(interval);
  }, [autoRefreshMs, fetchSessions]);

  const terminateSession = useCallback(async (id: number): Promise<void> => {
    await apiClient.delete(`/sessions/${id}`);
    await fetchSessions();
  }, [fetchSessions]);

  return { ...state, refresh: fetchSessions, terminateSession };
}
