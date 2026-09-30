import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Field, toast } from '@/components/ui'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { changePasswordSchema, type ChangePasswordValues } from '@/features/auth/schemas'
import { applyServerErrors } from '@/lib/formErrors'
import { useChangePassword } from './api'

const fields = ['currentPassword', 'newPassword', 'confirmPassword']

export function ChangePasswordForm() {
  const change = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await change.mutateAsync(values)
      reset()
      toast.success('Password changed. Other devices were signed out.')
    } catch (error) {
      setFormError(applyServerErrors(error, setError, fields))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <PasswordInput id="currentPassword" autoComplete="current-password" {...register('currentPassword')} aria-invalid={!!errors.currentPassword} />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="At least 8 characters with a letter and a number.">
        <PasswordInput id="newPassword" autoComplete="new-password" {...register('newPassword')} aria-invalid={!!errors.newPassword} />
      </Field>
      <Field label="Repeat new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Update password
      </Button>
    </form>
  )
}
