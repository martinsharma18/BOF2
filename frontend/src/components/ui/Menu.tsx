import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/** Small dropdown menu. Closes on outside click, Escape, or selecting an item. */
export function Menu({
  trigger,
  children,
  align = 'right',
  label,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-lg"
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute z-40 mt-2 min-w-52 origin-top animate-pop-in rounded-xl bg-white p-1.5 shadow-pop ring-1 ring-slate-200',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900'

export function MenuItem({
  icon,
  children,
  onClick,
  to,
  danger,
}: {
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  to?: string
  danger?: boolean
}) {
  const className = cn(itemClass, danger && 'text-red-600 hover:bg-red-50 hover:text-red-700')
  if (to)
    return (
      <Link role="menuitem" to={to} className={className}>
        {icon}
        {children}
      </Link>
    )
  return (
    <button role="menuitem" type="button" onClick={onClick} className={className}>
      {icon}
      {children}
    </button>
  )
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-slate-100" role="separator" />
}
