import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ImagePlus } from 'lucide-react'
import { Alert, Button, Checkbox, Dialog, Field, FieldError, Input, Select, Textarea, toast } from '@/components/ui'
import { optionalUrl } from '@/features/auth/schemas'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { applyServerErrors } from '@/lib/formErrors'
import type { Ad } from '@/lib/types'
import { useSaveAd } from './api'

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(100),
    description: z.string().max(300),
    linkUrl: optionalUrl,
    placement: z.enum(['Banner', 'Sidebar']),
    isActive: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt > v.startsAt, { path: ['endsAt'], message: 'Must be after the start date' })
type Values = z.infer<typeof schema>
const fields = ['title', 'description', 'linkUrl', 'placement', 'isActive', 'startsAt', 'endsAt']

/** yyyy-mm-dd for <input type="date">. */
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')

/** Mount only while open (with a key per ad) so the form starts from the ad's current values. */
export function AdFormDialog({ ad, onClose }: { ad?: Ad; onClose: () => void }) {
  const save = useSaveAd(ad?.id)
  const [file, setFile] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: ad?.title ?? '',
      description: ad?.description ?? '',
      linkUrl: ad?.linkUrl ?? '',
      placement: ad?.placement ?? 'Sidebar',
      isActive: ad?.isActive ?? true,
      startsAt: toDateInput(ad?.startsAt ?? null),
      endsAt: toDateInput(ad?.endsAt ?? null),
    },
  })
  const preview = useObjectUrl(file)

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    if (!ad && !file) return setImageError('An image is required.')

    const form = new FormData()
    form.append('title', values.title)
    form.append('description', values.description)
    form.append('linkUrl', values.linkUrl)
    form.append('placement', values.placement)
    form.append('isActive', String(values.isActive))
    if (values.startsAt) form.append('startsAt', new Date(values.startsAt).toISOString())
    if (values.endsAt) form.append('endsAt', new Date(values.endsAt).toISOString())
    if (file) form.append('image', file)

    try {
      await save.mutateAsync(form)
      toast.success(ad ? 'Ad updated' : 'Ad created')
      onClose()
    } catch (error) {
      setFormError(applyServerErrors(error, setError, fields))
    }
  })

  const image = preview ?? ad?.imageUrl

  return (
    <Dialog
      open
      onClose={onClose}
      title={ad ? 'Edit ad' : 'New ad'}
      description="Ads appear in the advertising spaces across the feed."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="ad-form" loading={isSubmitting}>
            {ad ? 'Save changes' : 'Create ad'}
          </Button>
        </>
      }
    >
      <form id="ad-form" onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}

        <div>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-brand-300"
          >
            {image ? (
              <img src={image} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-sm font-semibold text-slate-500">
                <ImagePlus className="size-6 text-brand-500" /> Upload ad image
              </span>
            )}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const picked = e.target.files?.[0]
              e.target.value = ''
              if (!picked) return
              if (picked.size > 5 * 1024 * 1024) return setImageError('The image must be 5 MB or smaller.')
              setImageError(null)
              setFile(picked)
            }}
          />
          <FieldError message={imageError ?? errors.root?.message} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="ad-title" error={errors.title?.message}>
            <Input id="ad-title" {...register('title')} aria-invalid={!!errors.title} />
          </Field>
          <Field label="Placement" htmlFor="ad-placement">
            <Select id="ad-placement" {...register('placement')}>
              <option value="Sidebar">Sidebar (tall)</option>
              <option value="Banner">Banner (between posts)</option>
            </Select>
          </Field>
        </div>
        <Field label="Description" htmlFor="ad-description" optional error={errors.description?.message}>
          <Textarea id="ad-description" rows={2} maxLength={300} {...register('description')} />
        </Field>
        <Field label="Link" htmlFor="ad-link" optional error={errors.linkUrl?.message}>
          <Input id="ad-link" type="url" placeholder="https://" {...register('linkUrl')} aria-invalid={!!errors.linkUrl} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Starts" htmlFor="ad-starts" optional>
            <Input id="ad-starts" type="date" {...register('startsAt')} />
          </Field>
          <Field label="Ends" htmlFor="ad-ends" optional error={errors.endsAt?.message}>
            <Input id="ad-ends" type="date" {...register('endsAt')} aria-invalid={!!errors.endsAt} />
          </Field>
        </div>
        <Checkbox label="Active" {...register('isActive')} />
      </form>
    </Dialog>
  )
}
