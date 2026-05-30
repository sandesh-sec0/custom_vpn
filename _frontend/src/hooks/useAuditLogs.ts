import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { AuditLog, PaginatedResponse } from '@/api/types';
import { parseError } from '@/utils/errors';

interface UseAuditLogsState {
  logs: AuditLog[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

interface UseAuditLogsOptions {
  skip?: number;
  limit?: number;
  action?: string;
}

export function useAuditLogs({ skip = 0, limit = 50, action }: UseAuditLogsOptions = {}) {
  const [state, setState] = useState<UseAuditLogsState>({
    logs: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const fetchLogs = useCallback(async () => {
    // Anti-flicker: only set isLoading: true if we don't have data yet
    setState((s) => ({ ...s, isLoading: s.logs.length === 0, error: null }));
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
      if (action) params.set('action', action);
      const data = await apiClient.get<PaginatedResponse<AuditLog>>(`/audit-logs?${params.toString()}`);
      setState({ logs: data.items, total: data.total, isLoading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, isLoading: false, error: parseError(err) }));
    }
  }, [skip, limit, action]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  return { ...state, refresh: fetchLogs };
}
