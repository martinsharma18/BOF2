import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, CalendarClock, ChevronRight, MapPin } from 'lucide-react'
import { Card, Dialog } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/cn'
import { formatDay } from '@/lib/format'
import type { Vacancy } from '@/lib/types'
import { useOpenVacancies } from './api'

/** Compact list of the super admin's vacancies. Tap one to read the details. Hidden when there are none. */
export function VacancyList({ className }: { className?: string }) {
  const { isAdmin } = useAuth()
  const vacancies = useOpenVacancies()
  const [open, setOpen] = useState<Vacancy | null>(null)
  const items = vacancies.data ?? []

  if (!items.length && !isAdmin) return null

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Briefcase className="size-4 text-accent-500" /> Vacancies
        </h2>
        {isAdmin && (
          <Link to="/admin/vacancies" className="text-xs font-semibold text-brand-600 hover:underline">
            Manage
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-3.5 text-xs text-slate-500">No open vacancies. Post one from the admin dashboard.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {items.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setOpen(v)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition hover:bg-slate-50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900">{v.title}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {v.organization} · {v.location}
                    {v.deadline && ` · by ${formatDay(v.deadline)}`}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ''} description={open?.organization}>
        {open && (
          <div className="space-y-4 text-sm">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {open.location}
              </li>
              {open.deadline && (
                <li className="flex items-center gap-1.5">
                  <CalendarClock className="size-4" /> Apply by {formatDay(open.deadline)}
                </li>
              )}
            </ul>
            <p className="whitespace-pre-line text-slate-700">{open.description}</p>
            {open.howToApply && (
              <div className="rounded-xl bg-brand-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">How to apply</p>
                <HowToApply text={open.howToApply} />
              </div>
            )}
          </div>
        )}
      </Dialog>
    </Card>
  )
}

/** Renders the text, turning a web link into a clickable link. */
function HowToApply({ text }: { text: string }) {
  const isLink = /^https?:\/\//i.test(text.trim())
  return isLink ? (
    <a href={text.trim()} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-semibold break-all text-brand-700 hover:underline">
      {text}
    </a>
  ) : (
    <p className="mt-0.5 font-medium whitespace-pre-line text-slate-900">{text}</p>
  )
}
