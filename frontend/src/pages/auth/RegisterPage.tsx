import { useCallback, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, CheckCircle2, UserRound } from 'lucide-react'
import { Alert, Button, Field, FieldError, FormSection, Input } from '@/components/ui'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/features/auth/AuthContext'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { registerSchema, type RegisterValues } from '@/features/auth/schemas'
import { LocationFields } from '@/features/locations/LocationFields'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { yearsAgo } from '@/lib/format'
import { applyServerErrors } from '@/lib/formErrors'
import type { AuthResponse } from '@/lib/types'

type AccountChoice = RegisterValues['accountType']

const accountOptions: { value: AccountChoice; title: string; description: string; icon: ReactNode }[] = [
  {
    value: 'Individual',
    title: 'Individual',
    description: 'Find opportunities, apply or claim, and get paid.',
    icon: <UserRound className="size-5" />,
  },
  {
    value: 'Company',
    title: 'Company',
    description: 'Post opportunities with a photo and hire people.',
    icon: <Building2 className="size-5" />,
  },
]

const fields = [
  'fullName',
  'companyName',
  'gender',
  'dateOfBirth',
  'email',
  'phoneNumber',
  'socialMediaLink',
  'province',
  'district',
  'localLevel',
  'additionalPhoneNumber',
  'password',
  'confirmPassword',
]

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      accountType: params.get('type') === 'company' ? 'Company' : 'Individual',
      fullName: '',
      companyName: '',
      email: '',
      phoneNumber: '',
      socialMediaLink: '',
      additionalPhoneNumber: '',
      province: '',
      district: '',
      localLevel: '',
      dateOfBirth: '',
      password: '',
      confirmPassword: '',
    },
  })

  const accountType = watch('accountType')
  const gender = watch('gender')
  const isCompany = accountType === 'Company'
  const clearDistrict = useCallback(() => setValue('district', ''), [setValue])
  const clearLocalLevel = useCallback(() => setValue('localLevel', ''), [setValue])

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    const common = { fullName: v.fullName, email: v.email, phoneNumber: v.phoneNumber, province: v.province, district: v.district || null, localLevel: v.localLevel || null, password: v.password, confirmPassword: v.confirmPassword }
    try {
      const { data } = isCompany
        ? await api.post<AuthResponse>('/auth/register/company', { ...common, companyName: v.companyName })
        : await api.post<AuthResponse>('/auth/register/individual', {
            ...common,
            gender: v.gender,
            dateOfBirth: v.dateOfBirth,
            socialMediaLink: v.socialMediaLink || null,
            additionalPhoneNumber: v.additionalPhoneNumber || null,
          })
      signIn(data)
      navigate('/feed', { replace: true })
    } catch (error) {
      setFormError(applyServerErrors(error, setError, fields))
    }
  }, (invalid) => {
    // Never fail silently: if the only errors are on fields hidden for this account type, say so.
    const visible = isCompany ? fields.filter((f) => !['gender', 'dateOfBirth', 'socialMediaLink', 'additionalPhoneNumber'].includes(f)) : fields.filter((f) => f !== 'companyName')
    const hidden = Object.keys(invalid).filter((k) => !visible.includes(k))
    setFormError(hidden.length && hidden.length === Object.keys(invalid).length ? 'Please check the form and try again.' : null)
  })

  return (
    <AuthLayout title="Create your account" subtitle="It's free. Choose how you'll use it.">
      <form onSubmit={onSubmit} className="space-y-7" noValidate>
        {formError && <Alert>{formError}</Alert>}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-900">I am registering as</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {accountOptions.map((o) => {
              const selected = accountType === o.value
              return (
                <label
                  key={o.value}
                  className={cn(
                    'relative flex cursor-pointer gap-3 rounded-2xl bg-white p-4 shadow-card ring-1 transition',
                    selected ? 'ring-2 ring-brand-600' : 'ring-slate-200 hover:ring-brand-300',
                  )}
                >
                  <input
                    type="radio"
                    value={o.value}
                    {...register('accountType', { onChange: () => clearErrors() })}
                    className="mt-1 size-4 shrink-0 accent-brand-600"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">
                      <span className={cn('transition', selected ? 'text-brand-600' : 'text-slate-400')}>{o.icon}</span>
                      {o.title}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">{o.description}</span>
                  </span>
                  {selected && <CheckCircle2 className="absolute top-3 right-3 size-5 text-brand-600" aria-hidden />}
                </label>
              )
            })}
          </div>
        </fieldset>

        {isCompany && (
          <div className="animate-slide-up">
            <FormSection title="Company details" description="Shown on every opportunity you post.">
              <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message}>
                <Input id="companyName" autoComplete="organization" {...register('companyName')} aria-invalid={!!errors.companyName} />
              </Field>
              <LocationFields
                province={register('province')}
                district={register('district')}
                localLevel={register('localLevel')}
                selectedProvince={watch('province')}
                selectedDistrict={watch('district')}
                onProvinceChanged={clearDistrict}
                onDistrictChanged={clearLocalLevel}
                districtOptional
                localLevelOptional
                errors={{ province: errors.province?.message, district: errors.district?.message, localLevel: errors.localLevel?.message }}
              />
            </FormSection>
          </div>
        )}

        <FormSection title={isCompany ? 'Contact person' : 'About you'}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={isCompany ? 'Your name' : 'Full name'} htmlFor="fullName" error={errors.fullName?.message}>
              <Input id="fullName" autoComplete="name" {...register('fullName')} aria-invalid={!!errors.fullName} />
            </Field>
            {!isCompany && (
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-slate-700">Gender</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(['Male', 'Female'] as const).map((g) => (
                    <label
                      key={g}
                      className={cn(
                        'flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ring-1 transition',
                        gender === g ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500' : 'text-slate-600 ring-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <input type="radio" value={g} {...register('gender')} className="sr-only" />
                      {g === 'Male' ? 'M · Male' : 'F · Female'}
                    </label>
                  ))}
                </div>
                <FieldError message={errors.gender?.message} />
              </fieldset>
            )}
            {!isCompany && (
              <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
                <Input id="dateOfBirth" type="date" autoComplete="bday" min={yearsAgo(100)} max={yearsAgo(16)} {...register('dateOfBirth')} aria-invalid={!!errors.dateOfBirth} />
              </Field>
            )}
            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Phone number" htmlFor="phoneNumber" error={errors.phoneNumber?.message}>
              <Input id="phoneNumber" type="tel" autoComplete="tel" placeholder="98XXXXXXXX" {...register('phoneNumber')} aria-invalid={!!errors.phoneNumber} />
            </Field>
            {!isCompany && (
              <>
                <Field label="Additional number" htmlFor="additionalPhoneNumber" optional error={errors.additionalPhoneNumber?.message}>
                  <Input id="additionalPhoneNumber" type="tel" {...register('additionalPhoneNumber')} aria-invalid={!!errors.additionalPhoneNumber} />
                </Field>
                <Field label="Social media link" htmlFor="socialMediaLink" optional error={errors.socialMediaLink?.message}>
                  <Input id="socialMediaLink" type="url" placeholder="https://facebook.com/you" {...register('socialMediaLink')} aria-invalid={!!errors.socialMediaLink} />
                </Field>
              </>
            )}
          </div>
        </FormSection>

        {!isCompany && (
          <FormSection title="Current address">
            <LocationFields
              province={register('province')}
              district={register('district')}
              localLevel={register('localLevel')}
              selectedProvince={watch('province')}
              selectedDistrict={watch('district')}
              onProvinceChanged={clearDistrict}
              onDistrictChanged={clearLocalLevel}
              districtOptional
              localLevelOptional
              errors={{ province: errors.province?.message, district: errors.district?.message, localLevel: errors.localLevel?.message }}
            />
          </FormSection>
        )}

        <FormSection title="Password">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Create password" htmlFor="password" error={errors.password?.message}>
              <PasswordInput id="password" autoComplete="new-password" {...register('password')} aria-invalid={!!errors.password} />
            </Field>
            <Field label="Repeat password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
              <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword')} aria-invalid={!!errors.confirmPassword} />
            </Field>
          </div>
        </FormSection>

        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          {isCompany ? 'Create company account' : 'Create account'}
        </Button>
        <p className="text-center text-xs text-slate-500">
          By creating an account you agree to our <Link to="/terms" className="font-medium text-brand-600 hover:underline">Terms</Link> and{' '}
          <Link to="/privacy" className="font-medium text-brand-600 hover:underline">Privacy Policy</Link>.
        </p>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
