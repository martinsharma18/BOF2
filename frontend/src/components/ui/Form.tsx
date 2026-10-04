import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const controlClass = cn(
  'block w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-xs sm:text-sm ring-1 ring-slate-300 ring-inset',
  'placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
  'aria-invalid:ring-red-400 aria-invalid:focus:ring-red-500',
)

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { leading?: ReactNode }>(
  ({ className, leading, ...props }, ref) =>
    leading ? (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leading}</span>
        <input ref={ref} {...props} className={cn(controlClass, 'pl-10', className)} />
      </div>
    ) : (
      <input ref={ref} {...props} className={cn(controlClass, className)} />
    ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} {...props} className={cn(controlClass, 'min-h-20 resize-y', className)} />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} {...props} className={cn(controlClass, 'appearance-none pr-9', className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  ),
)
Select.displayName = 'Select'

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }>(
  ({ label, className, id, ...props }, ref) => {
    const autoId = useId()
    const inputId = id ?? autoId
    return (
      <label htmlFor={inputId} className={cn('inline-flex cursor-pointer items-center gap-2.5 text-sm text-slate-700', className)}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          {...props}
          className="size-4 rounded border-slate-300 accent-brand-600"
        />
        {label}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'

export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  error?: string
  hint?: ReactNode
  optional?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
      {message}
    </p>
  )
}

/** A titled group of fields inside a form card. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}
