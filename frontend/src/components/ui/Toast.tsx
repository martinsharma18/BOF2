import { useSyncExternalStore } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error'
}

let toasts: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function push(message: string, tone: ToastItem['tone']) {
  const id = nextId++
  toasts = [...toasts, { id, message, tone }].slice(-4)
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, 3500)
}

/** Fire-and-forget notifications: toast.success('Saved'). */
export const toast = {
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'error'),
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex animate-slide-up items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-pop',
          )}
        >
          {t.tone === 'success' ? (
            <CheckCircle2 className="size-4 text-emerald-400" aria-hidden />
          ) : (
            <XCircle className="size-4 text-red-400" aria-hidden />
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
