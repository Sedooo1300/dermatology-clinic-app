'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatRelative, getAlertTypeLabel } from '@/lib/utils'
import { AlertTriangle, Clock, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'

interface AlertsWidgetProps {
  alerts: Array<{
    id: string
    title: string
    message: string
    type: string
    createdAt: string
    patient?: { name: string } | null
  }>
  isLoading?: boolean
}

export function AlertsWidget({ alerts, isLoading }: AlertsWidgetProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle
      case 'followup': return Clock
      default: return MessageSquare
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">التنبيهات</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد تنبيهات</p>
          ) : (
            alerts.map((alert, index) => {
              const Icon = getIcon(alert.type)
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border',
                    alert.type === 'warning' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20' :
                    alert.type === 'followup' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20' :
                    'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20'
                  )}
                >
                  <Icon className={cn(
                    'w-4 h-4 mt-0.5 shrink-0',
                    alert.type === 'warning' ? 'text-red-500' :
                    alert.type === 'followup' ? 'text-amber-500' : 'text-blue-500'
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{alert.title}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {getAlertTypeLabel(alert.type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                    {alert.patient && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{alert.patient.name}</p>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
