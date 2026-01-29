'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { KsefSetting } from '@/lib/api'
import { useCompanies } from '@/hooks/use-api'

const COOKIE_NAME = 'dvlp-ksef-company'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

interface CompanyContextType {
  selectedCompany: KsefSetting | null
  companies: KsefSetting[]
  isLoading: boolean
  setSelectedCompany: (company: KsefSetting | null) => void
  hasCompanies: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

// Cookie helpers
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string, maxAge: number) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: companies = [], isLoading: companiesLoading } = useCompanies()
  const [selectedCompany, setSelectedCompanyState] = useState<KsefSetting | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize from cookie on mount
  useEffect(() => {
    if (companiesLoading || initialized) return
    
    const savedNip = getCookie(COOKIE_NAME)
    
    if (savedNip && companies.length > 0) {
      // Find company by NIP from cookie
      const savedCompany = companies.find(c => c.nip === savedNip)
      if (savedCompany) {
        setSelectedCompanyState(savedCompany)
      } else {
        // Cookie company doesn't exist anymore, fallback to first
        setSelectedCompanyState(companies[0])
        setCookie(COOKIE_NAME, companies[0].nip, COOKIE_MAX_AGE)
      }
    } else if (companies.length > 0) {
      // No cookie, select first company
      setSelectedCompanyState(companies[0])
      setCookie(COOKIE_NAME, companies[0].nip, COOKIE_MAX_AGE)
    }
    
    setInitialized(true)
  }, [companies, companiesLoading, initialized])

  // Update selected company when companies list changes (e.g., after adding new company)
  useEffect(() => {
    if (!initialized || companiesLoading) return
    
    // If current selection was deleted, select another
    if (selectedCompany && companies.length > 0) {
      const stillExists = companies.find(c => c.id === selectedCompany.id)
      if (!stillExists) {
        const newSelection = companies[0]
        setSelectedCompanyState(newSelection)
        setCookie(COOKIE_NAME, newSelection.nip, COOKIE_MAX_AGE)
        // Invalidate all queries when selection changes due to deletion
        queryClient.invalidateQueries()
      }
    }
    
    // If no selection but companies exist, select first
    if (!selectedCompany && companies.length > 0) {
      setSelectedCompanyState(companies[0])
      setCookie(COOKIE_NAME, companies[0].nip, COOKIE_MAX_AGE)
    }
  }, [companies, companiesLoading, initialized, selectedCompany, queryClient])

  const setSelectedCompany = useCallback((company: KsefSetting | null) => {
    const previousNip = selectedCompany?.nip
    
    setSelectedCompanyState(company)
    
    if (company) {
      setCookie(COOKIE_NAME, company.nip, COOKIE_MAX_AGE)
    } else {
      deleteCookie(COOKIE_NAME)
    }
    
    // Invalidate all queries when company changes to force refetch with new context
    if (previousNip !== company?.nip) {
      queryClient.invalidateQueries()
    }
  }, [selectedCompany?.nip, queryClient])

  const value: CompanyContextType = {
    selectedCompany,
    companies,
    isLoading: companiesLoading || !initialized,
    setSelectedCompany,
    hasCompanies: companies.length > 0,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompanyContext() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider')
  }
  return context
}

// Convenience hook for just getting the selected company
export function useSelectedCompany() {
  const { selectedCompany, isLoading } = useCompanyContext()
  return { selectedCompany, isLoading }
}
