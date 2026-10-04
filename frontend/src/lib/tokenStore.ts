import type { AuthResponse, User } from './types'

const KEY = 'bof2.session'

export interface Session {
  accessToken: string
  refreshToken: string
  user: User
}

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

let session: Session | null = read()
const listeners = new Set<(s: Session | null) => void>()

export const tokenStore = {
  get: () => session,

  set(auth: AuthResponse) {
    session = { accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user }
    try {
      localStorage.setItem(KEY, JSON.stringify(session))
    } catch {
      // Storage unavailable (private mode); the session still lives in memory.
    }
    listeners.forEach((l) => l(session))
  },

  /** Refreshes the cached user (e.g. after a profile or avatar change). */
  updateUser(user: User) {
    if (!session) return
    session = { ...session, user }
    try {
      localStorage.setItem(KEY, JSON.stringify(session))
    } catch {
      // ignore
    }
    listeners.forEach((l) => l(session))
  },

  clear() {
    session = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    listeners.forEach((l) => l(null))
  },

  subscribe(listener: (s: Session | null) => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
