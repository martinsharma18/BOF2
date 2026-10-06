import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { chatKeys } from '@/features/chat/api'
import { postKeys } from '@/features/posts/api'
import { walletKeys } from '@/features/wallet/api'
import { api } from '@/lib/api'
import type { Application, ApplicationKind, ApplicationMessage, ApplicationPost, ApplicationStatus, PagedResult, PostType } from '@/lib/types'
import type { ApplicationStage } from './labels'

export const applicationKeys = {
  all: ['applications'] as const,
  list: (params: object) => ['applications', 'list', params] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
  summary: (postId?: string) => ['applications', 'summary', postId ?? 'all'] as const,
  messages: (id: string) => ['applications', 'messages', id] as const,
  posts: ['applications', 'posts'] as const,
}

export interface ApplicationParams {
  postId?: string
  status?: ApplicationStatus
  stage?: ApplicationStage
  postType?: PostType
  page: number
}

export interface ApplicationSummary {
  all: number
  new: number
  hired: number
  claimed: number
  paid: number
  declined: number
}

/** Counts per stage, for the tabs and the "needs your action" banner. */
export function useApplicationSummary(postId?: string) {
  return useQuery({
    queryKey: applicationKeys.summary(postId),
    queryFn: async () => (await api.get<ApplicationSummary>('/applications/summary', { params: { postId } })).data,
  })
}

/** Company: received applications. Individual: sent applications. The server decides by account. */
export function useApplications(params: ApplicationParams) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: async () =>
      (await api.get<PagedResult<Application>>('/applications', { params: { ...params, pageSize: 20 } })).data,
    placeholderData: keepPreviousData,
  })
}

/** Company: its posts that have applications, with counts (the "Your posts" strip). */
export function useApplicationPosts(enabled: boolean) {
  return useQuery({
    queryKey: applicationKeys.posts,
    queryFn: async () => (await api.get<ApplicationPost[]>('/applications/posts')).data,
    enabled,
  })
}

export function useApplication(id: string | null | undefined) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? ''),
    queryFn: async () => (await api.get<Application>(`/applications/${id}`)).data,
    enabled: !!id,
  })
}

export function useApply(postId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { kind: ApplicationKind; message?: string }) =>
      (await api.post<Application>(`/posts/${postId}/applications`, payload)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all })
      return queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}

/**
 * Replaces an application in every cached list and its detail right away, then refreshes the
 * stage counts and lists (the job may have moved to another tab).
 */
function useSyncApplication() {
  const queryClient = useQueryClient()
  return (updated: Application) => {
    queryClient.setQueryData(applicationKeys.detail(updated.id), updated)
    queryClient.setQueriesData<PagedResult<Application>>({ queryKey: ['applications', 'list'] }, (data) =>
      data ? { ...data, items: data.items.map((a) => (a.id === updated.id ? updated : a)) } : data,
    )
    void queryClient.invalidateQueries({ queryKey: ['applications', 'summary'] })
    void queryClient.invalidateQueries({ queryKey: ['applications', 'list'] })
  }
}

export function useSetApplicationStatus() {
  const sync = useSyncApplication()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) =>
      (await api.put<Application>(`/applications/${id}/status`, { status })).data,
    onSuccess: sync,
  })
}

export function useClaimPayment() {
  const sync = useSyncApplication()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount, note, proof }: { id: string; amount: number; note?: string; proof?: File | null }) => {
      const form = new FormData()
      form.append('amount', String(amount))
      if (note) form.append('note', note)
      if (proof) form.append('proof', proof)
      return (await api.post<Application>(`/applications/${id}/claim`, form)).data
    },
    onSuccess: (application) => {
      sync(application)
      return queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}

/** The company pays exactly the claimed amount; the job closes. */
export function usePayApplicant() {
  const sync = useSyncApplication()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) =>
      (await api.post<Application>(`/applications/${id}/payments`, { note })).data,
    onSuccess: (application) => {
      sync(application)
      return queryClient.invalidateQueries({ queryKey: walletKeys.all })
    },
  })
}

/** The company turns down a claim with a reason; the applicant can claim again. */
export function useDeclineClaim() {
  const sync = useSyncApplication()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post<Application>(`/applications/${id}/claim/decline`, { reason })).data,
    onSuccess: (application) => {
      sync(application)
      return queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}

export function useApplicationMessages(id: string, enabled = true) {
  return useQuery({
    queryKey: applicationKeys.messages(id),
    queryFn: async () => (await api.get<ApplicationMessage[]>(`/applications/${id}/messages`)).data,
    enabled,
    // Light polling keeps an open conversation fresh without websockets.
    refetchInterval: enabled ? 15_000 : false,
  })
}

export function useSendMessage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) =>
      (await api.post<ApplicationMessage>(`/applications/${id}/messages`, { content })).data,
    onSuccess: (message) => {
      queryClient.setQueryData<ApplicationMessage[]>(applicationKeys.messages(id), (list) => [...(list ?? []), message])
      queryClient.setQueriesData<PagedResult<Application>>({ queryKey: ['applications', 'list'] }, (data) =>
        data
          ? { ...data, items: data.items.map((a) => (a.id === id ? { ...a, messageCount: a.messageCount + 1 } : a)) }
          : data,
      )
      // The conversation jumps to the top of Messages with this as its last line.
      void queryClient.invalidateQueries({ queryKey: chatKeys.list })
    },
  })
}
