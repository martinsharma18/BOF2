import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Alert, Button, Field, Input, toast } from '@/components/ui'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/features/auth/AuthContext'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { newPassword } from '@/features/auth/schemas'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api } from '@/lib/api'
import { applyServerErrors } from '@/lib/formErrors'
import type { AuthResponse } from '@/lib/types'

interface CodeSent {
  email: string
  sentTo: string
  expiresInMinutes: number
  resendAfterSeconds: number
  devCode: string | null
}

type SendResponse = Omit<CodeSent, 'email'>

const emailSchema = z.object({ email: z.email('Enter a valid email') })
type EmailValues = z.infer<typeof emailSchema>

const resetSchema = z
  .object({
    code: z.string().trim().regex(/^[0-9]{6}$/, 'Enter the 6-digit code'),
    newPassword,
    confirmPassword: z.string().min(1, 'Please repeat the password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
type ResetValues = z.infer<typeof resetSchema>

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password')
  const [sent, setSent] = useState<CodeSent | null>(null)

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={sent ? `We emailed a 6-digit code to ${sent.sentTo}. Check your inbox and spam folder.` : 'Enter the email you log in with. We will email you a code.'}
    >
      {sent ? <ResetStep sent={sent} onResent={setSent} onChangeEmail={() => setSent(null)} /> : <EmailStep onSent={setSent} />}
      <p className="mt-8 text-center text-sm">
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          ← Back to log in
        </Link>
      </p>
    </AuthLayout>
  )
}

async function sendCode(email: string): Promise<CodeSent> {
  const { data } = await api.post<SendResponse>('/auth/forgot-password', { email })
  return { ...data, email }
}

function EmailStep({ onSent }: { onSent: (sent: CodeSent) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      onSent(await sendCode(values.email))
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['email']))
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError && <Alert>{formError}</Alert>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" inputMode="email" autoComplete="email" autoFocus {...register('email')} aria-invalid={!!errors.email} />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Send code
      </Button>
    </form>
  )
}

function ResetStep({ sent, onResent, onChangeEmail }: { sent: CodeSent; onResent: (sent: CodeSent) => void; onChangeEmail: () => void }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [wait, setWait] = useState(sent.resendAfterSeconds)
  const [resending, setResending] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { code: '', newPassword: '', confirmPassword: '' } })

  useEffect(() => {
    setWait(sent.resendAfterSeconds)
    const timer = setInterval(() => setWait((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timer)
  }, [sent])

  const resend = async () => {
    setFormError(null)
    setResending(true)
    try {
      onResent(await sendCode(sent.email))
      toast.success('New code sent')
    } catch (error) {
      setFormError(applyServerErrors(error, setError, []))
    } finally {
      setResending(false)
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { data } = await api.post<AuthResponse>('/auth/reset-password', {
        email: sent.email,
        ...values,
      })
      signIn(data)
      toast.success('Password changed. You are logged in.')
      navigate('/feed', { replace: true })
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['code', 'newPassword', 'confirmPassword']))
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formError && <Alert>{formError}</Alert>}
      {sent.devCode && (
        <Alert tone="info">
          Development mode (no email provider set up): your code is <b className="tabular-nums">{sent.devCode}</b>.
        </Alert>
      )}
      <Field label="Code from email" htmlFor="code" error={errors.code?.message} hint={`The code works for ${sent.expiresInMinutes} minutes.`}>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          placeholder="123456"
          className="text-center text-lg font-semibold tracking-[0.5em] tabular-nums"
          {...register('code')}
          aria-invalid={!!errors.code}
        />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword?.message} hint="At least 8 characters, with a letter and a number.">
        <PasswordInput id="newPassword" autoComplete="new-password" {...register('newPassword')} aria-invalid={!!errors.newPassword} />
      </Field>
      <Field label="Repeat new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
        Reset password
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onChangeEmail} className="font-semibold text-slate-600 hover:text-slate-900">
          Change email
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={wait > 0 || resending}
          className="font-semibold text-brand-600 hover:text-brand-700 disabled:text-slate-400"
        >
          {wait > 0 ? `Resend code in ${wait}s` : resending ? 'Sending…' : 'Resend code'}
        </button>
      </div>
    </form>
  )
}
