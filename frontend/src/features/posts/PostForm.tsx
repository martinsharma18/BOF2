import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus, X } from 'lucide-react'
import { Alert, Button, Card, Checkbox, Field, FieldError, FormSection, Input, Textarea } from '@/components/ui'
import { LocationFields } from '@/features/locations/LocationFields'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { cn } from '@/lib/cn'
import { applyServerErrors } from '@/lib/formErrors'
import type { Post } from '@/lib/types'
import { useSavePost } from './api'
import { postTypes } from './labels'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const schema = z
  .object({
    type: z.enum(['Type1', 'Type2'], 'Choose a post type'),
    title: z.string().trim().min(1, 'Give your post a short title').max(120),
    requirement: z.string().trim().min(1, 'Describe what you need').max(4000),
    acceptsMale: z.boolean(),
    acceptsFemale: z.boolean(),
    minimumNumber: z.number('Enter a number').int('Whole numbers only').min(1, 'At least 1').max(10000, 'Too large'),
    maximumPayment: z.number('Enter an amount').min(0, 'Cannot be negative').max(999_999_999, 'Too large'),
    isFromAnywhere: z.boolean(),
    province: z.string(),
    district: z.string(),
  })
  .refine((v) => v.acceptsMale || v.acceptsFemale, { path: ['acceptsMale'], message: 'Select Male, Female or both' })
  .refine((v) => v.isFromAnywhere || v.province, { path: ['province'], message: 'Select a province' })
  .refine((v) => v.isFromAnywhere || v.district, { path: ['district'], message: 'Select a district' })

type Values = z.infer<typeof schema>
const fieldNames: (keyof Values)[] = [
  'type',
  'title',
  'requirement',
  'acceptsMale',
  'acceptsFemale',
  'minimumNumber',
  'maximumPayment',
  'isFromAnywhere',
  'province',
  'district',
]

function toDefaults(post?: Post): Partial<Values> {
  if (!post) {
    return { acceptsMale: false, acceptsFemale: false, isFromAnywhere: false, province: '', district: '', title: '', requirement: '' }
  }
  return {
    type: post.type,
    title: post.title,
    requirement: post.requirement,
    acceptsMale: post.acceptsMale,
    acceptsFemale: post.acceptsFemale,
    minimumNumber: post.minimumNumber,
    maximumPayment: post.maximumPayment,
    isFromAnywhere: post.isFromAnywhere,
    province: post.province ?? '',
    district: post.district ?? '',
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
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toDefaults(post) })

  const selectedType = watch('type')
  const isFromAnywhere = watch('isFromAnywhere')
  const clearDistrict = useCallback(() => setValue('district', ''), [setValue])

  const preview = useObjectUrl(file)

  const shownImage = preview ?? (!removeExisting ? post?.mediaUrl : null)

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    if (!ACCEPTED_TYPES.includes(picked.type)) return setFileError('Only JPG, PNG, WEBP or GIF images are allowed.')
    if (picked.size > MAX_FILE_BYTES) return setFileError('The image must be 5 MB or smaller.')
    setFileError(null)
    setFile(picked)
  }

  const clearImage = () => {
    setFile(null)
    if (post?.mediaUrl) setRemoveExisting(true)
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    const form = new FormData()
    form.append('type', values.type)
    form.append('title', values.title)
    form.append('requirement', values.requirement)
    form.append('acceptsMale', String(values.acceptsMale))
    form.append('acceptsFemale', String(values.acceptsFemale))
    form.append('minimumNumber', String(values.minimumNumber))
    form.append('maximumPayment', String(values.maximumPayment))
    form.append('isFromAnywhere', String(values.isFromAnywhere))
    if (!values.isFromAnywhere) {
      form.append('province', values.province)
      form.append('district', values.district)
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
              pickFile(e.target.files?.[0])
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
                pickFile(e.dataTransfer.files?.[0])
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

        <FormSection title="Who you need">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Gender</p>
            <div className="flex gap-6">
              <Checkbox label="Male" {...register('acceptsMale')} />
              <Checkbox label="Female" {...register('acceptsFemale')} />
            </div>
            <FieldError message={errors.acceptsMale?.message} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Minimum number of people" htmlFor="minimumNumber" error={errors.minimumNumber?.message}>
              <Input id="minimumNumber" type="number" inputMode="numeric" min={1} {...register('minimumNumber', { valueAsNumber: true })} aria-invalid={!!errors.minimumNumber} />
            </Field>
            <Field label="Maximum payment (Rs.)" htmlFor="maximumPayment" error={errors.maximumPayment?.message}>
              <Input id="maximumPayment" type="number" inputMode="decimal" min={0} step="1" {...register('maximumPayment', { valueAsNumber: true })} aria-invalid={!!errors.maximumPayment} />
            </Field>
          </div>
        </FormSection>

        <FormSection title="From where" description="Where should people be located?">
          <Checkbox label="From anywhere in Nepal" {...register('isFromAnywhere')} />
          <div className={cn('transition-opacity', isFromAnywhere && 'pointer-events-none opacity-50')}>
            <LocationFields
              province={register('province')}
              district={register('district')}
              selectedProvince={watch('province')}
              onProvinceChanged={clearDistrict}
              disabled={isFromAnywhere}
              errors={isFromAnywhere ? undefined : { province: errors.province?.message, district: errors.district?.message }}
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
