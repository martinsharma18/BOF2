import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Send, Users } from 'lucide-react'
import { Alert, Button, Card, ConfirmDialog, EmptyState, Field, FormSection, Input, PageHeader, Select, Skeleton, Textarea, toast } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { useAuth } from '@/features/auth/AuthContext'
import { useAudienceCount, useMyInvitations, useSendInvitation, type InvitationAudience } from '@/features/invitations/api'
import { LocationFields } from '@/features/locations/LocationFields'
import { usePosts } from '@/features/posts/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/cn'
import { applyServerErrors } from '@/lib/formErrors'
import { pluralize, timeAgo } from '@/lib/format'
import type { Invitation } from '@/lib/types'
import { FeedRail } from './FeedRail'

const MIN_AGE = 16
const MAX_AGE = 100

const age = z
  .string()
  .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= MIN_AGE && Number(v) <= MAX_AGE), `Between ${MIN_AGE} and ${MAX_AGE}`)

const schema = z
  .object({
    province: z.string(),
    district: z.string(),
    localLevel: z.string(),
    gender: z.enum(['Any', 'Male', 'Female']),
    minAge: age,
    maxAge: age,
    title: z.string().trim().min(1, 'Give the invitation a short title').max(120),
    message: z.string().trim().min(1, 'Write a message').max(500),
    postId: z.string(),
  })
  .refine((v) => !v.minAge || !v.maxAge || Number(v.maxAge) >= Number(v.minAge), { path: ['maxAge'], message: 'Must be at least the minimum age' })
type Values = z.infer<typeof schema>
const fieldNames = Object.keys(schema.shape) as (keyof Values)[]

