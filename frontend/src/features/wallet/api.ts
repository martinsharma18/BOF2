import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { PagedResult, Wallet, Withdrawal, WithdrawalStatus } from '@/lib/types'

export const walletKeys = {
  all: ['wallet'] as const,
  mine: ['wallet', 'mine'] as const,
  admin: (params: object) => ['wallet', 'admin', params] as const,
}

export function useWallet(enabled = true) {
  return useQuery({
    queryKey: walletKeys.mine,
    queryFn: async () => (await api.get<Wallet>('/wallet')).data,
    enabled,
  })
}

export interface WithdrawPayload {
  amount: number
  bankName: string
  accountName: string
  accountNumber: string
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: WithdrawPayload) => (await api.post<Withdrawal>('/wallet/withdrawals', payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: walletKeys.mine }),
  })
}

export function useAdminWithdrawals(params: { status?: WithdrawalStatus; page: number }) {
  return useQuery({
    queryKey: walletKeys.admin(params),
    queryFn: async () =>
      (await api.get<PagedResult<Withdrawal>>('/admin/withdrawals', { params: { ...params, pageSize: 20 } })).data,
    placeholderData: keepPreviousData,
  })
}

export function useProcessWithdrawal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: WithdrawalStatus; note?: string }) =>
      (await api.put<Withdrawal>(`/admin/withdrawals/${id}`, { status, note })).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      return queryClient.invalidateQueries({ queryKey: walletKeys.all })
    },
  })
}
