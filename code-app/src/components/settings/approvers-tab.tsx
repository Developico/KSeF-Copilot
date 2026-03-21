import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { useApproverOverview } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'

export function ApproversTab() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const { data, isLoading, error } = useApproverOverview(selectedCompany?.id)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'settings.approversOverview.loadError' })}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data?.configured) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">
            {intl.formatMessage({ id: 'settings.approversOverview.notConfigured' })}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {intl.formatMessage({ id: 'settings.approversOverview.title' })}
        </CardTitle>
        <CardDescription>
          {intl.formatMessage(
            { id: 'settings.approversOverview.description' },
            { count: String(data.count) },
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.members.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {intl.formatMessage({ id: 'settings.approversOverview.noMembers' })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'settings.approversOverview.name' })}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'settings.approversOverview.email' })}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'settings.approversOverview.dataverseAccount' })}
                  </th>
                  <th className="text-left p-3 font-medium">
                    {intl.formatMessage({ id: 'settings.approversOverview.mpkCenters' })}
                  </th>
                  <th className="text-right p-3 font-medium">
                    {intl.formatMessage({ id: 'settings.approversOverview.supplierAssignments' })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.members.map((member) => (
                  <tr key={member.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{member.displayName || '—'}</td>
                    <td className="p-3 text-muted-foreground">{member.email || '—'}</td>
                    <td className="p-3">
                      {member.hasDataverseAccount ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {intl.formatMessage({ id: 'settings.approversOverview.linked' })}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                          <X className="mr-1 h-3 w-3" />
                          {intl.formatMessage({ id: 'settings.approversOverview.notLinked' })}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {member.mpkCenterNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.mpkCenterNames.map((name) => (
                            <Badge key={name} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">{member.supplierCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
