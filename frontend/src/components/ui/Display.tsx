import type { ReactNode } from 'react'
import { AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70', className)}>{children}</div>
}

type BadgeTone = 'brand' | 'slate' | 'green' | 'amber' | 'red'

const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
}

export function Badge({ children, tone = 'slate', className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const avatarSizes = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
} as const

// Stable pleasant background per name so initials avatars are distinguishable.
const avatarColors = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-accent-100 text-accent-800',
]

function colorFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof avatarSizes
  className?: string
}) {
  const base = cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold', avatarSizes[size], className)
  if (src) return <img src={src} alt="" className={cn(base, 'bg-slate-100 object-cover')} />
  return (
    <span className={cn(base, colorFor(name))} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function Alert({
  children,
  tone = 'error',
  className,
}: {
  children: ReactNode
  tone?: 'error' | 'info'
  className?: string
}) {
  const Icon = tone === 'error' ? AlertCircle : Info
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2.5 rounded-xl px-4 py-3 text-sm',
        tone === 'error' ? 'bg-red-50 text-red-800 ring-1 ring-red-200' : 'bg-brand-50 text-brand-900 ring-1 ring-brand-200',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon && (
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      )}
      <p className="font-display text-lg font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
