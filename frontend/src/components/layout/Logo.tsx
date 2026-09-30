import { Link } from 'react-router-dom'
import { APP_NAME } from '@/lib/brand'
import { cn } from '@/lib/cn'

/** The brand logo. `light` puts it on a white pill so it stays readable on dark backgrounds. */
export function Logo({ to = '/', light, className }: { to?: string; light?: boolean; className?: string }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex shrink-0 items-center', light && 'rounded-xl bg-white px-3 py-1.5', className)}
      aria-label={`${APP_NAME} home`}
    >
      <img src="/logo.png" alt={APP_NAME} width={480} height={197} className="h-8 w-auto sm:h-9" />
    </Link>
  )
}
