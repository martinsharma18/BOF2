import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/**
 * Accessible modal built on the native <dialog> element (focus trap and Esc handled by the browser).
 * On phones it opens as a bottom sheet so the content and buttons sit under the thumb.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  tall,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Fill most of the phone screen (chats), so the input stays at the bottom. */
  tall?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'bg-white p-0 shadow-pop backdrop:bg-slate-900/40 backdrop:backdrop-blur-[2px]',
        // Phone: bottom sheet. Larger screens: centred card.
        'max-sm:mx-0 max-sm:mt-auto max-sm:mb-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-t-2xl max-sm:open:animate-sheet-up',
        'sm:m-auto sm:w-[calc(100%-2rem)] sm:rounded-2xl sm:open:animate-pop-in',
        { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size],
      )}
    >
      {open && (
        <div className={cn('flex max-h-[92dvh] flex-col sm:max-h-[85dvh]', tall && 'max-sm:h-[92dvh]')}>
          {/* Grab handle: tells phone users this is a sheet. */}
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="-mr-2 size-10 sm:size-9">
              <X className="size-5" />
            </Button>
          </div>
          {children && (
            <div className={cn('flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5', !footer && 'pb-[max(1rem,env(safe-area-inset-bottom))]')}>
              {children}
            </div>
          )}
          {footer && (
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:*:flex-1 sm:px-6">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  danger,
  loading,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
