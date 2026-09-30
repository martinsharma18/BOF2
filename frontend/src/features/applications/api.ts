import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { postKeys } from '@/features/posts/api'
import { walletKeys } from '@/features/wallet/api'
import { api } from '@/lib/api'
import type { Application, ApplicationKind, ApplicationMessage, ApplicationStatus, PagedResult } from '@/lib/types'

export const applicationKeys = {
  all: ['applications'] as const,
  list: (params: object) => ['applications', 'list', params] as const,
  detail: (id: string) => ['applications', 'detail', id] as const,
  messages: (id: string) => ['applications', 'messages', id] as const,
}

export interface ApplicationParams {
  postId?: string
  status?: ApplicationStatus
  page: number
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

export function useApplication(id: string | null) {
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

/** Replaces an application in every cached list and its detail. */
function useSyncApplication() {
  const queryClient = useQueryClient()
  return (updated: Application) => {
    queryClient.setQueryData(applicationKeys.detail(updated.id), updated)
    queryClient.setQueriesData<PagedResult<Application>>({ queryKey: ['applications', 'list'] }, (data) =>
      data ? { ...data, items: data.items.map((a) => (a.id === updated.id ? updated : a)) } : data,
    )
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
    mutationFn: async ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
      (await api.post<Application>(`/applications/${id}/claim`, { amount, note })).data,
    onSuccess: (application) => {
      sync(application)
      return queryClient.invalidateQueries({ queryKey: postKeys.all })
    },
  })
}

export function usePayApplicant() {
  const sync = useSyncApplication()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
      (await api.post<Application>(`/applications/${id}/payments`, { amount, note })).data,
    onSuccess: (application) => {
      sync(application)
      return queryClient.invalidateQueries({ queryKey: walletKeys.all })
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
    },
  })
}
