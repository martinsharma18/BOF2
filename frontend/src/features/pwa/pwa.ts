import { useSyncExternalStore } from 'react'

/** Registers /sw.js (offline cache + push). Safe to call once at start-up. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}

// ---- Install ("Add to Home Screen") -----------------------------------------------------------

/** Chrome/Edge/Samsung fire this when the site can be installed; we keep it to show our own button. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    emit()
  })
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone/iPad Safari has no install prompt; people add it from the Share menu instead. */
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const isAndroid = () => /android/i.test(navigator.userAgent)

export function useInstall() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt)
  const installed = isStandalone()
  return {
    /** Android/desktop: we can show the browser's install dialog. */
    canPrompt: !!prompt && !installed,
    /**
     * No browser prompt available: show how to add it by hand. Android Chrome only offers its prompt after
     * some use, never in some browsers, and not again after a dismissal, so Android needs steps too.
     */
    manualSteps: installed || prompt ? null : isIos() ? ('ios' as const) : isAndroid() ? ('android' as const) : null,
    installed,
    install: async () => {
      if (!prompt) return false
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      deferredPrompt = null
      emit()
      return outcome === 'accepted'
    },
  }
}

// ---- Online / offline -------------------------------------------------------------------------

function subscribeOnline(l: () => void) {
  window.addEventListener('online', l)
  window.addEventListener('offline', l)
  return () => {
    window.removeEventListener('online', l)
    window.removeEventListener('offline', l)
  }
}

export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine)

// ---- Small per-device flags ("don't show this again") ----------------------------------------

export function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* private mode: the banner simply comes back next time */
  }
}
