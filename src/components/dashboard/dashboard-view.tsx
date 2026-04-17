'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentVisits } from '@/components/dashboard/recent-visits'
import { AlertsWidget } from '@/components/dashboard/alerts-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Users, Scissors, ArrowRight, Zap, Calendar, ClipboardList, ListOrdered, Clock, TrendingUp, TrendingDown, Activity, Bell } from 'lucide-react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

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
  sessionTypeStats: Array<{ name: string; _count: { visits: number }; isActive?: boolean; price?: number }>
  weeklyPrediction: {
    avgPerDay: number
    daysElapsed: number
    daysRemaining: number
    totalSoFar: number
    predictedRestOfWeek: number
    predictedTotal: number
  }
  commonDiagnoses: Array<{ condition: string; count: number }>
  expiringPackages: Array<{
    id: string; patientId: string; patientName: string; packageType: string
    totalSessions: number; usedSessions: number; remainingSessions: number
    expiryDate: string; status: string
  }>
  patientsNotFollowing: Array<{
    id: string; name: string; phone: string; lastVisit: string
  }>
  monthlyComparison: {
    thisMonthPatients: number
    lastMonthPatients: number
    thisMonthRevenue: number
    lastMonthRevenue: number
  }
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

  const activeSessionTypes = (data?.sessionTypeStats || []).filter(s => s.isActive !== false)
  const alertsCount = data?.alerts?.length || 0

  return (
    <div className="space-y-6">
      {/* Stats Cards - No Financial Data */}
      <StatsCards
        totalPatients={data?.totalPatients || 0}
        todayVisits={data?.todayVisits || 0}
        alertsCount={alertsCount}
        sessionTypesCount={activeSessionTypes.length}
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

      {/* First Row: Alerts + Session Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Widget */}
        <AlertsWidget alerts={data?.alerts || []} isLoading={isLoading} />

        {/* Session Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                    <Scissors className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  أنواع الجلسات
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentView('session-types')}
                >
                  الكل
                  <ArrowRight className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {activeSessionTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد أنواع جلسات بعد</p>
                ) : (
                  activeSessionTypes
                    .filter((s) => s._count.visits > 0)
                    .sort((a, b) => b._count.visits - a._count.visits)
                    .slice(0, 6)
                    .map((st, index) => {
                      const maxVisits = Math.max(...activeSessionTypes.filter(s => s._count.visits > 0).map(s => s._count.visits), 1)
                      const percentage = Math.round((st._count.visits / maxVisits) * 100)
                      return (
                        <motion.div
                          key={st.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.05 }}
                          className="space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{st.name}</span>
                            <Badge variant="secondary" className="text-xs">{st._count.visits} جلسة</Badge>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ delay: 0.5 + index * 0.05, duration: 0.5, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-l from-teal-500 to-emerald-500 rounded-full"
                            />
                          </div>
                        </motion.div>
                      )
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row: Recent Visits + Upcoming Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  الجلسات القادمة
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentView('calendar')}
                >
                  التقاويم
                  <ArrowRight className="w-3 h-3 mr-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
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
                      <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{session.patient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.sessionType?.name || 'جلسة'}
                          {session.patient.phone && ` • ${session.patient.phone}`}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Third Row: Weekly Prediction + Monthly Patient Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Prediction */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="border-teal-200 dark:border-teal-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                </div>
                <CardTitle className="text-base font-bold">توقعات الأسبوع</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20">
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                    {data?.weeklyPrediction?.totalSoFar ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">زيارات فعلية</p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {data?.weeklyPrediction?.predictedRestOfWeek ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">زيارات متوقعة</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {data?.weeklyPrediction?.predictedTotal ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي متوقع</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">متوسط الزيارات يومياً</span>
                <span className="font-semibold">{data?.weeklyPrediction?.avgPerDay ?? 0} زيارة</span>
              </div>
              <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">الأيام المتبقية</span>
                <span className="font-semibold">{data?.weeklyPrediction?.daysRemaining ?? 0} يوم</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Comparison - Patients Only */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="border-violet-200 dark:border-violet-900">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <CardTitle className="text-base font-bold">مقارنة الأشهر</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">المرضى</span>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const mc = data?.monthlyComparison
                      const diff = mc ? mc.thisMonthPatients - mc.lastMonthPatients : 0
                      const pct = mc && mc.lastMonthPatients > 0 ? Math.round((diff / mc.lastMonthPatients) * 100) : 0
                      return diff >= 0 ? (
                        <Badge variant="default" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {pct > 0 ? `+${pct}%` : '0%'}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
                          <TrendingDown className="w-3 h-3" />
                          {pct}%
                        </Badge>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">الشهر الحالي</p>
                    <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                      {data?.monthlyComparison?.thisMonthPatients ?? 0}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-sm">vs</div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">الشهر السابق</p>
                    <p className="text-lg font-bold">
                      {data?.monthlyComparison?.lastMonthPatients ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t dark:border-muted" />

              {/* Today's Visits Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">زيارات اليوم</span>
                  <Badge variant="default" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                    <CalendarDays className="w-3 h-3" />
                    {data?.todayVisits ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">إجمالي الحالات</p>
                    <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                      {data?.totalPatients ?? 0}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">التنبيهات النشطة</p>
                    <p className="text-lg font-bold text-red-500 dark:text-red-400">
                      {data?.alerts?.length ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Common Diagnoses Chart */}
      {(data?.commonDiagnoses && data.commonDiagnoses.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <CardTitle className="text-base font-bold">أكثر التشخيصات شيوعاً</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.commonDiagnoses}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="condition"
                      >
                        {data.commonDiagnoses.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={['#0d9488', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'][index % 5]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {data.commonDiagnoses.map((diagnosis, index) => {
                    const total = data.commonDiagnoses.reduce((s, d) => s + d.count, 0)
                    const pct = total > 0 ? Math.round((diagnosis.count / total) * 100) : 0
                    return (
                      <div key={diagnosis.condition} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ['#0d9488', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6'][index % 5] }}
                        />
                        <span className="text-sm flex-1 truncate">{diagnosis.condition}</span>
                        <Badge variant="secondary" className="text-xs">{diagnosis.count}</Badge>
                        <span className="text-xs text-muted-foreground w-10 text-left">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Smart Alerts Panel: Patients Not Following + Expiring Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patients Not Following Up */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 }}>
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </div>
                  <CardTitle className="text-base font-bold">مرضى لم يتابعوا</CardTitle>
                </div>
                {data?.patientsNotFollowing && data.patientsNotFollowing.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{data.patientsNotFollowing.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(!data?.patientsNotFollowing || data.patientsNotFollowing.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا يوجد مرضى متأخرين عن المتابعة</p>
                ) : (
                  data.patientsNotFollowing.map((patient, index) => (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + index * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-4 h-4 text-red-500 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{patient.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          آخر زيارة: {new Date(patient.lastVisit).toLocaleDateString('ar-EG')}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Expiring Laser Packages */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-base font-bold">باقات ليزر تنتهي قريباً</CardTitle>
                </div>
                {data?.expiringPackages && data.expiringPackages.length > 0 && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs">
                    {data.expiringPackages.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {(!data?.expiringPackages || data.expiringPackages.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-6">لا توجد باقات تنتهي قريباً</p>
                ) : (
                  data.expiringPackages.map((pkg, index) => {
                    const daysUntilExpiry = Math.ceil(
                      (new Date(pkg.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <motion.div
                        key={pkg.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.95 + index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                          <Zap className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{pkg.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {pkg.packageType} • متبقي {pkg.remainingSessions} جلسة
                          </p>
                        </div>
                        <Badge
                          variant="destructive"
                          className={`text-xs flex-shrink-0 ${daysUntilExpiry > 7 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}`}
                        >
                          {daysUntilExpiry === 0 ? 'اليوم' : `${daysUntilExpiry} يوم`}
                        </Badge>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
