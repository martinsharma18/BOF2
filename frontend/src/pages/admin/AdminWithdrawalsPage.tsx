import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Check, Clock, X } from 'lucide-react'
import { Alert, Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Select, Spinner, Textarea, toast } from '@/components/ui'
import { withdrawalStatusMeta } from '@/features/applications/labels'
import { useAdminWithdrawals, useProcessWithdrawal } from '@/features/wallet/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage, getProblem } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import type { Withdrawal, WithdrawalStatus } from '@/lib/types'

const flags: { status: WithdrawalStatus; label: string; icon: ReactNode }[] = [
  { status: 'Paid', label: 'Done', icon: <Check className="size-4" /> },
  { status: 'Pending', label: 'Pending', icon: <Clock className="size-4" /> },
  { status: 'Rejected', label: 'Reject', icon: <X className="size-4" /> },
]

/** Cash-out requests from individuals. The super admin verifies the details, sends the money and flags it Done, Pending or Rejected. */
export function AdminWithdrawalsPage() {
  useDocumentTitle('Withdrawals · Admin')
  const [status, setStatus] = useState<WithdrawalStatus | ''>('Pending')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<{ withdrawal: Withdrawal; status: WithdrawalStatus } | null>(null)

  const list = useAdminWithdrawals({ status: status || undefined, page })
  const data = list.data

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Verify the account/phone number and name, send the money, then flag the request <b>Done</b>. Use <b>Reject</b> if the details are wrong. The user
          sees the flag in their wallet and gets a notification.
        </p>
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as WithdrawalStatus | '')
            setPage(1)
          }}
          className="sm:w-48"
        >
          <option value="Pending">Pending</option>
          <option value="Paid">Done</option>
          <option value="Rejected">Rejected</option>
          <option value="">All requests</option>
        </Select>
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
        <EmptyState icon={<Banknote className="size-6" />} title={status === 'Pending' ? 'Nothing to pay right now' : 'No requests'} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {data.items.map((w) => (
            <li key={w.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link to={`/u/${w.user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={w.user.displayName} src={w.user.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 hover:underline">{w.user.displayName}</p>
                  <p className="text-xs text-slate-500">Requested {formatDate(w.createdAt)}</p>
                </div>
              </Link>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-slate-900">{w.bankName}</p>
                <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Account / phone number</p>
                <p className="font-mono text-slate-700 select-all">{w.accountNumber}</p>
                <p className="text-slate-500">{w.accountName}</p>
                {w.adminNote && <p className="mt-1 text-xs text-slate-500">Note: {w.adminNote}</p>}
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-slate-900 tabular-nums">{formatMoney(w.amount)}</span>
                  <Badge tone={withdrawalStatusMeta[w.status].tone}>{withdrawalStatusMeta[w.status].label}</Badge>
                </div>
                <div className="flex gap-1.5" role="group" aria-label="Flag this request">
                  {flags
                    .filter((f) => f.status !== w.status)
                    .map((f) => (
                      <Button
                        key={f.status}
                        size="sm"
                        variant={f.status === 'Paid' ? 'primary' : f.status === 'Rejected' ? 'ghost' : 'secondary'}
                        icon={f.icon}
                        onClick={() => setTarget({ withdrawal: w, status: f.status })}
                      >
                        {f.label}
                      </Button>
                    ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && (page > 1 || data.hasMore) && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{data.totalCount} requests</span>
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

      {target && <ProcessDialog key={target.withdrawal.id + target.status} {...target} onClose={() => setTarget(null)} />}
    </Card>
  )
}

const dialogCopy: Record<WithdrawalStatus, { title: (amount: string) => string; confirm: string; toast: string; noteLabel: string; placeholder: string }> = {
  Paid: {
    title: (amount) => `Flag ${amount} as Done?`,
    confirm: 'Yes, it’s done',
    toast: 'Flagged Done. The user was notified.',
    noteLabel: 'Reference / note',
    placeholder: 'e.g. Transaction ID 12345',
  },
  Pending: {
    title: () => 'Flag this request as Pending?',
    confirm: 'Flag Pending',
    toast: 'Flagged Pending. The user was notified.',
    noteLabel: 'Note',
    placeholder: 'e.g. Checking the account details',
  },
  Rejected: {
    title: () => 'Reject this withdrawal?',
    confirm: 'Reject request',
    toast: 'Request rejected. The user was notified.',
    noteLabel: 'Reason',
    placeholder: 'e.g. Account number does not match the name',
  },
}

function ProcessDialog({ withdrawal, status, onClose }: { withdrawal: Withdrawal; status: WithdrawalStatus; onClose: () => void }) {
  const copy = dialogCopy[status]
  const process = useProcessWithdrawal()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  const submit = () =>
    process.mutate(
      { id: withdrawal.id, status, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(copy.toast)
          onClose()
        },
        onError: (e) => {
          const errors = getProblem(e)?.errors
          setError(errors?.Note?.[0] ?? errors?.Amount?.[0] ?? getErrorMessage(e))
        },
      },
    )

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={copy.title(formatMoney(withdrawal.amount))}
      description={
        status === 'Paid'
          ? `Only confirm after sending the money to ${withdrawal.bankName} ${withdrawal.accountNumber} (${withdrawal.accountName}).`
          : status === 'Rejected'
            ? 'The amount goes back to the user’s wallet balance.'
            : 'The request goes back to the waiting list and the amount stays held from the user’s wallet.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={status === 'Rejected' ? 'danger' : 'primary'} loading={process.isPending} onClick={submit}>
            {copy.confirm}
          </Button>
        </>
      }
    >
      <Field label={copy.noteLabel} htmlFor="process-note" optional={status !== 'Rejected'} error={error}>
        <Textarea
          id="process-note"
          rows={3}
          maxLength={300}
          placeholder={copy.placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </Dialog>
  )
}
