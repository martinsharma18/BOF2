import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Banknote, Building2, HandCoins, Phone, X } from 'lucide-react'
import { Alert, Avatar, Badge, Button, Card, EmptyState, Spinner } from '@/components/ui'
import { adminKeys, useAdminStats } from '@/features/admin/api'
import { useApplications } from '@/features/applications/api'
import { ClaimProofLink, DeclineClaimDialog, PayDialog } from '@/features/applications/ApplicationCard'
import type { ApplicationStage } from '@/features/applications/labels'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatMoney, timeAgo } from '@/lib/format'
import type { Application } from '@/lib/types'

const tabs: { stage: ApplicationStage; label: string }[] = [
  { stage: 'Claimed', label: 'To pay' },
  { stage: 'Paid', label: 'Paid' },
]

/** Payment claims from hired individuals, across every company's jobs. The admin checks the proof and pays or declines. */
export function AdminClaimsPage() {
  useDocumentTitle('Payment claims · Admin')
  const [stage, setStage] = useState<ApplicationStage>('Claimed')
  const [page, setPage] = useState(1)
  const stats = useAdminStats().data
  const list = useApplications({ stage, page })
  const data = list.data

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <p className="text-xs font-medium text-slate-500">Waiting to be paid</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 tabular-nums">{stats.pendingClaims}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-slate-500">Total claimed</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-accent-600 tabular-nums">{formatMoney(stats.pendingClaimAmount)}</p>
          </Card>
        </div>
      )}

      <Card>
        <div role="tablist" aria-label="Claims" className="flex gap-1 border-b border-slate-100 p-2">
          {tabs.map((t) => (
            <button
              key={t.stage}
              type="button"
              role="tab"
              aria-selected={stage === t.stage}
              onClick={() => {
                setStage(t.stage)
                setPage(1)
              }}
              className={cn(
                'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none',
                stage === t.stage ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {t.label}
              {t.stage === 'Claimed' && !!stats?.pendingClaims && (
                <span className={cn('ml-1.5 rounded-full px-1.5 text-xs tabular-nums', stage === t.stage ? 'bg-white/20' : 'bg-accent-500 text-white')}>
                  {stats.pendingClaims}
                </span>
              )}
            </button>
          ))}
        </div>

        {list.isError ? (
          <div className="p-4">
            <Alert>{getErrorMessage(list.error)}</Alert>
          </div>
        ) : !data ? (
          <div className="flex justify-center py-16 text-brand-500">
            <Spinner />
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<HandCoins className="size-6" />}
            title={stage === 'Claimed' ? 'No claims waiting' : 'Nothing paid yet'}
            description={stage === 'Claimed' ? 'When a hired person claims payment for a job, it shows up here.' : 'Paid claims show up here.'}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.items.map((a) => (
              <ClaimRow key={a.id} application={a} />
            ))}
          </ul>
        )}

        {data && data.totalCount > data.pageSize && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
            <span>
              Page {page} · {data.totalCount} claims
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
      </Card>
    </div>
  )
}

function ClaimRow({ application: a }: { application: Application }) {
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'pay' | 'decline' | null>(null)
  const paid = a.status === 'Completed'
  const close = () => {
    setDialog(null)
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats })
  }

  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <Avatar name={a.applicant.fullName} src={a.applicant.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-slate-900">{a.applicant.fullName}</p>
            {paid ? <Badge tone="green">Paid</Badge> : <Badge tone="amber">Claimed</Badge>}
          </div>
          <p className="mt-0.5 truncate text-sm text-slate-600">
            <Link to={`/posts/${a.postId}`} className="font-medium hover:text-brand-700 hover:underline">
              {a.postTitle}
            </Link>
          </p>
          <div className="mt-1 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:flex-wrap sm:gap-x-4">
            <span className="flex min-w-0 items-center gap-1">
              <Building2 className="size-3.5 shrink-0" /> <span className="truncate">{a.company.displayName}</span>
            </span>
            {a.applicant.phoneNumber && (
              <a href={`tel:${a.applicant.phoneNumber}`} className="flex items-center gap-1 hover:text-brand-700 hover:underline">
                <Phone className="size-3.5 shrink-0" /> {a.applicant.phoneNumber}
              </a>
            )}
            {(a.claimedAt ?? a.updatedAt) && <span>{timeAgo((paid ? a.updatedAt : a.claimedAt) ?? a.createdAt)}</span>}
          </div>
          {!paid && a.claimNote && <p className="mt-2 border-l-2 border-slate-200 pl-3 text-sm break-words text-slate-600">“{a.claimNote}”</p>}
          {!paid && <ClaimProofLink application={a} />}
        </div>
        <p className={cn('shrink-0 text-right font-display text-lg font-extrabold tabular-nums', paid ? 'text-emerald-700' : 'text-accent-600')}>
          {formatMoney(paid ? a.paidAmount : (a.claimedAmount ?? 0))}
        </p>
      </div>

      {!paid && (
        <div className="mt-3 flex gap-2 max-sm:*:flex-1 sm:justify-end">
          <Button variant="secondary" size="sm" icon={<X className="size-4" />} onClick={() => setDialog('decline')}>
            Decline claim
          </Button>
          <Button variant="accent" size="sm" icon={<Banknote className="size-4" />} onClick={() => setDialog('pay')}>
            Pay {formatMoney(a.claimedAmount ?? 0)}
          </Button>
        </div>
      )}

      {dialog === 'pay' && <PayDialog application={a} onClose={close} />}
      {dialog === 'decline' && <DeclineClaimDialog application={a} onClose={close} />}
    </li>
  )
}
