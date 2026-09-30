import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Check, X } from 'lucide-react'
import { Alert, Avatar, Badge, Button, Card, Dialog, EmptyState, Field, Select, Spinner, Textarea, toast } from '@/components/ui'
import { withdrawalStatusMeta } from '@/features/applications/labels'
import { useAdminWithdrawals, useProcessWithdrawal } from '@/features/wallet/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage, getProblem } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import type { Withdrawal, WithdrawalStatus } from '@/lib/types'

/** Cash-out requests from individuals. The admin sends the money, then marks it paid. */
export function AdminWithdrawalsPage() {
  useDocumentTitle('Withdrawals · Admin')
  const [status, setStatus] = useState<WithdrawalStatus | ''>('Pending')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<{ withdrawal: Withdrawal; paid: boolean } | null>(null)

  const list = useAdminWithdrawals({ status: status || undefined, page })
  const data = list.data

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">Send the money to the account shown, then mark the request as paid. The user is notified.</p>
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as WithdrawalStatus | '')
            setPage(1)
          }}
          className="sm:w-48"
        >
          <option value="Pending">Waiting to pay</option>
          <option value="Paid">Paid</option>
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
                <p className="font-mono text-slate-700 select-all">{w.accountNumber}</p>
                <p className="text-slate-500">{w.accountName}</p>
                {w.adminNote && <p className="mt-1 text-xs text-slate-500">Note: {w.adminNote}</p>}
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="font-display text-lg font-bold text-slate-900 tabular-nums">{formatMoney(w.amount)}</span>
                {w.status === 'Pending' ? (
                  <>
                    <Button size="sm" icon={<Check className="size-4" />} onClick={() => setTarget({ withdrawal: w, paid: true })}>
                      Mark paid
                    </Button>
                    <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => setTarget({ withdrawal: w, paid: false })}>
                      Reject
                    </Button>
                  </>
                ) : (
                  <Badge tone={withdrawalStatusMeta[w.status].tone}>{withdrawalStatusMeta[w.status].label}</Badge>
                )}
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

      {target && <ProcessDialog key={target.withdrawal.id + target.paid} {...target} onClose={() => setTarget(null)} />}
    </Card>
  )
}

function ProcessDialog({ withdrawal, paid, onClose }: { withdrawal: Withdrawal; paid: boolean; onClose: () => void }) {
  const process = useProcessWithdrawal()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()

  const submit = () =>
    process.mutate(
      { id: withdrawal.id, paid, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(paid ? 'Marked as paid. The user was notified.' : 'Request rejected')
          onClose()
        },
        onError: (e) => setError(getProblem(e)?.errors?.Note?.[0] ?? getErrorMessage(e)),
      },
    )

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={paid ? `Mark ${formatMoney(withdrawal.amount)} as paid?` : 'Reject this withdrawal?'}
      description={
        paid
          ? `Only confirm after sending the money to ${withdrawal.bankName} ${withdrawal.accountNumber} (${withdrawal.accountName}).`
          : 'The amount goes back to the user’s wallet balance.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={paid ? 'primary' : 'danger'} loading={process.isPending} onClick={submit}>
            {paid ? 'Yes, it’s paid' : 'Reject request'}
          </Button>
        </>
      }
    >
      <Field label={paid ? 'Reference / note' : 'Reason'} htmlFor="process-note" optional={paid} error={error}>
        <Textarea
          id="process-note"
          rows={3}
          maxLength={300}
          placeholder={paid ? 'e.g. Transaction ID 12345' : 'e.g. Account number does not match the name'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </Dialog>
  )
}
