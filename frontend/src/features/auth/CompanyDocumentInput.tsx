import { useRef, useState } from 'react'
import { FileCheck2, FileImage, X } from 'lucide-react'
import { Button, FieldError } from '@/components/ui'
import { useObjectUrl } from '@/hooks/useObjectUrl'
import { cn } from '@/lib/cn'
import { shrinkImage } from '@/lib/image'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png']

/** Photo of the company registration certificate or PAN document (JPG or PNG), checked by admins. */
export function CompanyDocumentInput({
  value,
  onChange,
  error,
}: {
  value: File | null
  onChange: (file: File | null) => void
  error?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const preview = useObjectUrl(value)

  const pick = async (picked: File | undefined) => {
    if (!picked) return
    if (!ACCEPTED_TYPES.includes(picked.type)) return setFileError('Only a JPG or PNG photo is allowed.')
    // Shrink big JPEG camera photos but keep them sharp enough to read. PNGs stay as they are (shrinking would make them WEBP).
    const file = picked.type === 'image/jpeg' ? await shrinkImage(picked, 2400, 0.9) : picked
    if (file.size > MAX_FILE_BYTES) return setFileError('The photo must be 5 MB or smaller.')
    setFileError(null)
    onChange(file)
  }

  const shownError = fileError ?? error

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-slate-700">Registration certificate or PAN document</p>
      <input
        ref={input}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {value && preview ? (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50/60 p-3 ring-1 ring-emerald-200">
          <img src={preview} alt="Selected document" className="size-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <FileCheck2 className="size-4 shrink-0" /> Document added
            </p>
            <p className="truncate text-xs text-slate-500">{value.name}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => input.current?.click()}>
            Change
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onChange(null)} aria-label="Remove document" className="size-8">
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void pick(e.dataTransfer.files?.[0])
          }}
          aria-invalid={!!shownError}
          className={cn(
            'flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 text-center transition',
            dragging ? 'border-brand-400 bg-brand-50' : shownError ? 'border-red-300 bg-red-50/40' : 'border-slate-300 hover:border-brand-300 hover:bg-slate-50',
          )}
        >
          <FileImage className="size-7 text-brand-500" />
          <span className="text-sm font-semibold text-slate-700">Upload a photo of the document</span>
          <span className="text-xs text-slate-500">JPG or PNG, up to 5 MB. Only admins can see it.</span>
        </button>
      )}
      <FieldError message={shownError ?? undefined} />
    </div>
  )
}
