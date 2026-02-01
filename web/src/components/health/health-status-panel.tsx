'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { useHealthDetailed } from '@/hooks/use-api'
import { useSelectedCompany } from '@/contexts/company-context'

export function HealthStatusPanel() {
  const { selectedCompany } = useSelectedCompany()
  const environment = selectedCompany?.environment
  const { data: health, isLoading, refetch, isFetching } = useHealthDetailed(environment)

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

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      healthy: 'default',
      degraded: 'secondary',
      unhealthy: 'destructive',
    }
    const labels = {
      healthy: 'Healthy',
      degraded: 'Degraded',
      unhealthy: 'Unhealthy',
    }
    return (
      <Badge variant={variants[status]} className="ml-auto">
        {labels[status]}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Checking system health...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Unable to fetch system health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Failed to connect to health endpoint</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
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
              System Status
              {getStatusIcon(health.status)}
            </CardTitle>
            <CardDescription>
              Last checked: {new Date(health.timestamp).toLocaleTimeString()}
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
              <h3 className="font-semibold">Overall Status</h3>
              <p className="text-sm text-muted-foreground">
                {health.summary.healthy} of {health.summary.total} services healthy
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
                        Response time: {service.responseTime}ms
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
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {health.summary.degraded}
            </div>
            <div className="text-xs text-muted-foreground">Degraded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {health.summary.unhealthy}
            </div>
            <div className="text-xs text-muted-foreground">Unhealthy</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
