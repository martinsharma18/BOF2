import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { Ad, AdPlacement } from '@/lib/types'
import { APP_NAME } from '@/lib/brand'
import { adFormats } from './formats'

export function useAds(placement: AdPlacement, count = 3) {
  return useQuery({
    queryKey: ['ads', placement, count],
    queryFn: async () => (await api.get<Ad[]>('/ads', { params: { placement, count } })).data,
    staleTime: 5 * 60_000,
  })
}

/**
 * An advertising space. Shows a live ad managed by the admin; when none is running,
 * shows an "Advertise here" placeholder so the space is still sellable.
 */
export function AdSlot({ placement, index = 0, className }: { placement: AdPlacement; index?: number; className?: string }) {
  const { data: ads = [] } = useAds(placement)
  const ad = ads.length ? ads[index % ads.length] : undefined
  const isBanner = placement === 'Banner'

  if (!ad) {
    return (
      <aside
        aria-label="Advertising space"
        className={cn(
          'flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 text-center',
          isBanner ? 'min-h-28 py-6' : 'aspect-square',
          className,
        )}
      >
        <Megaphone className="size-5 text-slate-300" aria-hidden />
        <p className="text-sm font-semibold text-slate-500">Advertise on {APP_NAME}</p>
        <p className="text-xs text-slate-400">Reach people across all 77 districts</p>
      </aside>
    )
  }

  const content = (
    <>
      <img
        src={ad.imageUrl}
        alt=""
        loading="lazy"
        className={cn('w-full bg-slate-100 object-cover', adFormats[placement].aspectClass)}
      />
      <div className="flex items-start justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{ad.title}</p>
          {ad.description && <p className="line-clamp-2 text-xs text-slate-500">{ad.description}</p>}
        </div>
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
          Ad
        </span>
      </div>
    </>
  )

  const shell = cn(
    'group block overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/70 transition',
    ad.linkUrl && 'hover:ring-brand-300',
    className,
  )

  return ad.linkUrl ? (
    <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer sponsored" className={shell} aria-label={`Ad: ${ad.title}`}>
      {content}
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  ) : (
    <aside className={shell} aria-label={`Ad: ${ad.title}`}>
      {content}
    </aside>
  )
}
