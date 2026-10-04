import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui'
import { AuthProvider } from '@/features/auth/AuthContext'
import { PwaBridge } from '@/features/pwa/PwaUi'
import { AppRoutes } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors (404, 403…); retry flaky network/server errors once.
      retry: (count, error) => count < 1 && !(error instanceof AxiosError && (error.response?.status ?? 500) < 500),
    },
  },
})

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <PwaBridge />
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
