import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Vacancy } from '@/lib/types'

export interface VacancyPayload {
  title: string
  organization: string
  location: string
  description: string
  howToApply: string | null
  deadline: string | null
  isActive: boolean
}

const keys = {
  all: ['vacancies'] as const,
  open: ['vacancies', 'open'] as const,
  admin: ['vacancies', 'admin'] as const,
}

/** Open vacancies for the side rail. */
export function useOpenVacancies() {
  return useQuery({
    queryKey: keys.open,
    queryFn: async () => (await api.get<Vacancy[]>('/vacancies', { params: { count: 5 } })).data,
    staleTime: 60_000,
  })
}

export function useAdminVacancies() {
  return useQuery({
    queryKey: keys.admin,
    queryFn: async () => (await api.get<Vacancy[]>('/admin/vacancies')).data,
  })
}

export function useSaveVacancy(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VacancyPayload) =>
      (id ? await api.put<Vacancy>(`/admin/vacancies/${id}`, payload) : await api.post<Vacancy>('/admin/vacancies', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}

export function useDeleteVacancy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/vacancies/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}
