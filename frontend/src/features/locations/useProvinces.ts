import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Province } from '@/lib/types'

export function useProvinces() {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => (await api.get<Province[]>('/locations/provinces')).data,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
