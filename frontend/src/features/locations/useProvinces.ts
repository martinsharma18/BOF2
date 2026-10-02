import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Province } from '@/lib/types'

export function useProvinces() {
  return useQuery({
    queryKey: ['provinces'],
    // v=2 skips browser-cached copies from before local levels existed.
    queryFn: async () => (await api.get<Province[]>('/locations/provinces', { params: { v: 2 } })).data,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
