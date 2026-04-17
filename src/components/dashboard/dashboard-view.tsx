'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentVisits } from '@/components/dashboard/recent-visits'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Users, Scissors, ArrowRight, Wallet, Zap, Calendar, ClipboardList, ListOrdered } from 'lucide-react'
import { motion } from 'framer-motion'

interface DashboardData {
  totalPatients: number
  todayVisits: number
  monthRevenue: number
  monthExpenseTotal: number
  monthProfit: number
  recentVisits: Array<{
    id: string; date: string; status: string; paid: number
    patient: { name: string }; sessionType?: { name: string } | null
  }>
  alerts: Array<{
    id: string; title: string; message: string; type: string; createdAt: string
    patient?: { name: string } | null
  }>
  revenueChartData: { month: string; revenue: number; expenses: number; profit: number }[]
  upcomingSessions: Array<{
    id: string; date: string
    patient: { name: string; phone: string }
    sessionType?: { name: string } | null
  }>
  pendingPayments: number
  pendingCount: number
  sessionTypeStats: Array<{ name: string; _count: { visits: number } }>
}

export function DashboardView() {
  const { setCurrentView } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Failed to fetch dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    { label: 'حالة جديدة', icon: Users, view: 'patients' as const, color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'زيارة جديدة', icon: CalendarDays, view: 'visits' as const, color: 'bg-teal-500 hover:bg-teal-600' },
    { label: 'جلسة ليزر', icon: Zap, view: 'laser' as const, color: 'bg-orange-500 hover:bg-orange-600' },
    { label: 'وصفة طبية', icon: ClipboardList, view: 'prescriptions' as const, color: 'bg-cyan-500 hover:bg-cyan-600' },
    { label: 'قائمة الانتظار', icon: ListOrdered, view: 'queue' as const, color: 'bg-amber-500 hover:bg-amber-600' },
    { label: 'التقويم', icon: Calendar, view: 'calendar' as const, color: 'bg-indigo-500 hover:bg-indigo-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsCards
        totalPatients={data?.totalPatients || 0}
        todayVisits={data?.todayVisits || 0}
        monthRevenue={data?.monthRevenue || 0}
        monthProfit={data?.monthProfit || 0}
        isLoading={isLoading}
      />

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-3"
      >
        {quickActions.map((action) => (
          <Button
            key={action.view}
            onClick={() => setCurrentView(action.view)}
            className={`${action.color} text-white gap-2 shadow-md`}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </Button>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <RevenueChart data={data?.revenueChartData || []} isLoading={isLoading} />

        {/* Alerts */}
        <AlertsWidget alerts={data?.alerts || []} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visits */}
        <RecentVisits
          visits={data?.recentVisits || []}
          isLoading={isLoading}
          onViewVisit={() => setCurrentView('visits')}
        />

        {/* Upcoming Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">الجلسات القادمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {(data?.upcomingSessions || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد جلسات قادمة</p>
                ) : (
                  data?.upcomingSessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{session.patient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.sessionType?.name || 'جلسة'}
                          {session.patient.phone && ` • ${session.patient.phone}`}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pending Payments & Session Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.pendingCount ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            <Card className="border-amber-200 dark:border-amber-900">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">مدفوعات متأخرة</p>
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {data.pendingPayments.toLocaleString('ar-EG')} ج.م
                    </p>
                    <p className="text-xs text-muted-foreground">{data.pendingCount} حالة</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">أكثر أنواع الجلسات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                {(data?.sessionTypeStats || [])
                  .filter((s) => s._count.visits > 0)
                  .sort((a, b) => b._count.visits - a._count.visits)
                  .slice(0, 5)
                  .map((st) => (
                    <div key={st.name} className="flex items-center justify-between">
                      <span className="text-sm">{st.name}</span>
                      <Badge variant="secondary" className="text-xs">{st._count.visits} جلسة</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
