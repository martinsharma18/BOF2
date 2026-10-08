import { useState } from 'react'
import { Check, FileText, Mail, Phone, RotateCcw, X } from 'lucide-react'
import { Alert, Avatar, Badge, Button, Dialog, EmptyState, Spinner, toast } from '@/components/ui'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { timeAgo } from '@/lib/format'
import type { Vacancy, VacancyApplication, VacancyApplicationStatus } from '@/lib/types'
import { useSetVacancyApplicationStatus, useVacancyApplications } from './api'

const tabs: { status?: VacancyApplicationStatus; label: string }[] = [
  { label: 'All' },
  { status: 'Pending', label: 'New' },
  { status: 'Accepted', label: 'Accepted' },
  { status: 'Rejected', label: 'Rejected' },
]

const statusBadge: Record<VacancyApplicationStatus, { label: string; tone: 'amber' | 'green' | 'red' }> = {
  Pending: { label: 'New', tone: 'amber' },
  Accepted: { label: 'Accepted', tone: 'green' },
  Rejected: { label: 'Rejected', tone: 'red' },
}

export function VacancyApplicationsDialog({ vacancy, onClose }: { vacancy: Vacancy; onClose: () => void }) {
  const [status, setStatus] = useState<VacancyApplicationStatus>()
  const [page, setPage] = useState(1)
  const list = useVacancyApplications({ vacancyId: vacancy.id, status, page })
  const data = list.data

  return (
    <Dialog open onClose={onClose} size="lg" tall title="Applications" description={`${vacancy.title} · ${vacancy.organization}`}>
      <div role="tablist" aria-label="Filter applications" className="scrollbar-none -mx-1 mb-3 flex gap-1 overflow-x-auto px-1">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={status === t.status}
            onClick={() => {
              setStatus(t.status)
              setPage(1)
            }}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition',
              status === t.status ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.isError ? (
        <Alert>{getErrorMessage(list.error)}</Alert>
      ) : !data ? (
        <div className="flex justify-center py-10 text-brand-500">
          <Spinner />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState icon={<FileText className="size-6" />} title="No applications here" description="When people apply with their CV, they show up here." />
      ) : (
        <ul className="space-y-3">
          {data.items.map((a) => (
            <ApplicationRow key={a.id} application={a} />
          ))}
        </ul>
      )}

      {data && data.totalCount > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} · {data.totalCount} applications
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function ApplicationRow({ application: a }: { application: VacancyApplication }) {
  const setStatus = useSetVacancyApplicationStatus()
  const badge = statusBadge[a.status]

  const change = (to: VacancyApplicationStatus) =>
    setStatus.mutate(
      { id: a.id, status: to },
      {
        onSuccess: () =>
          toast.success(to === 'Accepted' ? `${a.applicantName} accepted and notified` : to === 'Rejected' ? `${a.applicantName} rejected and notified` : 'Moved back to new'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )

  return (
    <li className="rounded-xl p-3.5 ring-1 ring-slate-200 sm:p-4">
      <div className="flex items-start gap-3">
        <Avatar name={a.applicantName} src={a.applicantAvatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{a.applicantName}</p>
            <Badge tone={badge.tone}>{badge.label}</Badge>
            <span className="text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
          </div>
          <div className="mt-1 flex min-w-0 flex-col gap-1 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-4">
            <a href={`mailto:${a.applicantEmail}`} className="flex min-w-0 items-center gap-1 hover:text-brand-700 hover:underline">
              <Mail className="size-3.5 shrink-0" /> <span className="truncate">{a.applicantEmail}</span>
            </a>
            {a.applicantPhone && (
              <a href={`tel:${a.applicantPhone}`} className="flex items-center gap-1 hover:text-brand-700 hover:underline">
                <Phone className="size-3.5 shrink-0" /> {a.applicantPhone}
              </a>
            )}
          </div>
          {a.note && <p className="mt-2 border-l-2 border-slate-200 pl-3 text-sm break-words whitespace-pre-line text-slate-600">{a.note}</p>}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 max-sm:*:flex-1">
        <a
          href={a.cvUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 max-sm:basis-full sm:mr-auto"
        >
          <FileText className="size-4 shrink-0" />
          <span className="truncate">View CV</span>
        </a>
        {a.status !== 'Pending' && (
          <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" />} onClick={() => change('Pending')} disabled={setStatus.isPending}>
            Undo
          </Button>
        )}
        {a.status !== 'Rejected' && (
          <Button size="sm" variant="secondary" icon={<X className="size-4" />} onClick={() => change('Rejected')} disabled={setStatus.isPending}>
            Reject
          </Button>
        )}
        {a.status !== 'Accepted' && (
          <Button size="sm" icon={<Check className="size-4" />} onClick={() => change('Accepted')} loading={setStatus.isPending}>
            Accept
          </Button>
        )}
      </div>
    </li>
  )
}
