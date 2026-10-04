import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { unlinkPush } from '@/features/pwa/push'
import { api } from '@/lib/api'
import { tokenStore, type Session } from '@/lib/tokenStore'
import type { AuthResponse, User } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  isAdmin: boolean
  canPost: boolean
  signIn: (auth: AuthResponse) => void
  updateUser: (user: User) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(tokenStore.get())
  const queryClient = useQueryClient()

  useEffect(() => tokenStore.subscribe(setSession), [])

  const signIn = useCallback((auth: AuthResponse) => tokenStore.set(auth), [])
  const updateUser = useCallback((user: User) => tokenStore.updateUser(user), [])

  const signOut = useCallback(async () => {
    const refreshToken = tokenStore.get()?.refreshToken
    // Still signed in here, so the API knows whose device to unlink.
    if (refreshToken) await unlinkPush()
    tokenStore.clear()
    queryClient.clear()
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => undefined)
  }, [queryClient])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null
    return {
      user,
      isAdmin: user?.accountType === 'Admin',
      canPost: user?.accountType === 'Company',
      signIn,
      updateUser,
      signOut,
    }
  }, [session, signIn, updateUser, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
