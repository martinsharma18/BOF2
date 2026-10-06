import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Alert, Button, Card, Checkbox, Field, FieldError, FormSection, Input, Textarea } from '@/components/ui'
import { LocationFields } from '@/features/locations/LocationFields'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { shrinkImage } from '@/lib/image'
import { cn } from '@/lib/cn'
import { applyServerErrors } from '@/lib/formErrors'
import type { Post } from '@/lib/types'
import { useSavePost } from './api'
import { postOptions, postTypes } from './labels'

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Both', label: 'Both' },
] as const

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const schema = z
  .object({
    type: z.enum(['Type1', 'Type2'], 'Choose a post type'),
    // Type 1 only; required there (see refine below).
    option: z.enum(['A', 'B'], 'Choose option A or B').optional(),
    title: z.string().trim().min(1, 'Give your post a short title').max(120),
    requirement: z.string().trim().min(1, 'Describe what you need').max(4000),
    gender: z.enum(['Male', 'Female', 'Both'], 'Choose Male, Female or Both').optional(),
    contactNumber: z
      .string()
      .trim()
      .min(1, 'Enter a contact number')
      .regex(/^\+?[0-9][0-9\s-]{5,18}$/, 'Enter a valid phone number'),
    // Any number, not necessarily a phone number: digits only.
    witnessContactNumber: z
      .string()
      .trim()
      .min(1, 'Enter a witness contact number')
      .regex(/^[0-9]{1,20}$/, 'Enter numbers only (up to 20 digits)'),
    minimumNumber: z.number('Enter a number').int('Whole numbers only').min(1, 'At least 1').max(10000, 'Too large').optional(),
    maximumPayment: z.number('Enter an amount').min(0, 'Cannot be negative').max(999_999_999, 'Too large'),
    isFromAnywhere: z.boolean(),
    province: z.string(),
    district: z.string(),
    localLevel: z.string(),
  })
  .refine((v) => v.type !== 'Type1' || v.option, { path: ['option'], message: 'Choose option A or B' })
  .refine((v) => v.isFromAnywhere || v.province, { path: ['province'], message: 'Select a province' })
  // Type 2 posts have no gender or number of people.
  .refine((v) => v.type === 'Type2' || v.gender, { path: ['gender'], message: 'Choose Male, Female or Both' })
  .refine((v) => v.type === 'Type2' || v.minimumNumber !== undefined, { path: ['minimumNumber'], message: 'Enter a number' })

type Values = z.infer<typeof schema>
const fieldNames: (keyof Values)[] = [
  'type',
  'option',
  'title',
  'requirement',
  'gender',
  'contactNumber',
  'witnessContactNumber',
  'minimumNumber',
  'maximumPayment',
  'isFromAnywhere',
  'province',
  'district',
  'localLevel',
]

function toDefaults(post?: Post): Partial<Values> {
  if (!post) {
    return { contactNumber: '', witnessContactNumber: '', isFromAnywhere: false, province: '', district: '', localLevel: '', title: '', requirement: '' }
  }
  return {
    type: post.type,
    option: post.option ?? undefined,
    title: post.title,
    requirement: post.requirement,
    gender: post.acceptsMale && post.acceptsFemale ? 'Both' : post.acceptsMale ? 'Male' : 'Female',
    contactNumber: post.contactNumber ?? '',
    witnessContactNumber: post.witnessContactNumber ?? '',
    minimumNumber: post.minimumNumber,
    maximumPayment: post.maximumPayment,
    isFromAnywhere: post.isFromAnywhere,
    province: post.province ?? '',
    district: post.district ?? '',
    localLevel: post.localLevel ?? '',
  }
}

