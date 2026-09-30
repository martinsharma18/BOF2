import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Logo } from './Logo'
import { currentYear } from '@/lib/format'
import { APP_NAME } from '@/lib/brand'

const points = [
  'Companies post opportunities with photo, pay and area',
  'Reach people in all 7 provinces and 77 districts',
  'Apply or claim in one tap, chat and get paid',
]

/** Split-screen layout for login and registration. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-brand-950 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-96 rounded-full bg-brand-600/40 blur-3xl"
        />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-96 rounded-full bg-accent-500/25 blur-3xl" />
        <Logo light className="relative" />
        <div className="relative">
          <h2 className="font-display text-4xl leading-tight font-extrabold text-white">
            The place where Nepal
            <br />
            finds work and <span className="text-accent-400">hires people.</span>
          </h2>
          <ul className="mt-8 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-brand-100">
                <CheckCircle2 className="size-5 text-accent-400" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-300">© {currentYear} {APP_NAME}</p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-lg animate-fade-in">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
