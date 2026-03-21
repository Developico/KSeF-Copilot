'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldCheck, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useContextApproverOverview } from '@/hooks/use-api'

/**
 * Read-only Approvers tab in Settings.
 * Shows Entra group members and their MPK / supplier assignments.
 */
export function ApproversTab() {
  const t = useTranslations('settings.approvers')
  const { data, isLoading, error } = useContextApproverOverview()

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
          <p className="text-muted-foreground">{t('loadError')}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data?.configured) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t('notConfigured')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {t('title')}
        </CardTitle>
        <CardDescription>
          {t('description', { count: String(data.count) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.members.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {t('noMembers')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('dataverseAccount')}</TableHead>
                <TableHead>{t('mpkCenters')}</TableHead>
                <TableHead className="text-right">{t('supplierAssignments')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.displayName || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{member.email || '—'}</TableCell>
                  <TableCell>
                    {member.hasDataverseAccount ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {t('linked')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <XCircle className="mr-1 h-3 w-3" />
                        {t('notLinked')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {member.supplierCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
