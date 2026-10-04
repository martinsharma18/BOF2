import { useRef, useState } from 'react'
import { CircleAlert, FileText, Info, Paperclip, X } from 'lucide-react'
import { Button, Dialog, Field, Input, toast } from '@/components/ui'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { getErrorMessage, getProblem } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { shrinkImage } from '@/lib/image'
import { useClaimPayment } from './api'

const MAX_PROOF_BYTES = 5 * 1024 * 1024
const PROOF_TYPES = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'

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
  const [proof, setProof] = useState<File | null>(null)
  const [proofError, setProofError] = useState<string>()
  const proofInput = useRef<HTMLInputElement>(null)
  const proofPreview = useObjectUrl(proof?.type.startsWith('image/') ? proof : null)
  const [error, setError] = useState<string>()
  const value = Number(amount)
  const tooMuch = maxAmount > 0 && value > maxAmount

  const pickProof = async (picked: File) => {
    setProofError(undefined)
    if (!PROOF_TYPES.split(',').includes(picked.type)) return setProofError('Choose a photo (JPG, PNG, WEBP) or a PDF.')
    // Photos are shrunk on the phone first so they upload quickly on slow data.
    const file = picked.type.startsWith('image/') ? await shrinkImage(picked, 1600) : picked
    if (file.size > MAX_PROOF_BYTES) return setProofError('The file must be 5 MB or smaller.')
    setProof(file)
  }

  const submit = () => {
    setError(undefined)
    claim.mutate(
      { id: applicationId, amount: value, note: note.trim() || undefined, proof },
      {
        onSuccess: () => {
          toast.success(`Claim sent. ${companyName} will pay ${formatMoney(value)} to your wallet.`)
          onClose()
        },
        onError: (e) => {
          const errors = getProblem(e)?.errors
          if (errors?.Proof?.[0]) setProofError(errors.Proof[0])
          else setError(errors?.Amount?.[0] ?? getErrorMessage(e))
        },
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
        <Field label="Photo or file of the work" htmlFor={`claim-proof-${applicationId}`} optional error={proofError} hint={proof ? undefined : 'A photo of the finished work, a receipt or a PDF. Max 5 MB.'}>
          {proof ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
              {proofPreview ? (
                <img src={proofPreview} alt="" className="size-14 shrink-0 rounded-md object-cover" />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-white text-brand-500 ring-1 ring-slate-200">
                  <FileText className="size-6" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{proof.name}</p>
                <p className="text-xs text-slate-500">{(proof.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <Button size="icon" variant="ghost" className="size-8" aria-label="Remove file" onClick={() => setProof(null)}>
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button id={`claim-proof-${applicationId}`} variant="secondary" className="w-full" icon={<Paperclip className="size-4" />} onClick={() => proofInput.current?.click()}>
              Add photo or file
            </Button>
          )}
          <input
            ref={proofInput}
            type="file"
            accept={PROOF_TYPES}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void pickProof(file)
            }}
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
