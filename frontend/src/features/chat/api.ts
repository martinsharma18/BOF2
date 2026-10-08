import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ChatSummary, PagedResult } from '@/lib/types'

export const chatKeys = {
  all: ['chats'] as const,
  list: ['chats', 'list'] as const,
  unread: ['chats', 'unread'] as const,
}

/** Conversations, most recent first. Refreshed every 30 s while the Messages page is open (and on push). */
export function useChats() {
  return useInfiniteQuery({
    queryKey: chatKeys.list,
    queryFn: async ({ pageParam }) => (await api.get<PagedResult<ChatSummary>>('/chats', { params: { page: pageParam, pageSize: 30 } })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    refetchInterval: 30_000,
  })
}

export function useChatUnreadCount(enabled = true) {
  return useQuery({
    queryKey: chatKeys.unread,
    queryFn: async () => (await api.get<{ count: number }>('/chats/unread-count')).data.count,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}

/** Marks a conversation as seen: clears its unread count right away, then tells the server. */
export function useMarkChatRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (applicationId: string) => api.post(`/chats/${applicationId}/read`),
    onMutate: (applicationId) => {
      queryClient.setQueryData<{ pages: PagedResult<ChatSummary>[]; pageParams: unknown[] }>(chatKeys.list, (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({ ...p, items: p.items.map((c) => (c.applicationId === applicationId ? { ...c, unread: 0 } : c)) })),
        },
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.unread }),
  })
}
