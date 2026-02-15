'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, queryKeys, VatSubjectData } from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

interface UseVatLookupOptions {
  debounceMs?: number
  onSuccess?: (data: VatSubjectData) => void
  onError?: (error: string) => void
}

interface UseVatLookupReturn {
  lookup: (params: { nip?: string; regon?: string }) => void
  data: VatSubjectData | null
  isLoading: boolean
  error: string | null
  isSuccess: boolean
  clear: () => void
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Validate NIP checksum (local validation without API call)
 */
export function validateNipChecksum(nip: string): { valid: boolean; error?: string } {
  const cleanNip = nip.replace(/\D/g, '')

  if (cleanNip.length === 0) {
    return { valid: false, error: undefined }
  }

  if (cleanNip.length !== 10) {
    return { valid: false, error: `NIP musi mieć 10 cyfr (wpisano ${cleanNip.length})` }
  }

  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0

  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNip[i], 10) * weights[i]
  }

  const checksum = sum % 11
  const lastDigit = parseInt(cleanNip[9], 10)

  if (checksum === 10) {
    return { valid: false, error: 'Nieprawidłowy NIP' }
  }

  if (checksum !== lastDigit) {
    return { valid: false, error: 'Nieprawidłowa suma kontrolna NIP' }
  }

  return { valid: true }
}

/**
 * Format NIP for display (XXX-XXX-XX-XX)
 */
export function formatNipDisplay(nip: string): string {
  const cleanNip = nip.replace(/\D/g, '')
  if (cleanNip.length !== 10) return cleanNip
  return `${cleanNip.slice(0, 3)}-${cleanNip.slice(3, 6)}-${cleanNip.slice(6, 8)}-${cleanNip.slice(8)}`
}

// ============================================================================
// useVatLookup Hook
// ============================================================================

/**
 * Hook for looking up subject data by NIP or REGON from the White List VAT
 */
export function useVatLookup(options: UseVatLookupOptions = {}): UseVatLookupReturn {
  const { debounceMs = 400, onSuccess, onError } = options

  const [data, setData] = useState<VatSubjectData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lookupMutation = useMutation({
    mutationFn: (params: { nip?: string; regon?: string }) =>
      api.vat.lookup(params),
    onSuccess: (response) => {
      if (response.success && response.data) {
        setData(response.data)
        setError(null)
        setIsSuccess(true)
        onSuccess?.(response.data)
      } else {
        setData(null)
        setError(response.error || 'Nie znaleziono podmiotu')
        setIsSuccess(false)
        onError?.(response.error || 'Nie znaleziono podmiotu')
      }
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Błąd połączenia z API'
      setData(null)
      setError(message)
      setIsSuccess(false)
      onError?.(message)
    },
  })

  const lookup = useCallback(
    (params: { nip?: string; regon?: string }) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }

      // Validate NIP locally if provided
      if (params.nip) {
        const validation = validateNipChecksum(params.nip)
        if (!validation.valid) {
          if (validation.error) {
            setError(validation.error)
            setIsSuccess(false)
          }
          return
        }
      }

      debounceRef.current = setTimeout(() => {
        lookupMutation.mutate(params)
      }, debounceMs)
    },
    [lookupMutation, debounceMs],
  )

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setData(null)
    setError(null)
    setIsSuccess(false)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    lookup,
    data,
    isLoading: lookupMutation.isPending,
    error,
    isSuccess,
    clear,
  }
}

// ============================================================================
// useRecentSuppliers Hook
// ============================================================================

export interface RecentSupplier {
  nip: string
  name: string
  address?: string
  lastInvoiceDate?: string
  invoiceCount: number
}

interface UseRecentSuppliersOptions {
  tenantNip?: string
  limit?: number
  enabled?: boolean
}

interface UseRecentSuppliersReturn {
  suppliers: RecentSupplier[]
  isLoading: boolean
  error: string | null
  refetch: () => void
  filter: (query: string) => RecentSupplier[]
}

/**
 * Hook for fetching recent suppliers from invoice history
 */
export function useRecentSuppliers(
  options: UseRecentSuppliersOptions = {},
): UseRecentSuppliersReturn {
  const { tenantNip, limit = 10, enabled = true } = options

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.recentSuppliers(tenantNip),
    queryFn: async () => {
      const response = await api.invoices.list({
        tenantNip,
        orderBy: 'invoiceDate',
        orderDirection: 'desc',
      })

      const supplierMap = new Map<string, RecentSupplier>()

      for (const invoice of response.invoices) {
        const existing = supplierMap.get(invoice.supplierNip)
        if (existing) {
          existing.invoiceCount++
          if (
            !existing.lastInvoiceDate ||
            invoice.invoiceDate > existing.lastInvoiceDate
          ) {
            existing.lastInvoiceDate = invoice.invoiceDate
          }
        } else {
          supplierMap.set(invoice.supplierNip, {
            nip: invoice.supplierNip,
            name: invoice.supplierName,
            address: invoice.supplierAddress,
            lastInvoiceDate: invoice.invoiceDate,
            invoiceCount: 1,
          })
        }
      }

      return Array.from(supplierMap.values())
        .sort((a, b) => b.invoiceCount - a.invoiceCount)
        .slice(0, limit)
    },
    enabled: enabled && !!tenantNip,
    staleTime: 5 * 60 * 1000,
  })

  const filter = useCallback(
    (query: string): RecentSupplier[] => {
      if (!data || !query) return data || []

      const lowerQuery = query.toLowerCase()
      return data.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(lowerQuery) ||
          supplier.nip.includes(query.replace(/\D/g, '')),
      )
    },
    [data],
  )

  return {
    suppliers: data || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    filter,
  }
}
