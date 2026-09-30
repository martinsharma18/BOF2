import { useState } from 'react'
import { Button, Dialog, Field, Input, toast } from '@/components/ui'
import { getErrorMessage, getProblem } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useClaimPayment } from './api'

/** Accepted applicant asks the company to pay them. The company is notified and pays into the wallet. */
export function ClaimPaymentDialog({
  applicationId,
  companyName,
  suggestedAmount,
  open,
  onClose,
}: {
  applicationId: string
  companyName: string
  suggestedAmount: number
  open: boolean
  onClose: () => void
}) {
  const claim = useClaimPayment()
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(suggestedAmount) : '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const value = Number(amount)

  const submit = () => {
    setError(undefined)
    claim.mutate(
      { id: applicationId, amount: value, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`Claim of ${formatMoney(value)} sent to ${companyName}`)
          setNote('')
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
      title="Claim your payment"
      description={`${companyName} will be notified. Once they pay, the money goes to your wallet and you can cash it out.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" loading={claim.isPending} disabled={!(value > 0)} onClick={submit}>
            Claim {value > 0 ? formatMoney(value) : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Amount (Rs.)" htmlFor={`claim-${applicationId}`} error={error}>
          <Input id={`claim-${applicationId}`} type="number" min={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Note for the company" htmlFor={`claim-note-${applicationId}`} optional>
          <Input
            id={`claim-note-${applicationId}`}
            maxLength={200}
            placeholder="e.g. Worked 3 days, 12 to 14 Oct"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  )
}
