'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, GusCompanyData, GusSearchResult } from '@/lib/api'

// ============================================================================
// Types
// ============================================================================

interface UseGusLookupOptions {
  /**
   * Debounce delay in milliseconds before triggering lookup
   * @default 500
   */
  debounceMs?: number
  /**
   * Auto-lookup when NIP reaches 10 digits
   * @default true
   */
  autoLookup?: boolean
  /**
   * Callback when company data is found
   */
  onSuccess?: (data: GusCompanyData) => void
  /**
   * Callback on error
   */
  onError?: (error: string) => void
}

interface UseGusLookupReturn {
  /**
   * Lookup company by NIP
   */
  lookup: (nip: string) => void
  /**
   * Company data if found
   */
  data: GusCompanyData | null
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error message
   */
  error: string | null
  /**
   * Whether the last lookup was successful
   */
  isSuccess: boolean
  /**
   * Clear lookup state
   */
  clear: () => void
  /**
   * Validate NIP format (local validation)
   */
  validateNip: (nip: string) => { valid: boolean; error?: string }
}

interface UseGusSearchOptions {
  /**
   * Debounce delay in milliseconds
   * @default 300
   */
  debounceMs?: number
  /**
   * Minimum query length before searching
   * @default 3
   */
  minQueryLength?: number
  /**
   * Callback when search results are found
   */
  onResults?: (results: GusSearchResult[]) => void
}

interface UseGusSearchReturn {
  /**
   * Search for companies
   */
  search: (query: string) => void
  /**
   * Search results
   */
  results: GusSearchResult[]
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error message
   */
  error: string | null
  /**
   * Total results count
   */
  totalCount: number
  /**
   * Clear search state
   */
  clear: () => void
  /**
   * Current search query
   */
  query: string
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
    return { valid: false, error: undefined } // Empty is not an error yet
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
// useGusLookup Hook
// ============================================================================

/**
 * Hook for looking up company data by NIP from GUS REGON registry
 */
export function useGusLookup(options: UseGusLookupOptions = {}): UseGusLookupReturn {
  const { debounceMs = 500, autoLookup = true, onSuccess, onError } = options
  
  const [data, setData] = useState<GusCompanyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()

  // Lookup mutation
  const lookupMutation = useMutation({
    mutationFn: (nip: string) => api.gus.lookup(nip),
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
      const message = err instanceof Error ? err.message : 'Błąd połączenia z API GUS'
      setData(null)
      setError(message)
      setIsSuccess(false)
      onError?.(message)
    },
  })

  // Validate NIP locally
  const validateNip = useCallback((nip: string) => {
    return validateNipChecksum(nip)
  }, [])

  // Lookup function with optional debounce
  const lookup = useCallback(async (nip: string) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    const cleanNip = nip.replace(/\D/g, '')
    
    // Validate locally first
    const validation = validateNipChecksum(cleanNip)
    if (!validation.valid) {
      if (validation.error) {
        setError(validation.error)
        setIsSuccess(false)
      }
      return
    }

    // Check cache first
    const cached = queryClient.getQueryData<GusCompanyData>(queryKeys.gusLookup(cleanNip))
    if (cached) {
      setData(cached)
      setError(null)
      setIsSuccess(true)
      onSuccess?.(cached)
      return
    }

    // Perform lookup
    lookupMutation.mutate(cleanNip)
  }, [lookupMutation, queryClient, onSuccess])

  // Auto-lookup when NIP reaches 10 digits
  const debouncedLookup = useCallback((nip: string) => {
    const cleanNip = nip.replace(/\D/g, '')
    
    if (cleanNip.length !== 10) {
      return
    }

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      lookup(cleanNip)
    }, debounceMs)
  }, [lookup, debounceMs])

  // Clear state
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setData(null)
    setError(null)
    setIsSuccess(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    lookup: autoLookup ? debouncedLookup : lookup,
    data,
    isLoading: lookupMutation.isPending,
    error,
    isSuccess,
    clear,
    validateNip,
  }
}

// ============================================================================
// useGusSearch Hook
// ============================================================================

/**
 * Hook for searching companies by name in GUS REGON registry
 */
export function useGusSearch(options: UseGusSearchOptions = {}): UseGusSearchReturn {
  const { debounceMs = 300, minQueryLength = 3, onResults } = options
  
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GusSearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: (searchQuery: string) => api.gus.search(searchQuery),
    onSuccess: (response) => {
      if (response.success) {
        setResults(response.results)
        setTotalCount(response.totalCount)
        setError(null)
        onResults?.(response.results)
      } else {
        setResults([])
        setTotalCount(0)
        setError(response.error || 'Błąd wyszukiwania')
      }
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Błąd połączenia z API GUS'
      setResults([])
      setTotalCount(0)
      setError(message)
    },
  })

  // Debounced search function
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    // Clear results if query is too short
    if (searchQuery.length < minQueryLength) {
      setResults([])
      setTotalCount(0)
      setError(null)
      return
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchMutation.mutate(searchQuery)
    }, debounceMs)
  }, [searchMutation, debounceMs, minQueryLength])

  // Clear state
  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setQuery('')
    setResults([])
    setTotalCount(0)
    setError(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return {
    search,
    results,
    isLoading: searchMutation.isPending,
    error,
    totalCount,
    clear,
    query,
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
  /**
   * Tenant NIP to filter suppliers
   */
  tenantNip?: string
  /**
   * Maximum number of recent suppliers
   * @default 10
   */
  limit?: number
  /**
   * Enable automatic fetching
   * @default true
   */
  enabled?: boolean
}

interface UseRecentSuppliersReturn {
  /**
   * List of recent suppliers
   */
  suppliers: RecentSupplier[]
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error message
   */
  error: string | null
  /**
   * Refetch suppliers
   */
  refetch: () => void
  /**
   * Filter suppliers by query
   */
  filter: (query: string) => RecentSupplier[]
}

/**
 * Hook for fetching recent suppliers from invoice history
 */
export function useRecentSuppliers(options: UseRecentSuppliersOptions = {}): UseRecentSuppliersReturn {
  const { tenantNip, limit = 10, enabled = true } = options

  // Fetch invoices to extract unique suppliers
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.recentSuppliers(tenantNip),
    queryFn: async () => {
      // Fetch recent invoices
      const response = await api.invoices.list({
        tenantNip,
        top: 100,
        orderBy: 'invoiceDate',
        orderDirection: 'desc',
      })

      // Extract unique suppliers
      const supplierMap = new Map<string, RecentSupplier>()
      
      for (const invoice of response.invoices) {
        const existing = supplierMap.get(invoice.supplierNip)
        if (existing) {
          existing.invoiceCount++
          if (!existing.lastInvoiceDate || invoice.invoiceDate > existing.lastInvoiceDate) {
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

      // Sort by invoice count and limit
      return Array.from(supplierMap.values())
        .sort((a, b) => b.invoiceCount - a.invoiceCount)
        .slice(0, limit)
    },
    enabled: enabled && !!tenantNip,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Filter suppliers by query
  const filter = useCallback((query: string): RecentSupplier[] => {
    if (!data || !query) return data || []
    
    const lowerQuery = query.toLowerCase()
    return data.filter(supplier => 
      supplier.name.toLowerCase().includes(lowerQuery) ||
      supplier.nip.includes(query.replace(/\D/g, ''))
    )
  }, [data])

  return {
    suppliers: data || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    filter,
  }
}
