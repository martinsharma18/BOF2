import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Banknote, Wallet as WalletIcon } from 'lucide-react'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '@/components/ui'
import { WithRail } from '@/components/layout/AppShell'
import { withdrawalStatusMeta } from '@/features/applications/labels'
import { useWallet } from '@/features/wallet/api'
import { WithdrawDialog } from '@/features/wallet/WithdrawDialog'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { FeedRail } from './FeedRail'

export function WalletPage() {
  useDocumentTitle('Wallet')
  const wallet = useWallet()
  const [open, setOpen] = useState(false)
  const w = wallet.data
  const pending = w?.withdrawals.some((x) => x.status === 'Pending')

  return (
    <WithRail rail={<FeedRail />}>
      <PageHeader
        title="Wallet"
        description="Money companies pay you lands here. Request a cash withdrawal and the admin sends it to your bank or wallet."
        actions={
          w && (
            <Button variant="accent" icon={<Banknote className="size-4" />} disabled={w.balance < 100 || pending}
              title={pending ? 'You already have a pending withdrawal. Wait until the admin flags it Done or Rejected.' : w.balance < 100 ? 'Minimum withdrawal is Rs. 100' : undefined}
              onClick={() => setOpen(true)}>
              Cash withdraw
            </Button>
          )
        }
      />

      {wallet.isError ? (
        <Alert>{getErrorMessage(wallet.error)}</Alert>
      ) : !w ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Available balance" value={formatMoney(w.balance)} strong />
            <Stat label="Total earned" value={formatMoney(w.totalEarned)} />
            <Stat label="Withdrawn" value={formatMoney(w.totalWithdrawn)} hint={w.pendingWithdrawal > 0 ? `${formatMoney(w.pendingWithdrawal)} pending` : undefined} />
          </div>

          <Section title="Payments received">
            {w.recentPayments.length === 0 ? (
              <EmptyState icon={<WalletIcon className="size-6" />} title="No payments yet" description="Apply to posts. When a company accepts and pays you, the money appears here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {w.recentPayments.map((p) => (
                  <Row
                    key={p.id}
                    icon={<ArrowDownLeft className="size-4 text-emerald-600" />}
                    title={<>Received from {p.payer.displayName}</>}
                    subtitle={
                      <>
                        <Link to={`/posts/${p.postId}`} className="hover:underline">
                          {p.postTitle}
                        </Link>
                        {p.note && ` · ${p.note}`} · {formatDate(p.createdAt)}
                      </>
                    }
                    amount={<span className="text-emerald-700">+{formatMoney(p.amount)}</span>}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Withdrawals">
            {w.withdrawals.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {w.withdrawals.map((x) => (
                  <Row
                    key={x.id}
                    icon={<ArrowUpRight className="size-4 text-slate-500" />}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {x.bankName} · {x.accountNumber}
                        <Badge tone={withdrawalStatusMeta[x.status].tone}>{withdrawalStatusMeta[x.status].label}</Badge>
                      </span>
                    }
                    subtitle={
                      <>
                        {x.accountName} · requested {formatDate(x.createdAt)}
                        {x.adminNote && <span className="block text-slate-600">Admin: {x.adminNote}</span>}
                      </>
                    }
                    amount={<span className="text-slate-900">−{formatMoney(x.amount)}</span>}
                  />
                ))}
              </ul>
            )}
          </Section>

          <WithdrawDialog open={open} onClose={() => setOpen(false)} balance={w.balance} />
        </>
      )}
    </WithRail>
  )
}

function Stat({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <Card className={strong ? 'bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white ring-0' : 'p-5'}>
      <p className={strong ? 'text-sm text-brand-100' : 'text-sm text-slate-500'}>{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-amber-600">{hint}</p>}
    </Card>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="mt-6">
      <h2 className="border-b border-slate-100 px-5 py-3 text-base font-bold">{title}</h2>
      {children}
    </Card>
  )
}

function Row({ icon, title, subtitle, amount }: { icon: ReactNode; title: ReactNode; subtitle: ReactNode; amount: ReactNode }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="text-sm font-bold tabular-nums">{amount}</span>
    </li>
  )
}
