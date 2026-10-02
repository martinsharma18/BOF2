import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AppNotification, PagedResult } from '@/lib/types'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  listOf: (unreadOnly: boolean, pageSize: number) => ['notifications', 'list', { unreadOnly, pageSize }] as const,
  unread: ['notifications', 'unread'] as const,
}

/** Polled by the header bell; a tiny COUNT query on the server. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data.count,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useNotifications({ unreadOnly = false, pageSize = 20 }: { unreadOnly?: boolean; pageSize?: number } = {}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.listOf(unreadOnly, pageSize),
    queryFn: async ({ pageParam }) =>
      (await api.get<PagedResult<AppNotification>>('/notifications', { params: { page: pageParam, pageSize, unreadOnly } })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/notifications/${id}/read`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}
