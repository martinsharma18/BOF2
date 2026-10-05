import type { ReactNode } from 'react'
import { BadgeCheck, Briefcase, MapPin, MessageCircle, Zap } from 'lucide-react'
import { Logo } from './Logo'
import { currentYear } from '@/lib/format'
import { APP_NAME } from '@/lib/brand'
import { cn } from '@/lib/cn'

const points = [
  { icon: Briefcase, title: 'Real opportunities', text: 'Companies post with photo, pay and area' },
  { icon: MapPin, title: 'Nationwide reach', text: 'All 7 provinces and 77 districts' },
  { icon: MessageCircle, title: 'One-tap apply', text: 'Apply or claim, chat and get paid' },
]

const stats = [
  { value: '7', label: 'Provinces' },
  { value: '77', label: 'Districts' },
  { value: '1 tap', label: 'To apply' },
]

/** Faint grid lines over the brand gradient. */
function GridPattern() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
      style={{
        backgroundImage:
          'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
        backgroundSize: '44px 44px',
      }}
    />
  )
}

/** Split-screen layout for login and registration; a hero header with a form sheet on phones. */
export function AuthLayout({
  title,
  subtitle,
  wide,
  children,
}: {
  title: string
  subtitle?: ReactNode
  /** Wider form column for long forms such as registration. */
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-dvh bg-slate-50 lg:bg-white">
      {/* Desktop brand panel */}
      <aside className="sticky top-0 hidden h-dvh w-[46%] max-w-2xl shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-900 to-brand-950 p-12 text-white lg:flex xl:p-14">
        <GridPattern />
        <div aria-hidden className="absolute -top-40 -right-40 size-[28rem] rounded-full bg-brand-400/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-48 -left-24 size-[26rem] rounded-full bg-accent-500/25 blur-3xl" />

        <Logo light className="relative self-start shadow-lg shadow-black/10" />

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-100 ring-1 ring-white/15 backdrop-blur">
            <Zap className="size-3.5 text-accent-400" /> Nepal's work marketplace
          </span>
          <h2 className="mt-6 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-white xl:text-5xl">
            The place where Nepal finds work and{' '}
            <span className="bg-gradient-to-r from-accent-300 to-accent-500 bg-clip-text text-transparent">hires people.</span>
          </h2>

          <ul className="mt-10 space-y-3">
            {points.map(({ icon: Icon, title: t, text }) => (
              <li
                key={t}
                className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10 backdrop-blur-sm transition hover:bg-white/10"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-500/15 text-accent-400 ring-1 ring-accent-400/20">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{t}</span>
                  <span className="block text-sm text-brand-200">{text}</span>
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-10 grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-black/15 py-4 ring-1 ring-white/10">
            {stats.map((s) => (
              <div key={s.label} className="px-4 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-2xl font-extrabold text-white">{s.value}</dd>
                <dd className="mt-0.5 text-xs font-medium tracking-wide text-brand-300 uppercase">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-brand-300">
          <BadgeCheck className="size-4" /> © {currentYear} {APP_NAME}.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile hero header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-800 to-brand-950 px-5 pt-6 pb-16 text-white lg:hidden">
          <GridPattern />
          <div aria-hidden className="absolute -top-24 -right-16 size-64 rounded-full bg-brand-400/30 blur-3xl" />
          <div aria-hidden className="absolute -bottom-24 -left-16 size-56 rounded-full bg-accent-500/25 blur-3xl" />
          <Logo light className="relative shadow-md shadow-black/10" />
          <p className="relative mt-6 max-w-xs font-display text-2xl leading-snug font-extrabold tracking-tight">
            Find work and <span className="text-accent-400">hire people</span> across Nepal.
          </p>
        </header>

        <main className="relative -mt-8 flex flex-1 flex-col rounded-t-3xl bg-white px-5 pt-8 pb-10 shadow-[0_-8px_24px_-12px_rgb(15_23_42/0.25)] sm:px-8 lg:mt-0 lg:items-center lg:justify-center lg:rounded-none lg:px-12 lg:py-12 lg:shadow-none">
          <div className={cn('mx-auto w-full animate-slide-up', wide ? 'max-w-2xl' : 'max-w-md')}>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-[15px] text-slate-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
