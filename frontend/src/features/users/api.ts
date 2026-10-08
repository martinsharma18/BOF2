import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import type { AuthResponse, Gender, MyProfile, PublicProfile } from '@/lib/types'

export const userKeys = {
  me: ['users', 'me'] as const,
  profile: (id: string) => ['users', id] as const,
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: userKeys.profile(id),
    queryFn: async () => (await api.get<PublicProfile>(`/users/${id}`)).data,
  })
}

export function useMyProfile() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: async () => (await api.get<MyProfile>('/users/me')).data,
  })
}

export interface UpdateProfilePayload {
  fullName: string
  companyName: string | null
  gender: Gender | null
  /** YYYY-MM-DD */
  dateOfBirth: string | null
  phoneNumber: string
  additionalPhoneNumber: string | null
  socialMediaLink: string | null
  province: string | null
  district: string | null
  localLevel: string | null
  bio: string | null
}

/** Keeps every cached copy of "me" (profile queries and the session user) in sync. */
function useSyncMe() {
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuth()
  return (me: MyProfile) => {
    queryClient.setQueryData(userKeys.me, me)
    queryClient.setQueryData(userKeys.profile(me.profile.id), me.profile)
    if (user)
      updateUser({
        ...user,
        fullName: me.profile.fullName,
        companyName: me.profile.companyName,
        avatarUrl: me.profile.avatarUrl,
      })
    // Author names/avatars appear on posts and feedback.
    void queryClient.invalidateQueries({ queryKey: ['posts'] })
  }
}

export function useUpdateProfile() {
  const sync = useSyncMe()
  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => (await api.put<MyProfile>('/users/me', payload)).data,
    onSuccess: sync,
  })
}

export function useUpdatePhone() {
  const sync = useSyncMe()
  return useMutation({
    mutationFn: async (payload: { phoneNumber: string; additionalPhoneNumber: string | null }) =>
      (await api.put<MyProfile>('/users/me/phone', payload)).data,
    onSuccess: sync,
  })
}

export function useAvatar() {
  const sync = useSyncMe()
  return useMutation({
    mutationFn: async (file: File | null) => {
      if (!file) return (await api.delete<MyProfile>('/users/me/avatar')).data
      const form = new FormData()
      form.append('avatar', file)
      return (await api.put<MyProfile>('/users/me/avatar', form)).data
    },
    onSuccess: sync,
  })
}

export function useChangePassword() {
  const { signIn } = useAuth()
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
      (await api.post<AuthResponse>('/auth/change-password', payload)).data,
    onSuccess: signIn,
  })
}
