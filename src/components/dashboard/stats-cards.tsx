'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Users, CalendarDays, Bell, Scissors } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardsProps {
  totalPatients: number
  todayVisits: number
  alertsCount: number
  sessionTypesCount: number
  isLoading?: boolean
}

export function StatsCards({ totalPatients, todayVisits, alertsCount, sessionTypesCount, isLoading }: StatsCardsProps) {
  const stats = [
    {
      label: 'إجمالي الحالات',
      value: totalPatients.toLocaleString('ar-EG'),
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: alertsCount > 0 ? '' : '',
    },
    {
      label: 'زيارات اليوم',
      value: todayVisits.toLocaleString('ar-EG'),
      icon: CalendarDays,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'التنبيهات',
      value: alertsCount.toLocaleString('ar-EG'),
      icon: Bell,
      color: alertsCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      bg: alertsCount > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/50',
    },
    {
      label: 'أنواع الجلسات',
      value: sessionTypesCount.toLocaleString('ar-EG'),
      icon: Scissors,
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/30',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                  <stat.icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-lg font-bold text-foreground truncate">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
