import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InboxItem, InboxItemKind, PagedResult } from '@/lib/types'

export const inboxKeys = {
  all: ['inbox'] as const,
  list: (kind?: InboxItemKind) => ['inbox', 'list', kind ?? 'all'] as const,
  unread: ['inbox', 'unread'] as const,
}

/** Polled for the sidebar badge, like the notification bell. */
export function useInboxUnreadCount(enabled = true) {
  return useQuery({
    queryKey: inboxKeys.unread,
    queryFn: async () => (await api.get<{ count: number }>('/inbox/unread-count')).data.count,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled,
  })
}

export function useInbox(kind?: InboxItemKind) {
  return useInfiniteQuery({
    queryKey: inboxKeys.list(kind),
    queryFn: async ({ pageParam }) =>
      (await api.get<PagedResult<InboxItem>>('/inbox', { params: { kind, page: pageParam, pageSize: 20 } })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })
}

type Pages = InfiniteData<PagedResult<InboxItem>>

/** Applies a change to every cached inbox list (All / Invitations / Vacancies). */
function useEditLists() {
  const queryClient = useQueryClient()
  return (edit: (items: InboxItem[]) => InboxItem[]) =>
    queryClient.setQueriesData<Pages>({ queryKey: ['inbox', 'list'] }, (data) =>
      data ? { ...data, pages: data.pages.map((p) => ({ ...p, items: edit(p.items) })) } : data,
    )
}

export function useMarkInboxRead() {
  const queryClient = useQueryClient()
  const edit = useEditLists()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/inbox/${id}/read`)
    },
    onMutate: (id) => edit((items) => items.map((i) => (i.id === id ? { ...i, isRead: true } : i))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: inboxKeys.unread }),
  })
}

export function useMarkAllInboxRead() {
  const queryClient = useQueryClient()
  const edit = useEditLists()
  return useMutation({
    mutationFn: async () => {
      await api.put('/inbox/read-all')
    },
    onSuccess: () => {
      edit((items) => items.map((i) => ({ ...i, isRead: true })))
      queryClient.setQueryData(inboxKeys.unread, 0)
    },
  })
}

export function useDeleteInboxItem() {
  const queryClient = useQueryClient()
  const edit = useEditLists()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inbox/${id}`)
    },
    onSuccess: (_, id) => {
      edit((items) => items.filter((i) => i.id !== id))
      return queryClient.invalidateQueries({ queryKey: inboxKeys.unread })
    },
  })
}
