import type { AccountType } from '@/lib/types'
import { Badge } from './Display'

const meta: Record<AccountType, { label: string; tone: 'brand' | 'green' | 'amber' }> = {
  Company: { label: 'Company', tone: 'brand' },
  Individual: { label: 'Individual', tone: 'green' },
  Admin: { label: 'Super Admin', tone: 'amber' },
}

/** Small label saying whether someone is a Company, an Individual or the Super Admin. */
export function AccountTypeBadge({ type, className }: { type: AccountType; className?: string }) {
  return (
    <Badge tone={meta[type].tone} className={className}>
      {meta[type].label}
    </Badge>
  )
}
