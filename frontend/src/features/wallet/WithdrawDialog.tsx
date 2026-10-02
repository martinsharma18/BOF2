import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Dialog, Field, Input, Select, toast } from '@/components/ui'
import { applyServerErrors } from '@/lib/formErrors'
import { formatMoney } from '@/lib/format'
import { useState } from 'react'
import { useRequestWithdrawal } from './api'

const MINIMUM = 100
const banks = ['eSewa', 'Khalti', 'IME Pay', 'Nabil Bank', 'Global IME Bank', 'NIC Asia Bank', 'Nepal Investment Mega Bank', 'Himalayan Bank', 'Other bank']

export function WithdrawDialog({ open, onClose, balance }: { open: boolean; onClose: () => void; balance: number }) {
  const withdraw = useRequestWithdrawal()
  const [formError, setFormError] = useState<string | null>(null)

  const schema = z.object({
    amount: z.coerce
      .number<string>('Enter an amount')
      .min(MINIMUM, `The minimum is ${formatMoney(MINIMUM)}`)
      .max(balance, `You can withdraw up to ${formatMoney(balance)}`),
    bankName: z.string().min(1, 'Choose where to receive the money'),
    accountNumber: z
      .string()
      .trim()
      .min(1, 'Enter an account number or phone number')
      .max(40)
      .regex(/^\+?[0-9A-Za-z\s-]+$/, 'Digits, letters, spaces or dashes only'),
    accountName: z.string().trim().min(1, 'Account holder name is required').max(100),
  })
  type Values = z.input<typeof schema>

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: String(balance), bankName: '', accountNumber: '', accountName: '' },
  })

  const close = () => {
    reset()
    setFormError(null)
    onClose()
  }

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    withdraw.mutate(values, {
      onSuccess: () => {
        toast.success('Withdrawal requested. The admin will send the money soon.')
        close()
      },
      onError: (error) => setFormError(applyServerErrors(error, setError, ['amount', 'bankName', 'accountName', 'accountNumber'])),
    })
  })

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Cash withdraw"
      description={`Available: ${formatMoney(balance)}. Your request goes to the admin, who checks it, sends the money and flags it Done.`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button variant="accent" type="submit" form="withdraw-form" loading={withdraw.isPending}>
            Apply for withdrawal
          </Button>
        </>
      }
    >
      <form id="withdraw-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Alert>{formError}</Alert>}
        <Field label="Amount (Rs.)" htmlFor="w-amount" error={errors.amount?.message}>
          <Input id="w-amount" type="number" inputMode="numeric" min={MINIMUM} max={balance} {...register('amount')} aria-invalid={!!errors.amount} />
        </Field>
        <Field label="Receive in" htmlFor="w-bank" error={errors.bankName?.message}>
          <Select id="w-bank" {...register('bankName')} aria-invalid={!!errors.bankName}>
            <option value="">Choose bank or wallet…</option>
            {banks.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
        <Field label="Account number or phone number" htmlFor="w-number" error={errors.accountNumber?.message} hint="Bank account number, or the phone number of your eSewa / Khalti / IME Pay wallet.">
          <Input id="w-number" autoComplete="off" placeholder="e.g. 0123456789 or 98XXXXXXXX" {...register('accountNumber')} aria-invalid={!!errors.accountNumber} />
        </Field>
        <Field label="Name" htmlFor="w-name" error={errors.accountName?.message}>
          <Input id="w-name" autoComplete="name" placeholder="Name on the account" {...register('accountName')} aria-invalid={!!errors.accountName} />
        </Field>
      </form>
    </Dialog>
  )
}
