import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Feedback, PagedResult, Post, PostFilters, ReactionSummary, ReactionType } from '@/lib/types'

export const postKeys = {
  all: ['posts'] as const,
  lists: ['posts', 'list'] as const,
  list: (filters: PostFilters) => ['posts', 'list', filters] as const,
  detail: (id: string) => ['posts', 'detail', id] as const,
  feedback: (id: string) => ['posts', 'feedback', id] as const,
}

const PAGE_SIZE = 10

/** Drops empty filter values so query keys and URLs stay clean. */
function clean(filters: PostFilters): PostFilters {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as PostFilters
}

export function usePosts(filters: PostFilters = {}) {
  const params = clean(filters)
  return useInfiniteQuery({
    queryKey: postKeys.list(params),
    queryFn: async ({ pageParam }) =>
      (await api.get<PagedResult<Post>>('/posts', { params: { ...params, page: pageParam, pageSize: PAGE_SIZE } })).data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })
}

export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: async () => (await api.get<Post>(`/posts/${id}`)).data,
  })
}

export function useSavePost(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (form: FormData) =>
      (id ? await api.put<Post>(`/posts/${id}`, form) : await api.post<Post>('/posts', form)).data,
    onSuccess: (post) => {
      queryClient.setQueryData(postKeys.detail(post.id), post)
      return queryClient.invalidateQueries({ queryKey: postKeys.lists })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/posts/${id}`)
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: postKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: postKeys.lists })
    },
  })
}

/** Applies a change to a post everywhere it's cached (every list and its detail). */
function patchPost(queryClient: QueryClient, id: string, patch: (post: Post) => Post) {
  queryClient.setQueriesData<InfiniteData<PagedResult<Post>>>({ queryKey: postKeys.lists }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((p) => (p.id === id ? patch(p) : p)),
          })),
        }
      : data,
  )
  queryClient.setQueryData<Post>(postKeys.detail(id), (post) => post && patch(post))
}

export function useReact(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (type: ReactionType | null) =>
      type
        ? (await api.put<ReactionSummary>(`/posts/${postId}/reaction`, { type })).data
        : (await api.delete<ReactionSummary>(`/posts/${postId}/reaction`)).data,
    // Optimistic: update counts immediately, then reconcile with the server's numbers.
    onMutate: (type) =>
      patchPost(queryClient, postId, (p) => {
        const counts = { ...p.reactionCounts }
        if (p.myReaction) counts[p.myReaction] = Math.max(0, (counts[p.myReaction] ?? 1) - 1)
        if (type) counts[type] = (counts[type] ?? 0) + 1
        return { ...p, reactionCounts: counts, myReaction: type }
      }),
    onSuccess: (summary) => patchPost(queryClient, postId, (p) => ({ ...p, ...summary })),
    onError: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  })
}

export function useFeedback(postId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.feedback(postId),
    queryFn: async ({ pageParam }) =>
      (await api.get<PagedResult<Feedback>>(`/posts/${postId}/feedback`, { params: { page: pageParam, pageSize: 20 } }))
        .data,
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  })
}

export function useAddFeedback(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => (await api.post<Feedback>(`/posts/${postId}/feedback`, { content })).data,
    onSuccess: () => {
      patchPost(queryClient, postId, (p) => ({ ...p, feedbackCount: p.feedbackCount + 1 }))
      return queryClient.invalidateQueries({ queryKey: postKeys.feedback(postId) })
    },
  })
}

export function useDeleteFeedback(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (feedbackId: string) => {
      await api.delete(`/posts/feedback/${feedbackId}`)
    },
    onSuccess: () => {
      patchPost(queryClient, postId, (p) => ({ ...p, feedbackCount: Math.max(0, p.feedbackCount - 1) }))
      return queryClient.invalidateQueries({ queryKey: postKeys.feedback(postId) })
    },
  })
}
