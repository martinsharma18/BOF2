import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Gender, Invitation } from '@/lib/types'

export interface InvitationAudience {
  province?: string
  district?: string
  localLevel?: string
  gender?: Gender
  minAge?: number
  maxAge?: number
}

export interface SendInvitationPayload extends InvitationAudience {
  title: string
  message: string
  postId?: string
}

const keys = {
  mine: ['invitations', 'mine'] as const,
  audience: (a: InvitationAudience) => ['invitations', 'audience', a] as const,
}

export function useMyInvitations() {
  return useQuery({
    queryKey: keys.mine,
    queryFn: async () => (await api.get<Invitation[]>('/invitations')).data,
  })
}

/** How many individuals the filters reach. */
export function useAudienceCount(audience: InvitationAudience, enabled: boolean) {
  return useQuery({
    queryKey: keys.audience(audience),
    queryFn: async () => (await api.get<{ count: number }>('/invitations/audience', { params: audience })).data.count,
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useSendInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SendInvitationPayload) => (await api.post<Invitation>('/invitations', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invitations'] }),
  })
}
