import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Field, Input } from '@/components/ui'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/features/auth/AuthContext'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api, getErrorMessage } from '@/lib/api'
import type { AuthResponse } from '@/lib/types'
import { APP_NAME } from '@/lib/brand'

export function LoginPage() {
  useDocumentTitle('Log in')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', values)
      signIn(data)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/feed', { replace: true })
    } catch (error) {
      setFormError(getErrorMessage(error))
    }
  })

  return (
    <AuthLayout title="Welcome back" subtitle={`Log in to see what's new on ${APP_NAME}.`}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {formError && <Alert>{formError}</Alert>}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" autoFocus {...register('email')} aria-invalid={!!errors.email} />
        </Field>
        <Field
          label={
            <>
              Password
              <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Forgot password?
              </Link>
            </>
          }
          htmlFor="password"
          error={errors.password?.message}
        >
          <PasswordInput id="password" autoComplete="current-password" {...register('password')} aria-invalid={!!errors.password} />
        </Field>
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Log in
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        New to {APP_NAME}?{' '}
        <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
