import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileImage, Search, Users } from 'lucide-react'
import { Alert, Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Select, Spinner, toast } from '@/components/ui'
import { useAdminUsers, useSetUserDisabled } from '@/features/admin/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { AccountType, AdminUser } from '@/lib/types'

export function AdminUsersPage() {
  useDocumentTitle('Users · Admin')
  const [search, setSearch] = useState('')
  const [accountType, setAccountType] = useState<AccountType | ''>('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<AdminUser | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const users = useAdminUsers({ search: debouncedSearch || undefined, accountType: accountType || undefined, page })
  const setDisabled = useSetUserDisabled()
  const data = users.data
  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1

  const toggle = () => {
    if (!target) return
    const disabled = !target.isDisabled
    setDisabled.mutate(
      { id: target.id, disabled },
      {
        onSuccess: () => {
          toast.success(disabled ? 'Account disabled' : 'Account enabled')
          setTarget(null)
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
        <div className="flex-1">
          <Input
            type="search"
            aria-label="Search users"
            placeholder="Search name, email, phone or company…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            leading={<Search className="size-4" />}
          />
        </div>
        <Select
          aria-label="Account type"
          value={accountType}
          onChange={(e) => {
            setAccountType(e.target.value as AccountType | '')
            setPage(1)
          }}
          className="sm:w-48"
        >
          <option value="">All account types</option>
          <option value="Company">Companies</option>
          <option value="Individual">Individuals</option>
          <option value="Admin">Admins</option>
        </Select>
      </div>

      {users.isError ? (
        <div className="p-4">
          <Alert>{getErrorMessage(users.error)}</Alert>
        </div>
      ) : !data ? (
        <div className="flex justify-center py-16 text-brand-500">
          <Spinner />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title="No users match" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="hidden px-4 py-3 md:table-cell">Phone</th>
                <th className="hidden px-4 py-3 sm:table-cell">Posts</th>
                <th className="hidden px-4 py-3 lg:table-cell">Joined</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((u) => {
                const name = u.companyName ?? u.fullName
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/u/${u.id}`} className="flex items-center gap-3">
                        <Avatar name={name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 hover:underline">{name}</p>
                          <p className="truncate text-xs text-slate-500">{u.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.accountType === 'Company' ? 'brand' : u.accountType === 'Admin' ? 'amber' : 'green'}>
                        {u.accountType}
                      </Badge>
                      {u.accountType === 'Company' &&
                        (u.registrationDocumentUrl ? (
                          <a
                            href={u.registrationDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-brand-600 hover:text-brand-700 hover:underline"
                          >
                            <FileImage className="size-3.5" /> View document
                          </a>
                        ) : (
                          <p className="mt-1.5 text-xs whitespace-nowrap text-slate-400">No document</p>
                        ))}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{u.phoneNumber ?? '—'}</td>
                    <td className="hidden px-4 py-3 text-slate-600 tabular-nums sm:table-cell">{u.postCount}</td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {u.isDisabled ? <Badge tone="red">Disabled</Badge> : <Badge tone="green">Active</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.accountType !== 'Admin' && (
                        <Button size="sm" variant={u.isDisabled ? 'soft' : 'secondary'} onClick={() => setTarget(u)}>
                          {u.isDisabled ? 'Enable' : 'Disable'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.totalCount > data.pageSize && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} · {data.totalCount} users
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={toggle}
        loading={setDisabled.isPending}
        danger={!target?.isDisabled}
        title={target?.isDisabled ? 'Enable this account?' : 'Disable this account?'}
        description={
          target?.isDisabled
            ? `${target.fullName} will be able to log in again.`
            : `${target?.fullName} will be signed out and won't be able to log in. Their posts stay visible.`
        }
        confirmLabel={target?.isDisabled ? 'Enable account' : 'Disable account'}
      />
    </Card>
  )
}
