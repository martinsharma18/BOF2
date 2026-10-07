import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { MyVacancyApplication, PagedResult, Vacancy, VacancyApplication, VacancyApplicationStatus } from '@/lib/types'

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
  mine: (id: string) => ['vacancies', 'mine', id] as const,
  applications: (params: VacancyApplicationParams) => ['vacancies', 'applications', params] as const,
}

export interface VacancyApplicationParams {
  vacancyId?: string
  status?: VacancyApplicationStatus
  page: number
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

/** The signed-in user's application to this vacancy (null when they haven't applied). */
export function useMyVacancyApplication(vacancyId: string, enabled = true) {
  return useQuery({
    queryKey: keys.mine(vacancyId),
    queryFn: async () => {
      const response = await api.get<MyVacancyApplication | ''>(`/vacancies/${vacancyId}/applications/mine`)
      return response.status === 204 || !response.data ? null : response.data
    },
    enabled,
  })
}

/** Individual: apply with a CV (photo or PDF) and an optional note. */
export function useApplyToVacancy(vacancyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ cv, note }: { cv: File; note: string }) => {
      const form = new FormData()
      form.append('cv', cv)
      if (note.trim()) form.append('note', note.trim())
      return (await api.post<MyVacancyApplication>(`/vacancies/${vacancyId}/applications`, form)).data
    },
    onSuccess: (mine) => queryClient.setQueryData(keys.mine(vacancyId), mine),
  })
}

/** Admin: applications to vacancies, newest first. */
export function useVacancyApplications(params: VacancyApplicationParams) {
  return useQuery({
    queryKey: keys.applications(params),
    queryFn: async () =>
      (await api.get<PagedResult<VacancyApplication>>('/admin/vacancy-applications', { params: { ...params, pageSize: 20 } })).data,
  })
}

/** Admin: accept, reject, or move back to pending. The applicant is notified. */
export function useSetVacancyApplicationStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: VacancyApplicationStatus }) =>
      (await api.put<VacancyApplication>(`/admin/vacancy-applications/${id}/status`, { status })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}
