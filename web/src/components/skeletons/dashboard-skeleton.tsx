'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Date range filter skeleton */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-40" />
              <span className="text-muted-foreground">—</span>
              <Skeleton className="h-10 w-40" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Bento grid skeleton */}
      <div className="grid grid-cols-12 gap-3">
        {/* Row 1: Hero chart + KPI tiles */}
        <div className="col-span-12 lg:col-span-7 row-span-2">
          <Card className="h-full">
            <CardHeader className="pb-2 pt-4 px-5">
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-3 row-span-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 px-4 pb-3">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-28 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: Three medium tiles */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="col-span-12 md:col-span-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-4">
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Row 3: Suppliers + Forecast */}
        <div className="col-span-12 lg:col-span-7">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <Skeleton className="h-[180px] w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="col-span-12 lg:col-span-5">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <Skeleton className="h-8 w-40 mb-3" />
              <Skeleton className="h-[90px] w-full" />
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Activity feed */}
        <div className="col-span-12">
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4 space-y-3">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16" />
                ))}
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-60" />
                    <Skeleton className="h-2 w-40" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Quick actions */}
        <div className="col-span-12">
          <div className="flex gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-28" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
