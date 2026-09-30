import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AccountType, Ad, AdminStats, AdminUser, PagedResult } from '@/lib/types'

export const adminKeys = {
  stats: ['admin', 'stats'] as const,
  users: (params: object) => ['admin', 'users', params] as const,
  ads: ['admin', 'ads'] as const,
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: async () => (await api.get<AdminStats>('/admin/stats')).data,
  })
}

export interface AdminUserParams {
  search?: string
  accountType?: AccountType
  page: number
}

export function useAdminUsers(params: AdminUserParams) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: async () =>
      (await api.get<PagedResult<AdminUser>>('/admin/users', { params: { ...params, pageSize: 20 } })).data,
    placeholderData: keepPreviousData,
  })
}

export function useSetUserDisabled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
      await api.put(`/admin/users/${id}/status`, { disabled })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminAds() {
  return useQuery({
    queryKey: adminKeys.ads,
    queryFn: async () => (await api.get<Ad[]>('/admin/ads')).data,
  })
}

export function useSaveAd(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (form: FormData) =>
      (id ? await api.put<Ad>(`/admin/ads/${id}`, form) : await api.post<Ad>('/admin/ads', form)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ads'] })
      void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
      return queryClient.invalidateQueries({ queryKey: adminKeys.ads })
    },
  })
}

export function useDeleteAd() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/ads/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ads'] })
      return queryClient.invalidateQueries({ queryKey: adminKeys.ads })
    },
  })
}
