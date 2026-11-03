import { useQuery } from '@tanstack/react-query';
import api from '../api';

export const queryKeys = {
  categories: ['categories'],
  batches: ['batches'],
  poolStatus: ['pool-status'],
};

// Categories almost never change, so they stay fresh for an hour.
export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.get('categories/')).data,
    staleTime: 60 * 60 * 1000,
  });

export const useBatches = (options = {}) =>
  useQuery({
    queryKey: queryKeys.batches,
    queryFn: async () => {
      const { data } = await api.get('pools/my-batches/');
      return Array.isArray(data) ? data : [];
    },
    ...options,
  });

// Live data: always refetched when a component mounts.
export const usePoolStatus = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.poolStatus,
    queryFn: async () => (await api.get('pools/status/')).data,
    staleTime: 0,
    enabled,
  });