const genderOptions = [
  { value: 'Any', label: 'Everyone' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
] as const

function toAudience(v: Pick<Values, 'province' | 'district' | 'localLevel' | 'gender' | 'minAge' | 'maxAge'>): InvitationAudience {
  return {
    province: v.province || undefined,
    district: v.district || undefined,
    localLevel: v.localLevel || undefined,
    gender: v.gender === 'Any' ? undefined : v.gender,
    minAge: v.minAge ? Number(v.minAge) : undefined,
    maxAge: v.maxAge ? Number(v.maxAge) : undefined,
  }
}

/** Company: send an invitation to the inbox of every individual matching location, gender and age. */
export function InvitationsPage() {
  useDocumentTitle('Invitations')
  return (
    <WithRail rail={<FeedRail />}>
      <PageHeader title="Invitations" description="Invite people to work with you. Everyone who matches your filters gets it in their Inbox." />
      <InvitationForm />
      <SentInvitations />
    </WithRail>
  )
}

function InvitationForm() {
  const { user } = useAuth()
  const send = useSendInvitation()
  const myPosts = usePosts({ authorId: user?.id })
  const posts = myPosts.data?.pages.flatMap((p) => p.items) ?? []
  const [formError, setFormError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<Values | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { province: '', district: '', localLevel: '', gender: 'Any', minAge: '', maxAge: '', title: '', message: '', postId: '' },
  })

  const clearDistrict = useCallback(() => setValue('district', ''), [setValue])
  const clearLocalLevel = useCallback(() => setValue('localLevel', ''), [setValue])

  const [province, district, localLevel, gender, minAge, maxAge] = watch(['province', 'district', 'localLevel', 'gender', 'minAge', 'maxAge'])
  const ageValid = age.safeParse(minAge).success && age.safeParse(maxAge).success && (!minAge || !maxAge || Number(maxAge) >= Number(minAge))
  // Debounce a string so a new object each render doesn't restart the timer forever.
  const audienceKey = useDebouncedValue(JSON.stringify(toAudience({ province, district, localLevel, gender, minAge, maxAge })))
  const audience = useMemo(() => JSON.parse(audienceKey) as InvitationAudience, [audienceKey])
  const count = useAudienceCount(audience, ageValid)

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    setConfirming(values)
  })

  const confirmSend = () => {
    if (!confirming) return
    send.mutate(
      { ...toAudience(confirming), title: confirming.title, message: confirming.message, postId: confirming.postId || undefined },
      {
        onSuccess: (sent) => {
          toast.success(`Invitation sent to ${pluralize(sent.recipientCount, 'person', 'people')}`)
          setConfirming(null)
          reset()
        },
        onError: (error) => {
          setConfirming(null)
          setFormError(applyServerErrors(error, setError, fieldNames))
        },
      },
    )
  }

  const reach = count.data
  return (
    <form onSubmit={onSubmit} noValidate>
      <Card className="space-y-6 p-5 sm:p-7">
        {formError && <Alert>{formError}</Alert>}

        <FormSection title="Who should receive it" description="Leave a filter empty to include everyone.">
          <LocationFields
            province={register('province')}
            district={register('district')}
            localLevel={register('localLevel')}
            selectedProvince={province}
            selectedDistrict={district}
            onProvinceChanged={clearDistrict}
            onDistrictChanged={clearLocalLevel}
            allowAny
            errors={{ province: errors.province?.message, district: errors.district?.message, localLevel: errors.localLevel?.message }}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Gender</p>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gender">
                {genderOptions.map((g) => (
                  <label
                    key={g.value}
                    className={cn(
                      'flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ring-1 transition',
                      gender === g.value ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-500' : 'text-slate-600 ring-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <input type="radio" value={g.value} {...register('gender')} className="sr-only" />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Age from" htmlFor="minAge" optional error={errors.minAge?.message}>
                <Input id="minAge" type="number" inputMode="numeric" min={MIN_AGE} max={MAX_AGE} placeholder={String(MIN_AGE)} {...register('minAge')} aria-invalid={!!errors.minAge} />
              </Field>
              <Field label="Age to" htmlFor="maxAge" optional error={errors.maxAge?.message}>
                <Input id="maxAge" type="number" inputMode="numeric" min={MIN_AGE} max={MAX_AGE} placeholder={String(MAX_AGE)} {...register('maxAge')} aria-invalid={!!errors.maxAge} />
              </Field>
            </div>
          </div>
          <div className={cn('flex items-center gap-2 rounded-xl px-4 py-3 text-sm', reach === 0 ? 'bg-amber-50 text-amber-800' : 'bg-brand-50 text-brand-800')} aria-live="polite">
            <Users className="size-4 shrink-0" />
            {!ageValid ? (
              'Fix the age range to see how many people it reaches.'
            ) : reach === undefined ? (
              'Counting people…'
            ) : reach === 0 ? (
              'Nobody matches these filters yet. Try a wider location, gender or age.'
            ) : (
              <span>
                This invitation will reach <b>{pluralize(reach, 'person', 'people')}</b>.
              </span>
            )}
          </div>
          {(minAge || maxAge) && <p className="-mt-3 text-xs text-slate-500">The age filter only includes people who have entered their date of birth.</p>}
        </FormSection>

        <FormSection title="Invitation">
          <Field label="Title" htmlFor="inv-title" error={errors.title?.message}>
            <Input id="inv-title" maxLength={120} placeholder="e.g. Helpers needed this Saturday" {...register('title')} aria-invalid={!!errors.title} />
          </Field>
          <Field label="Message" htmlFor="inv-message" error={errors.message?.message} hint="Up to 500 characters. Say what the work is, when, and how much it pays.">
            <Textarea id="inv-message" rows={4} maxLength={500} {...register('message')} aria-invalid={!!errors.message} />
          </Field>
          <Field label="Link to one of your posts" htmlFor="inv-post" optional error={errors.postId?.message} hint="The message has a button that opens this post so people can apply.">
            <Select id="inv-post" {...register('postId')}>
              <option value="">No post (opens your profile)</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <div className="flex justify-end">
          <Button type="submit" icon={<Send className="size-4" />} disabled={reach === 0} className="min-w-40">
            {reach ? `Send to ${pluralize(reach, 'person', 'people')}` : 'Send invitation'}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={confirmSend}
        loading={send.isPending}
        title="Send this invitation?"
        description={`Everyone who matches your filters (${reach ?? 0}) will get it in their Inbox. This can't be undone.`}
        confirmLabel="Send invitation"
      />
    </form>
  )
}

function audienceLabel(i: Invitation) {
  const parts = [[i.localLevel, i.district, i.province].filter(Boolean).join(', ') || 'All of Nepal']
  if (i.gender) parts.push(i.gender)
  if (i.minAge || i.maxAge) parts.push(`Age ${i.minAge ?? MIN_AGE}–${i.maxAge ?? MAX_AGE}`)
  return parts.join(' · ')
}

function SentInvitations() {
  const sent = useMyInvitations()

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold text-slate-900">Sent invitations</h2>
      {sent.isError ? (
        <Alert>{getErrorMessage(sent.error)}</Alert>
      ) : !sent.data ? (
        <Card className="space-y-3 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </Card>
      ) : sent.data.length === 0 ? (
        <Card>
          <EmptyState icon={<Mail className="size-6" />} title="No invitations yet" description="Invitations you send will be listed here." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {sent.data.map((i) => (
              <li key={i.id} className="flex items-start gap-3 p-4">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{i.title}</p>
                  <p className="line-clamp-2 text-sm text-slate-600">{i.message}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {audienceLabel(i)}
                    {i.postTitle && ` · Post: ${i.postTitle}`}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-500">
                  <p className="font-semibold text-slate-900">{pluralize(i.recipientCount, 'person', 'people')}</p>
                  <p>{timeAgo(i.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}
