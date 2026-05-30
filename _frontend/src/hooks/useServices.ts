import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import type {
  Service,
  ServiceCreateRequest,
  UserPermission,
  UserPermissionCreateRequest,
  PermissionDetail,
  ConfigResponse,
} from '@/api/types';
import { useAuth } from './useAuth';

interface UseServicesOptions {
  autoLoad?: boolean;
  skip?: number;
  limit?: number;
  name?: string;
}

export function useServices({ autoLoad = true, skip = 0, limit = 50, name }: UseServicesOptions = {}) {
  const { user } = useAuth();
  const lastFetchedUserRef = useRef<number | null | 'none'>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [total, setTotal] = useState(0);
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [permissions, setPermissions] = useState<Record<number, PermissionDetail[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!user) return;
    // Anti-flicker: only set isLoading: true if we don't have data yet
    setIsLoading(services.length === 0 && myServices.length === 0);
    setError(null);
    try {
      if (user?.is_admin) {
        const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
        if (name) params.set('name', name);
        const data = await apiClient.get<{ items: Service[]; total: number }>(`/services?${params.toString()}`);
        setServices(data.items);
        setTotal(data.total);
      }
      // my-services remains as is (usually a small list for non-admins)
      const myData = await apiClient.get<Service[]>('/services/my-services');
      setMyServices(myData);
    } catch (err: any) {
      setError(err.detail || 'Failed to fetch services');
    } finally {
      setIsLoading(false);
    }
  }, [user, skip, limit, name, services.length, myServices.length]);

  useEffect(() => {
    const userId = user?.id ?? 'none';
    if (autoLoad && user) {
      void fetchServices();
    }
  }, [autoLoad, fetchServices, user]);

  const fetchServicePermissions = useCallback(async (serviceId: number) => {
    try {
      const data = await apiClient.get<PermissionDetail[]>(
        `/services/${serviceId}/permissions`
      );
      setPermissions((prev) => ({ ...prev, [serviceId]: data }));
      return data;
    } catch (err: any) {
      console.error('Failed to fetch permissions:', err);
      return [];
    }
  }, []);

  const createService = async (data: ServiceCreateRequest) => {
    const newService = await apiClient.post<Service>('/services', data);
    setServices((prev) => [newService, ...prev]);
    return newService;
  };

  const deleteService = async (serviceId: number) => {
    await apiClient.delete(`/services/${serviceId}`);
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    setPermissions((prev) => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  };

  const assignPermission = async (data: UserPermissionCreateRequest) => {
    const perm = await apiClient.post<UserPermission>('/services/permissions', data);
    // Refresh permissions for the affected service
    await fetchServicePermissions(data.service_id);
    return perm;
  };

  const revokePermission = async (permId: number, serviceId: number) => {
    await apiClient.delete(`/services/permissions/${permId}`);
    // Refresh permissions for the affected service
    await fetchServicePermissions(serviceId);
  };

  const downloadConfig = async (serviceId: number, serviceName: string) => {
    try {
      const configText = await apiClient.get<ConfigResponse>(`/services/${serviceId}/config`);
      const blob = new Blob([JSON.stringify(configText, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = serviceName.toLowerCase().replace(/\s+/g, '_');
      link.download = `${safeName}_config.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      throw new Error(err.detail || 'Failed to download configuration');
    }
  };

  return {
    services,
    total,
    myServices,
    permissions,
    isLoading,
    error,
    fetchServices,
    fetchServicePermissions,
    createService,
    deleteService,
    assignPermission,
    revokePermission,
    downloadConfig,
  };
}
