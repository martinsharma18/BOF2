import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import { Alert, Button, ButtonLink, Field, Input } from '@/components/ui'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/features/auth/AuthContext'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api, getErrorMessage } from '@/lib/api'
import type { AuthResponse } from '@/lib/types'
import { APP_NAME } from '@/lib/brand'

const inputClass = 'h-12 rounded-xl! bg-slate-50! focus:bg-white!'

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
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            leading={<Mail className="size-[18px]" />}
            className={inputClass}
            {...register('email')}
            aria-invalid={!!errors.email}
          />
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
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            leading={<Lock className="size-[18px]" />}
            className={inputClass}
            {...register('password')}
            aria-invalid={!!errors.password}
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          loading={isSubmitting}
          className="group mt-2 w-full shadow-lg shadow-brand-600/25 transition-all hover:shadow-brand-600/40 active:scale-[0.99]"
        >
          Log in
          {!isSubmitting && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3 text-xs font-medium tracking-wide text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-200" />
        New to {APP_NAME}?
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <ButtonLink to="/register" variant="secondary" size="lg" className="w-full">
        Create an account
      </ButtonLink>
    </AuthLayout>
  )
}
