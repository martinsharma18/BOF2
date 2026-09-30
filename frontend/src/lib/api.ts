import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokenStore'
import type { AuthResponse, ProblemDetails } from './types'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()?.accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Share one in-flight refresh between concurrent 401s.
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.get()?.refreshToken
  if (!refreshToken) return null
  try {
    const { data } = await axios.post<AuthResponse>('/api/auth/refresh', { refreshToken })
    tokenStore.set(data)
    return data.accessToken
  } catch {
    tokenStore.clear()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthCall = original?.url?.startsWith('/auth/')

    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      const token = await refreshing
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)

/** Extracts the RFC 7807 problem body from an API error, if any. */
export function getProblem(error: unknown): ProblemDetails | null {
  if (error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object') {
    return error.response.data as ProblemDetails
  }
  return null
}

export function getErrorMessage(error: unknown): string {
  const problem = getProblem(error)
  if (problem?.title) return problem.title
  if (error instanceof AxiosError && !error.response) return 'Cannot reach the server. Please try again.'
  return 'Something went wrong. Please try again.'
}
