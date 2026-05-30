/**
 * useUsers — User CRUD hook
 *
 * Provides list, create, update, delete operations for the users resource.
 * All state is local to the component that calls this hook.
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import type { CreateUserRequest, UpdateUserRequest, User } from '@/api/types';
import { parseError } from '@/utils/errors';

interface UseUsersState {
  users: User[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

interface UseUsersActions {
  refresh: () => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<User>;
  updateUser: (id: number, data: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: number) => Promise<void>;
}

export function useUsers(
  skip = 0,
  limit = 20,
  search?: string,
  enabled = true
): UseUsersState & UseUsersActions {
  const [state, setState] = useState<UseUsersState>({
    users: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const fetchUsers = useCallback(async () => {
    if (!enabled) return;
    // Anti-flicker: only show loader if we have no users yet
    setState((s) => ({ ...s, isLoading: s.users.length === 0, error: null }));
    try {
      const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
      if (search) params.set('search', search);
      const data = await apiClient.get<{items: User[], total: number}>(`/users?${params.toString()}`);
      setState({ users: data.items, total: data.total, isLoading: false, error: null });
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: parseError(err) }));
    }
  }, [skip, limit, search]);

  useEffect(() => { 
    if (enabled) {
      void fetchUsers(); 
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, [fetchUsers, enabled]);

  const createUser = useCallback(async (data: CreateUserRequest): Promise<User> => {
    const user = await apiClient.post<User>('/users', data);
    await fetchUsers();
    return user;
  }, [fetchUsers]);

  const updateUser = useCallback(async (id: number, data: UpdateUserRequest): Promise<User> => {
    const user = await apiClient.put<User>(`/users/${id}`, data);
    await fetchUsers();
    return user;
  }, [fetchUsers]);

  const deleteUser = useCallback(async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
    await fetchUsers();
  }, [fetchUsers]);

  return { ...state, refresh: fetchUsers, createUser, updateUser, deleteUser };
}
