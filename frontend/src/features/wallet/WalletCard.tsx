import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, Banknote, Clock } from 'lucide-react'
import { Button, Card, Skeleton } from '@/components/ui'
import { formatDate, formatMoney } from '@/lib/format'
import { useWallet } from './api'
import { WithdrawDialog } from './WithdrawDialog'

/** Compact wallet for the left sidebar: balance, who paid you, and Cash withdraw. */
export function WalletCard() {
  const wallet = useWallet()
  const [open, setOpen] = useState(false)
  const w = wallet.data

  if (!w)
    return (
      <Card className="space-y-3 p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-full" />
      </Card>
    )

  const pending = w.withdrawals.find((x) => x.status === 'Pending')

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-4 text-white">
        <p className="text-xs font-medium text-brand-100">Wallet balance</p>
        <p className="mt-0.5 font-display text-2xl font-extrabold tabular-nums">{formatMoney(w.balance)}</p>
      </div>

      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Received from</p>
        {w.recentPayments.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">When a company pays you, it shows up here.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {w.recentPayments.slice(0, 3).map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm">
                <ArrowDownLeft className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{p.payer.displayName}</p>
                  <p className="text-[11px] text-slate-500">{formatDate(p.createdAt)}</p>
                </div>
                <span className="font-semibold text-emerald-700 tabular-nums">+{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}

        {pending && (
          <div className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            <p className="flex items-center gap-1.5 font-medium">
              <Clock className="size-3.5" /> {formatMoney(pending.amount)} withdrawal pending
            </p>
            <p className="mt-0.5">You can request another cash withdraw after the admin flags this one Done or Rejected.</p>
          </div>
        )}

        <Button
          variant="accent"
          size="sm"
          className="mt-3 w-full"
          icon={<Banknote className="size-4" />}
          disabled={w.balance < 100 || !!pending}
          title={pending ? 'Wait until your pending withdrawal is paid' : w.balance < 100 ? 'Minimum withdrawal is Rs. 100' : undefined}
          onClick={() => setOpen(true)}
        >
          Cash withdraw
        </Button>
        <Link to="/wallet" className="mt-2 block text-center text-xs font-semibold text-brand-600 hover:underline">
          View history
        </Link>
      </div>

      <WithdrawDialog open={open} onClose={() => setOpen(false)} balance={w.balance} />
    </Card>
  )
}
