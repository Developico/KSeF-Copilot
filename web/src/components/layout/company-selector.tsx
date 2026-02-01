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
import { Skeleton } from '@/components/ui/skeleton'
import { useCompanyContext } from '@/contexts/company-context'
import { KsefSetting } from '@/lib/api'
import { cn } from '@/lib/utils'
import { EnvironmentBadge } from './environment-banner'

function CompanyItem({ 
  company, 
  isSelected, 
  onClick 
}: { 
  company: KsefSetting
  isSelected: boolean
  onClick: () => void 
}) {
  // TODO: Uncomment when autoSync feature is implemented
  // const isManualOnly = !company.autoSync && company.environment === 'demo'
  
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
      <div className="flex items-center gap-1.5 shrink-0">
        {/* TODO: Uncomment when autoSync feature is implemented
        {company.autoSync && (
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" title="Auto-sync włączony" />
        )}
        {isManualOnly && (
          <FileEdit className="h-3.5 w-3.5 text-muted-foreground" title="Tylko faktury ręczne" />
        )}
        */}
        <EnvironmentBadge environment={company.environment} size="sm" />
      </div>
    </DropdownMenuItem>
  )
}

interface CompanySelectorProps {
  collapsed?: boolean
  variant?: 'sidebar' | 'header'
}

export function CompanySelector({ collapsed = false, variant = 'sidebar' }: CompanySelectorProps) {
  const { selectedCompany, companies, isLoading, setSelectedCompany, hasCompanies } = useCompanyContext()
  const isHeader = variant === 'header'

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
        <Skeleton className="h-8 w-8 rounded" />
        {!collapsed && !isHeader && (
          <div>
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        )}
        {isHeader && (
          <div>
            <Skeleton className="h-4 w-40 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        )}
      </div>
    )
  }

  if (!hasCompanies) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", collapsed && "justify-center")}>
        <Building2 className="h-5 w-5" />
        {!collapsed && <span className="text-sm">Brak firm</span>}
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "flex items-center gap-2 h-auto py-2 px-3",
            collapsed ? "justify-center" : "justify-start",
            isHeader ? "w-auto" : "w-full"
          )}
          title={collapsed && selectedCompany ? `${selectedCompany.companyName} (${selectedCompany.nip})` : undefined}
        >
          <Building2 className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && selectedCompany && (
            <div className="flex flex-col items-start min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-medium truncate text-left",
                  isHeader ? "text-sm max-w-[180px]" : "text-sm max-w-[120px]"
                )}>
                  {selectedCompany.companyName}
                </span>
                <EnvironmentBadge environment={selectedCompany.environment} size="sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                NIP: {selectedCompany.nip}
              </span>
            </div>
          )}
          {!collapsed && !selectedCompany && (
            <span className="text-sm text-muted-foreground">Wybierz firmę</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align={isHeader ? "start" : (collapsed ? "end" : "start")} 
        side={isHeader ? "bottom" : (collapsed ? "right" : "top")} 
        className="w-[300px]"
      >
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
