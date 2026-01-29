'use client'

import { Building2, ChevronDown, FileEdit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompanyContext } from '@/contexts/company-context'
import { KsefSetting } from '@/lib/api'
import { cn } from '@/lib/utils'

function getEnvironmentBadge(env: string) {
  switch (env) {
    case 'production':
      return { label: 'Prod', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-600' }
    case 'test':
      return { label: 'Test', variant: 'secondary' as const, className: 'bg-yellow-500 text-yellow-950 hover:bg-yellow-500' }
    case 'demo':
      return { label: 'Demo', variant: 'outline' as const, className: '' }
    default:
      return { label: env, variant: 'outline' as const, className: '' }
  }
}

function CompanyItem({ 
  company, 
  isSelected, 
  onClick 
}: { 
  company: KsefSetting
  isSelected: boolean
  onClick: () => void 
}) {
  const envBadge = getEnvironmentBadge(company.environment)
  const isManualOnly = !company.autoSync && company.environment === 'demo' // Heuristic for manual-only
  
  return (
    <DropdownMenuItem 
      onClick={onClick}
      className={cn(
        'flex items-center justify-between gap-2 cursor-pointer',
        isSelected && 'bg-accent'
      )}
    >
      <div className="flex flex-col min-w-0">
        <span className="font-medium truncate">{company.companyName}</span>
        <span className="text-xs text-muted-foreground">NIP: {company.nip}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {company.autoSync && (
          <span title="Auto-sync włączony">
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
        {isManualOnly && (
          <span title="Tylko faktury ręczne">
            <FileEdit className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
        <Badge variant={envBadge.variant} className={cn('text-[10px] px-1.5 py-0', envBadge.className)}>
          {envBadge.label}
        </Badge>
      </div>
    </DropdownMenuItem>
  )
}

export function CompanySelector() {
  const { selectedCompany, companies, isLoading, setSelectedCompany, hasCompanies } = useCompanyContext()

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="hidden sm:block">
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    )
  }

  if (!hasCompanies) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Building2 className="h-5 w-5" />
        <span className="text-sm hidden sm:inline">Brak firm</span>
      </div>
    )
  }

  const envBadge = selectedCompany ? getEnvironmentBadge(selectedCompany.environment) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 h-auto py-1.5 px-2 max-w-[280px]"
        >
          <Building2 className="h-5 w-5 shrink-0 text-primary" />
          {selectedCompany ? (
            <div className="flex flex-col items-start min-w-0 hidden sm:flex">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate max-w-[160px]">
                  {selectedCompany.companyName}
                </span>
                {envBadge && (
                  <Badge 
                    variant={envBadge.variant} 
                    className={cn('text-[10px] px-1.5 py-0 shrink-0', envBadge.className)}
                  >
                    {envBadge.label}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                NIP: {selectedCompany.nip}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground hidden sm:inline">Wybierz firmę</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wide">
          Wybierz firmę
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <CompanyItem
            key={company.id}
            company={company}
            isSelected={selectedCompany?.id === company.id}
            onClick={() => setSelectedCompany(company)}
          />
        ))}
        {companies.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Brak zarejestrowanych firm.
            <br />
            Przejdź do Ustawień, aby dodać firmę.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
