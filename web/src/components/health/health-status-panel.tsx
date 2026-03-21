'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { useHealthDetailed } from '@/hooks/use-api'
import { useSelectedCompany } from '@/contexts/company-context'
import { useTranslations } from 'next-intl'

export function HealthStatusPanel() {
  const { selectedCompany } = useSelectedCompany()
  const environment = selectedCompany?.environment
  const { data: health, isLoading, refetch, isFetching } = useHealthDetailed(environment)
  const t = useTranslations('systemStatus')

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusLabel = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    return t(status)
  }

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      healthy: 'default',
      degraded: 'secondary',
      unhealthy: 'destructive',
    }
    return (
      <Badge variant={variants[status]} className="ml-auto">
        {getStatusLabel(status)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('checking')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('cannotConnect')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{t('failedToConnect')}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t('title')}
              {getStatusIcon(health.status)}
            </CardTitle>
            <CardDescription>
              {t('lastChecked', { time: new Date(health.timestamp).toLocaleTimeString() })}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('overallStatus')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('servicesHealthy', { healthy: health.summary.healthy, total: health.summary.total })}
              </p>
            </div>
            {getStatusBadge(health.status)}
          </div>
        </div>

        {/* Individual Services */}
        <div className="space-y-3">
          {health.services.map((service, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(service.status)}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{service.name}</h4>
                    {service.message && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {service.message}
                      </p>
                    )}
                    {service.responseTime !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('responseTime', { ms: service.responseTime })}
                      </p>
                    )}
                    {service.details && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        {Object.entries(service.details).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="font-medium">{key}:</span>
                            <span className="truncate">
                              {typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {getStatusBadge(service.status)}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {health.summary.healthy}
            </div>
            <div className="text-xs text-muted-foreground">{t('healthy')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {health.summary.degraded}
            </div>
            <div className="text-xs text-muted-foreground">{t('degraded')}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {health.summary.unhealthy}
            </div>
            <div className="text-xs text-muted-foreground">{t('unhealthy')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
