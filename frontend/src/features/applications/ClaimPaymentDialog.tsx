import { useState } from 'react'
import { CircleAlert, Info } from 'lucide-react'
import { Button, Dialog, Field, Input, toast } from '@/components/ui'
import { getErrorMessage, getProblem } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useClaimPayment } from './api'

/**
 * A hired applicant asks the company to pay for the finished job. One claim per job:
 * the company is notified, pays, and the money lands in the applicant's wallet.
 */
export function ClaimPaymentDialog({
  applicationId,
  companyName,
  maxAmount,
  declineReason,
  open,
  onClose,
}: {
  applicationId: string
  companyName: string
  /** The post's maximum payment; 0 means no limit was set. */
  maxAmount: number
  /** Why the company declined the previous claim, if it did. */
  declineReason?: string | null
  open: boolean
  onClose: () => void
}) {
  const claim = useClaimPayment()
  const [amount, setAmount] = useState(maxAmount > 0 ? String(maxAmount) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const value = Number(amount)
  const tooMuch = maxAmount > 0 && value > maxAmount

  const submit = () => {
    setError(undefined)
    claim.mutate(
      { id: applicationId, amount: value, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Claim sent. ${companyName} will pay ${formatMoney(value)} to your wallet.`)
          onClose()
        },
        onError: (e) => setError(getProblem(e)?.errors?.Amount?.[0] ?? getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={declineReason ? 'Claim again' : 'Claim your payment'}
      description={`Finished the job? Ask ${companyName} to pay you.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" loading={claim.isPending} disabled={!(value > 0) || tooMuch} onClick={submit}>
            Claim {value > 0 ? formatMoney(value) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {declineReason && (
          <p className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <b>{companyName} declined your last claim:</b> “{declineReason}”
            </span>
          </p>
        )}
        <Field
          label="Amount (Rs.)"
          htmlFor={`claim-${applicationId}`}
          error={error ?? (tooMuch ? `The most this job pays is ${formatMoney(maxAmount)}.` : undefined)}
          hint={maxAmount > 0 ? `This job pays up to ${formatMoney(maxAmount)}.` : undefined}
        >
          <Input
            id={`claim-${applicationId}`}
            type="number"
            min={1}
            max={maxAmount > 0 ? maxAmount : undefined}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="What did you do?" htmlFor={`claim-note-${applicationId}`} optional>
          <Input
            id={`claim-note-${applicationId}`}
            maxLength={200}
            placeholder="e.g. Worked 3 days, 12 to 14 Oct"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          The company pays exactly this amount, once. If it’s wrong they will decline and tell you why, and you can claim again.
        </p>
      </div>
    </Dialog>
  )
}
