/**
 * Company selection context.
 *
 * Many API endpoints need `settingId` to scope data to a company.
 * This context loads companies on mount, persists the selection in
 * localStorage, and provides the selected company to all pages.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCompanies } from '@/hooks/use-api'
import type { KsefSetting } from '@/lib/types'

const STORAGE_KEY = 'code-app-selected-company'

interface CompanyContextValue {
  companies: KsefSetting[]
  selectedCompany: KsefSetting | null
  setSelectedCompany: (company: KsefSetting | null) => void
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextValue>({
  companies: [],
  selectedCompany: null,
  setSelectedCompany: () => {},
  isLoading: true,
})

export function CompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useCompanies()
  const [selectedCompany, setSelectedCompanyState] =
    useState<KsefSetting | null>(null)

  const companies = data?.settings ?? []

  // Restore selection from localStorage or auto-select first
  useEffect(() => {
    if (isLoading || companies.length === 0) return

    const savedId = localStorage.getItem(STORAGE_KEY)
    const saved = savedId
      ? companies.find((c) => c.id === savedId)
      : undefined

    if (saved) {
      setSelectedCompanyState(saved)
    } else {
      setSelectedCompanyState(companies[0])
      localStorage.setItem(STORAGE_KEY, companies[0].id)
    }
  }, [isLoading, companies])

  const setSelectedCompany = useCallback(
    (company: KsefSetting | null) => {
      setSelectedCompanyState(company)
      if (company) {
        localStorage.setItem(STORAGE_KEY, company.id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
      // Invalidate all queries so they refetch with new company
      void queryClient.invalidateQueries()
    },
    [queryClient]
  )

  return (
    <CompanyContext.Provider
      value={{ companies, selectedCompany, setSelectedCompany, isLoading }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompanyContext() {
  return useContext(CompanyContext)
}
