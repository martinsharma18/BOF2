import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock } from 'lucide-react'
import { Alert, Avatar, Button, Field, Input, toast } from '@/components/ui'
import { optionalPhone, phone } from '@/features/auth/schemas'
import { formatDay } from '@/lib/format'
import { applyServerErrors } from '@/lib/formErrors'
import type { MyProfile } from '@/lib/types'
import { useUpdatePhone } from './api'

/** An individual's details are fixed after registration; they are shown here read-only. */
export function LockedProfile({ me }: { me: MyProfile }) {
  const { profile } = me
  const area = [profile.localLevel, profile.district, profile.province].filter(Boolean).join(', ')
  const rows = [
    { label: 'Full name', value: profile.fullName },
    { label: 'Gender', value: profile.gender },
    { label: 'Date of birth', value: me.dateOfBirth && formatDay(me.dateOfBirth) },
    { label: 'Email', value: me.email },
    { label: 'Area', value: area },
    { label: 'Social media link', value: profile.socialMediaLink },
    { label: 'About', value: profile.bio },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={profile.fullName} src={profile.avatarUrl} size="xl" />
        <p className="flex items-start gap-2 text-sm text-slate-600">
          <Lock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          Your details can't be changed after registration. You can only change your phone number below. Something wrong? Contact support.
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-slate-200/70 ring-1 ring-slate-200/70 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="bg-slate-50 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">{row.label}</dt>
            <dd className="text-sm font-semibold break-words text-slate-900">{row.value || <span className="font-normal text-slate-400">Not set</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const schema = z.object({ phoneNumber: phone, additionalPhoneNumber: optionalPhone })
type Values = z.infer<typeof schema>

/** The one profile edit an individual can make. */
export function PhoneForm({ me }: { me: MyProfile }) {
  const update = useUpdatePhone()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { phoneNumber: me.phoneNumber ?? '', additionalPhoneNumber: me.additionalPhoneNumber ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await update.mutateAsync({ phoneNumber: values.phoneNumber, additionalPhoneNumber: values.additionalPhoneNumber || null })
      reset(values)
      toast.success('Phone number saved')
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['phoneNumber', 'additionalPhoneNumber']))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert>{formError}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone number" htmlFor="phoneNumber" error={errors.phoneNumber?.message}>
          <Input id="phoneNumber" type="tel" autoComplete="tel" inputMode="tel" {...register('phoneNumber')} aria-invalid={!!errors.phoneNumber} />
        </Field>
        <Field label="Additional number" htmlFor="additionalPhoneNumber" optional error={errors.additionalPhoneNumber?.message}>
          <Input id="additionalPhoneNumber" type="tel" inputMode="tel" {...register('additionalPhoneNumber')} aria-invalid={!!errors.additionalPhoneNumber} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save phone number
        </Button>
      </div>
    </form>
  )
}
