'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative, getStatusLabel, getStatusColor, cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface RecentVisitsProps {
  visits: Array<{
    id: string
    date: string
    status: string
    paid: number
    patient: { name: string }
    sessionType?: { name: string } | null
  }>
  isLoading?: boolean
  onViewVisit?: () => void
}

export function RecentVisits({ visits, isLoading, onViewVisit }: RecentVisitsProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold">آخر الزيارات</CardTitle>
        <button onClick={onViewVisit} className="text-xs text-primary hover:underline">
          عرض الكل
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد زيارات حتى الآن</p>
          ) : (
            visits.map((visit, index) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{visit.patient.name}</span>
                    {visit.sessionType && (
                      <span className="text-xs text-muted-foreground truncate">- {visit.sessionType.name}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatRelative(visit.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{visit.paid} ج.م</span>
                  <Badge className={cn('text-[10px] px-2 py-0.5', getStatusColor(visit.status))}>
                    {getStatusLabel(visit.status)}
                  </Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
