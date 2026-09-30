import { useState } from 'react'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, PageSpinner, toast } from '@/components/ui'
import { AdFormDialog } from '@/features/admin/AdFormDialog'
import { useAdminAds, useDeleteAd } from '@/features/admin/api'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Ad } from '@/lib/types'

function adStatus(ad: Ad): { label: string; tone: 'green' | 'slate' | 'amber' } {
  const now = Date.now()
  if (!ad.isActive) return { label: 'Paused', tone: 'slate' }
  if (ad.startsAt && new Date(ad.startsAt).getTime() > now) return { label: 'Scheduled', tone: 'amber' }
  if (ad.endsAt && new Date(ad.endsAt).getTime() <= now) return { label: 'Ended', tone: 'slate' }
  return { label: 'Running', tone: 'green' }
}

export function AdminAdsPage() {
  useDocumentTitle('Ads · Admin')
  const ads = useAdminAds()
  const deleteAd = useDeleteAd()
  const [editing, setEditing] = useState<Ad | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Ad | null>(null)

  const openForm = (ad?: Ad) => {
    setEditing(ad)
    setFormOpen(true)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">Ads rotate randomly in their placement while running.</p>
        <Button icon={<Plus className="size-4" />} onClick={() => openForm()}>
          New ad
        </Button>
      </div>

      {ads.isLoading ? (
        <PageSpinner />
      ) : ads.isError ? (
        <Alert>{getErrorMessage(ads.error)}</Alert>
      ) : !ads.data?.length ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="size-6" />}
            title="No ads yet"
            description="Create an ad to fill the advertising spaces in the feed and sidebar."
            action={<Button onClick={() => openForm()}>Create an ad</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.data.map((ad) => {
            const status = adStatus(ad)
            return (
              <Card key={ad.id} className="overflow-hidden">
                <img src={ad.imageUrl} alt="" className="aspect-[2/1] w-full bg-slate-100 object-contain" />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{ad.title}</p>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {ad.placement} · {ad.startsAt ? formatDate(ad.startsAt) : 'No start'} → {ad.endsAt ? formatDate(ad.endsAt) : 'No end'}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => openForm(ad)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Trash2 className="size-3.5" />} onClick={() => setDeleting(ad)} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {formOpen && <AdFormDialog key={editing?.id ?? 'new'} ad={editing} onClose={() => setFormOpen(false)} />}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          deleteAd.mutate(deleting.id, {
            onSuccess: () => {
              toast.success('Ad deleted')
              setDeleting(null)
            },
            onError: (error) => toast.error(getErrorMessage(error)),
          })
        }
        loading={deleteAd.isPending}
        danger
        title="Delete this ad?"
        description={`"${deleting?.title}" will be removed from all advertising spaces.`}
        confirmLabel="Delete ad"
      />
    </div>
  )
}
