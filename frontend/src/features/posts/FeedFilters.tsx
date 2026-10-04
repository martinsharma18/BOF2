import { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { useProvinces } from '@/features/locations/useProvinces'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/cn'
import type { PostFilters, PostType } from '@/lib/types'
import { postTypes } from './labels'

/** Search box, type chips and location filters for the feed. Controlled by the page (URL state). */
export function FeedFilters({ value, onChange }: { value: PostFilters; onChange: (filters: PostFilters) => void }) {
  const { data: provinces = [] } = useProvinces()
  const [search, setSearch] = useState(value.search ?? '')
  const debouncedSearch = useDebouncedValue(search)
  const [showLocation, setShowLocation] = useState(Boolean(value.province))

  // Keep the box in sync when the URL changes elsewhere (e.g. header search).
  useEffect(() => {
    setSearch(value.search ?? '')
  }, [value.search])

  useEffect(() => {
    if ((debouncedSearch || undefined) !== value.search) onChange({ ...value, search: debouncedSearch || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debouncedSearch])

  const province = provinces.find((p) => p.name === value.province)
  const districts = province?.districts ?? []
  const localLevels = (value.district && province?.localLevels?.[value.district]) || []
  const hasFilters = Boolean(value.search || value.type || value.province)

  const typeChip = (type: PostType | undefined, label: string) => (
    <button
      key={label}
      type="button"
      onClick={() => onChange({ ...value, type })}
      aria-pressed={value.type === type}
      className={cn(
        'h-8 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors',
        value.type === type ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <label htmlFor="feed-search" className="sr-only">
            Search posts
          </label>
          <Input
            id="feed-search"
            type="search"
            placeholder="Search posts, companies, people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leading={<Search className="size-4" />}
          />
        </div>
        <Button
          variant={showLocation || value.province ? 'soft' : 'secondary'}
          onClick={() => setShowLocation((v) => !v)}
          aria-expanded={showLocation}
          icon={<SlidersHorizontal className="size-4" />}
        >
          <span className="hidden sm:inline">Location</span>
        </Button>
      </div>

      <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
        {typeChip(undefined, 'All posts')}
        {postTypes.map((t) => typeChip(t.value, t.label))}
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              onChange({})
            }}
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-slate-500 hover:text-slate-800"
          >
            <X className="size-3.5" /> Clear filters
          </button>
        )}
      </div>

      {showLocation && (
        <div className="grid animate-slide-up grid-cols-1 gap-2 sm:grid-cols-3">
          <Select
            aria-label="Province"
            value={value.province ?? ''}
            onChange={(e) => onChange({ ...value, province: e.target.value || undefined, district: undefined, localLevel: undefined })}
          >
            <option value="">All provinces</option>
            {provinces.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="District"
            value={value.district ?? ''}
            disabled={!value.province}
            onChange={(e) => onChange({ ...value, district: e.target.value || undefined, localLevel: undefined })}
          >
            <option value="">{value.province ? 'All districts' : 'Choose a province first'}</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Local level"
            value={value.localLevel ?? ''}
            disabled={!value.district}
            onChange={(e) => onChange({ ...value, localLevel: e.target.value || undefined })}
          >
            <option value="">{value.district ? 'All local levels' : 'Choose a district first'}</option>
            {localLevels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  )
}
