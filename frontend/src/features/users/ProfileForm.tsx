import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Field, Input, Textarea, toast } from '@/components/ui'
import { dateOfBirth, optionalPhone, optionalUrl, phone } from '@/features/auth/schemas'
import { LocationFields } from '@/features/locations/LocationFields'
import { yearsAgo } from '@/lib/format'
import { applyServerErrors } from '@/lib/formErrors'
import type { MyProfile } from '@/lib/types'
import { useUpdateProfile } from './api'

const schema = z.object({
  fullName: z.string().trim().min(1, 'Your name is required').max(100),
  companyName: z.string().trim().max(150),
  gender: z.enum(['Male', 'Female']).or(z.literal('')),
  dateOfBirth,
  phoneNumber: phone,
  additionalPhoneNumber: optionalPhone,
  socialMediaLink: optionalUrl,
  province: z.string(),
  district: z.string(),
  localLevel: z.string(),
  bio: z.string().max(500, 'Keep it under 500 characters'),
})
type Values = z.infer<typeof schema>
const fields = Object.keys(schema.shape)

export function ProfileForm({ me }: { me: MyProfile }) {
  const { profile } = me
  const type = profile.accountType
  const update = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: profile.fullName,
      companyName: profile.companyName ?? '',
      gender: profile.gender ?? '',
      dateOfBirth: me.dateOfBirth ?? '',
      phoneNumber: me.phoneNumber ?? '',
      additionalPhoneNumber: me.additionalPhoneNumber ?? '',
      socialMediaLink: profile.socialMediaLink ?? '',
      province: profile.province ?? '',
      district: profile.district ?? '',
      localLevel: profile.localLevel ?? '',
      bio: profile.bio ?? '',
    },
  })

  const clearDistrict = useCallback(() => setValue('district', ''), [setValue])
  const clearLocalLevel = useCallback(() => setValue('localLevel', ''), [setValue])

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    if (type === 'Company' && !values.companyName) return setError('companyName', { message: 'Company name is required' })
    if (type === 'Individual' && !values.gender) return setError('gender', { message: 'Select M or F' })
    if (type === 'Individual' && !values.dateOfBirth) return setError('dateOfBirth', { message: 'Enter your date of birth' })
    if (type !== 'Admin' && !values.province) return setError('province', { message: 'Select your province' })

    try {
      await update.mutateAsync({
        fullName: values.fullName,
        companyName: values.companyName || null,
        gender: values.gender || null,
        dateOfBirth: values.dateOfBirth || null,
        phoneNumber: values.phoneNumber,
        additionalPhoneNumber: values.additionalPhoneNumber || null,
        socialMediaLink: values.socialMediaLink || null,
        province: values.province || null,
        district: values.district || null,
        localLevel: values.localLevel || null,
        bio: values.bio || null,
      })
      reset(values)
      toast.success('Profile saved')
    } catch (error) {
      setFormError(applyServerErrors(error, setError, fields))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert>{formError}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" {...register('fullName')} aria-invalid={!!errors.fullName} />
        </Field>
        {type === 'Company' && (
          <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message}>
            <Input id="companyName" autoComplete="organization" {...register('companyName')} aria-invalid={!!errors.companyName} />
          </Field>
        )}
        {type === 'Individual' && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Gender</legend>
            <div className="flex h-10 items-center gap-6">
              {(['Male', 'Female'] as const).map((g) => (
                <label key={g} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="radio" value={g} {...register('gender')} className="size-4 accent-brand-600" />
                  {g}
                </label>
              ))}
            </div>
            {errors.gender && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.gender.message}</p>}
          </fieldset>
        )}
        {type === 'Individual' && (
          <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
            <Input id="dateOfBirth" type="date" autoComplete="bday" min={yearsAgo(100)} max={yearsAgo(16)} {...register('dateOfBirth')} aria-invalid={!!errors.dateOfBirth} />
          </Field>
        )}
        <Field label="Email" htmlFor="email" hint="Email can't be changed.">
          <Input id="email" value={me.email} disabled readOnly />
        </Field>
        <Field label="Phone number" htmlFor="phoneNumber" error={errors.phoneNumber?.message}>
          <Input id="phoneNumber" type="tel" autoComplete="tel" {...register('phoneNumber')} aria-invalid={!!errors.phoneNumber} />
        </Field>
        {type === 'Individual' && (
          <>
            <Field label="Additional number" htmlFor="additionalPhoneNumber" optional error={errors.additionalPhoneNumber?.message}>
              <Input id="additionalPhoneNumber" type="tel" {...register('additionalPhoneNumber')} aria-invalid={!!errors.additionalPhoneNumber} />
            </Field>
            <Field label="Social media link" htmlFor="socialMediaLink" optional error={errors.socialMediaLink?.message}>
              <Input id="socialMediaLink" type="url" placeholder="https://" {...register('socialMediaLink')} aria-invalid={!!errors.socialMediaLink} />
            </Field>
          </>
        )}
      </div>

      {type !== 'Admin' && (
        <LocationFields
          province={register('province')}
          district={register('district')}
          localLevel={register('localLevel')}
          selectedProvince={watch('province')}
          selectedDistrict={watch('district')}
          onProvinceChanged={clearDistrict}
          onDistrictChanged={clearLocalLevel}
          localLevelOptional
          districtOptional
          errors={{ province: errors.province?.message, district: errors.district?.message, localLevel: errors.localLevel?.message }}
        />
      )}

      <Field label="About" htmlFor="bio" optional error={errors.bio?.message} hint="A short intro shown on your public profile.">
        <Textarea id="bio" rows={3} maxLength={500} {...register('bio')} aria-invalid={!!errors.bio} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  )
}