export function PostForm({ post, onSaved }: { post?: Post; onSaved: (post: Post) => void }) {
  const save = useSavePost(post?.id)
  const [formError, setFormError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [removeExisting, setRemoveExisting] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
    // Hidden fields (gender and number of people on Type 2) drop out of the values.
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toDefaults(post), shouldUnregister: true })

  const selectedType = watch('type')
  const isType2 = selectedType === 'Type2'
  const selectedOption = watch('option')
  const selectedGender = watch('gender')
  const isFromAnywhere = watch('isFromAnywhere')
  const clearDistrict = useCallback(() => setValue('district', ''), [setValue])
  const clearLocalLevel = useCallback(() => setValue('localLevel', ''), [setValue])

  const preview = useObjectUrl(file)

  const shownImage = preview ?? (!removeExisting ? post?.mediaUrl : null)

  const pickFile = async (picked: File | undefined) => {
    if (!picked) return
    if (!ACCEPTED_TYPES.includes(picked.type)) return setFileError('Only JPG, PNG, WEBP or GIF images are allowed.')
    // Shrink first: big phone photos usually end up well under the limit.
    const image = await shrinkImage(picked)
    if (image.size > MAX_FILE_BYTES) return setFileError('The image must be 5 MB or smaller.')
    setFileError(null)
    setFile(image)
  }

  const clearImage = () => {
    setFile(null)
    if (post?.mediaUrl) setRemoveExisting(true)
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const form = new FormData()
    form.append('type', values.type)
    if (values.type === 'Type1' && values.option) form.append('option', values.option)
    form.append('title', values.title)
    form.append('requirement', values.requirement)
    if (values.type !== 'Type2') {
      form.append('acceptsMale', String(values.gender !== 'Female'))
      form.append('acceptsFemale', String(values.gender !== 'Male'))
      form.append('minimumNumber', String(values.minimumNumber))
    }
    form.append('contactNumber', values.contactNumber)
    form.append('witnessContactNumber', values.witnessContactNumber)
    form.append('maximumPayment', String(values.maximumPayment))
    form.append('isFromAnywhere', String(values.isFromAnywhere))
    if (!values.isFromAnywhere) {
      form.append('province', values.province)
      if (values.district) form.append('district', values.district)
      if (values.localLevel) form.append('localLevel', values.localLevel)
    }
    if (file) form.append('media', file)
    else if (removeExisting) form.append('removeMedia', 'true')

    try {
      onSaved(await save.mutateAsync(form))
    } catch (error) {
      setFormError(applyServerErrors(error, setError, fieldNames))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert>{formError}</Alert>}

      <Card className="space-y-6 p-5 sm:p-7">
        <FormSection title="Post type">
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {postTypes.map((t) => (
              <label
                key={t.value}
                className={cn(
                  'relative flex cursor-pointer flex-col rounded-xl p-4 ring-1 transition',
                  selectedType === t.value ? 'bg-brand-50/60 ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300',
                )}
              >
                <input type="radio" value={t.value} {...register('type')} className="sr-only" />
                <span className="font-semibold text-slate-900">{t.label}</span>
                <span className="text-xs text-slate-500">{t.description}</span>
                <span
                  className={cn(
                    'absolute top-4 right-4 size-4 rounded-full ring-1',
                    selectedType === t.value ? 'bg-brand-600 ring-4 ring-brand-200' : 'bg-white ring-slate-300',
                  )}
                  aria-hidden
                />
              </label>
            ))}
          </div>
          <FieldError message={errors.type?.message} />

          {selectedType === 'Type1' && (
            <div className="animate-slide-up rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="mb-2.5 text-sm font-semibold text-slate-800">Choose an option</p>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Type 1 option">
                {postOptions.map((o) => (
                  <label
                    key={o.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl bg-white p-3.5 ring-1 transition',
                      selectedOption === o.value ? 'ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300',
                    )}
                  >
                    <input type="radio" value={o.value} {...register('option')} className="size-4 shrink-0 accent-brand-600" />
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900">{o.label}</span>
                      <span className="block text-xs text-slate-500">{o.description}</span>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError message={errors.option?.message} />
            </div>
          )}
        </FormSection>

        <FormSection title="Details">
          <Field label="Title" htmlFor="title" error={errors.title?.message}>
            <Input id="title" maxLength={120} placeholder="e.g. 5 helpers needed for a 3-day event" {...register('title')} aria-invalid={!!errors.title} />
          </Field>
          <Field label="Specific requirement" htmlFor="requirement" error={errors.requirement?.message} hint="Describe the work, timing, skills and anything else people should know.">
            <Textarea id="requirement" rows={6} maxLength={4000} {...register('requirement')} aria-invalid={!!errors.requirement} />
          </Field>
        </FormSection>

        <FormSection title="Image" description="Optional. JPG, PNG, WEBP or GIF up to 5 MB.">
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {shownImage ? (
            <div className="relative overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
              <img src={shownImage} alt="Selected" className="mx-auto max-h-72 object-contain" />
              <div className="absolute top-3 right-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => fileInput.current?.click()}>
                  Change
                </Button>
                <Button size="icon" variant="secondary" onClick={clearImage} aria-label="Remove image" className="size-8">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                void pickFile(e.dataTransfer.files?.[0])
              }}
              className={cn(
                'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition',
                dragging ? 'border-brand-400 bg-brand-50' : 'border-slate-300 hover:border-brand-300 hover:bg-slate-50',
              )}
            >
              <ImagePlus className="size-7 text-brand-500" />
              <span className="text-sm font-semibold text-slate-700">Click to browse or drag an image here</span>
            </button>
          )}
          <FieldError message={fileError ?? undefined} />
        </FormSection>

        <FormSection title={isType2 ? 'Payment and contact' : 'Who you need'}>
          {!isType2 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Gender</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gender">
              {genderOptions.map((g) => (
                <label
                  key={g.value}
                  className={cn(
                    'flex cursor-pointer items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition',
                    selectedGender === g.value ? 'bg-brand-50/60 text-brand-700 ring-2 ring-brand-500' : 'text-slate-700 ring-slate-200 hover:ring-slate-300',
                  )}
                >
                  <input type="radio" value={g.value} {...register('gender')} className="sr-only" />
                  {g.label}
                </label>
              ))}
            </div>
            <FieldError message={errors.gender?.message} />
          </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {!isType2 && (
              <Field label="Minimum number of people" htmlFor="minimumNumber" error={errors.minimumNumber?.message}>
                <Input id="minimumNumber" type="number" inputMode="numeric" min={1} {...register('minimumNumber', { valueAsNumber: true })} aria-invalid={!!errors.minimumNumber} />
              </Field>
            )}
            <Field label="Maximum payment (Rs.)" htmlFor="maximumPayment" error={errors.maximumPayment?.message}>
              <Input id="maximumPayment" type="number" inputMode="decimal" min={0} step="1" {...register('maximumPayment', { valueAsNumber: true })} aria-invalid={!!errors.maximumPayment} />
            </Field>
          </div>
          <Field label="Contact number" htmlFor="contactNumber" error={errors.contactNumber?.message} hint="Phone number people can call about this post.">
            <Input id="contactNumber" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="e.g. 98XXXXXXXX" {...register('contactNumber')} aria-invalid={!!errors.contactNumber} />
          </Field>
          <Field label="Witness contact number" htmlFor="witnessContactNumber" error={errors.witnessContactNumber?.message} hint="Numbers only. A person who can confirm this post is genuine.">
            <Input
              id="witnessContactNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={20}
              placeholder="e.g. 9812345678"
              // Drop anything that isn't a digit as the user types or pastes (runs before the form reads the value).
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, '')
              }}
              {...register('witnessContactNumber')}
              aria-invalid={!!errors.witnessContactNumber}
            />
          </Field>
        </FormSection>

        <FormSection title="From where" description="Pick a province only, a province and district, or narrow it down to one local level.">
          <Checkbox label="From anywhere in Nepal" {...register('isFromAnywhere')} />
          <div className={cn('transition-opacity', isFromAnywhere && 'pointer-events-none opacity-50')}>
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
              disabled={isFromAnywhere}
              errors={isFromAnywhere ? undefined : { province: errors.province?.message, district: errors.district?.message, localLevel: errors.localLevel?.message }}
            />
          </div>
        </FormSection>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting} className="min-w-32">
          {post ? 'Save changes' : 'Publish post'}
        </Button>
      </div>
    </form>
  )
}
