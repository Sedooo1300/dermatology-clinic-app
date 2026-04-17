'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, RefreshCw, DollarSign, Wallet, Percent,
  Users, CreditCard, AlertCircle, CalendarDays, FileBarChart,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Types ──────────────────────────────────────────────────────────────

interface Summary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  totalVisits: number
  uniquePatients: number
  avgRevenuePerVisit: number
  avgRevenuePerPatient: number
  pendingPayments: number
  pendingCount: number
}

interface RevenueByType {
  sessionTypeId: string
  sessionTypeName: string
  totalRevenue: number
  totalVisits: number
  avgPerVisit: number
  percentage: number
}

interface MonthlyTrend {
  month: string
  monthIndex: number
  revenue: number
  expenses: number
  profit: number
  visits: number
  patients: number
}

interface TopPatient {
  patientId: string
  patientName: string
  totalSpent: number
  visitCount: number
  avgPerVisit: number
  lastVisit: string
}

interface ExpenseCategory {
  category: string
  total: number
  count: number
  percentage: number
}

interface DailyRevenue {
  date: string
  revenue: number
  visits: number
}

interface SessionPopularity {
  name: string
  count: number
  revenue: number
}

interface DayOfWeek {
  day: string
  dayIndex: number
  avgRevenue: number
  avgVisits: number
  totalRevenue: number
}

interface FinancialData {
  summary: Summary
  revenueByType: RevenueByType[]
  monthlyTrend: MonthlyTrend[]
  topPatients: TopPatient[]
  expenseByCategory: ExpenseCategory[]
  dailyRevenue: DailyRevenue[]
  sessionPopularity: SessionPopularity[]
  revenueByDayOfWeek: DayOfWeek[]
}

// ── Constants ──────────────────────────────────────────────────────────

const PIE_COLORS = ['#0d9488', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316']

const PERIODS = [
  { value: 'month', label: 'الشهر' },
  { value: 'quarter', label: '3 شهور' },
  { value: '6months', label: '6 شهور' },
  { value: 'year', label: 'سنة' },
]

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

// ── Custom Tooltip ─────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

function SimpleTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────

export function ReportsView() {
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState<FinancialData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/reports/financial?period=${period}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('خطأ في جلب بيانات التقارير المالية')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = () => {
    fetchData()
    toast.success('تم تحديث البيانات')
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        {...fadeInUp}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" />
            التقارير المالية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">تحليل شامل للإيرادات والمصروفات والأداء المالي</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v)}>
            <TabsList className="h-9">
              {PERIODS.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="text-xs px-3">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KPICard
              title="إجمالي الإيرادات"
              value={formatCurrency(data.summary.totalRevenue)}
              icon={<DollarSign className="w-5 h-5" />}
              color="emerald"
              index={0}
            />
            <KPICard
              title="إجمالي المصروفات"
              value={formatCurrency(data.summary.totalExpenses)}
              icon={<Wallet className="w-5 h-5" />}
              color="red"
              index={1}
            />
            <KPICard
              title="صافي الربح"
              value={formatCurrency(data.summary.netProfit)}
              icon={data.summary.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              color={data.summary.netProfit >= 0 ? 'emerald' : 'red'}
              index={2}
            />
            <KPICard
              title="هامش الربح"
              value={`${data.summary.profitMargin.toFixed(1)}%`}
              icon={<Percent className="w-5 h-5" />}
              color="purple"
              index={3}
            />
            <KPICard
              title="متوسط الإيراد/زيارة"
              value={formatCurrency(data.summary.avgRevenuePerVisit)}
              icon={<CreditCard className="w-5 h-5" />}
              color="amber"
              index={4}
            />
            <KPICard
              title="المدفوعات المعلقة"
              value={formatCurrency(data.summary.pendingPayments)}
              subtitle={`${data.summary.pendingCount} معاملة`}
              icon={<AlertCircle className="w-5 h-5" />}
              color="orange"
              index={5}
            />
          </div>

          {/* Secondary stats */}
          <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.2 }}>
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-none bg-muted/50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                    <CalendarDays className="w-4 h-4" />
                    <span className="text-xs">إجمالي الزيارات</span>
                  </div>
                  <p className="text-xl font-bold">{data.summary.totalVisits}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-muted/50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">المرضى الفريدين</span>
                  </div>
                  <p className="text-xl font-bold">{data.summary.uniquePatients}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-muted/50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs">متوسط الإيراد/مريض</span>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(data.summary.avgRevenuePerPatient)}</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Expenses Bar Chart */}
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.3 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">مقارنة الإيراد والمصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyTrend} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar dataKey="revenue" name="الإيرادات" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="المصروفات" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="profit" name="صافي الربح" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Revenue by Session Type Pie Chart */}
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.35 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">توزيع الإيرادات حسب الجلسة</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.revenueByType.length > 0 ? (
                    <div className="h-72 flex items-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.revenueByType}
                            dataKey="totalRevenue"
                            nameKey="sessionTypeName"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={90}
                            paddingAngle={3}
                            label={({ sessionTypeName, percentage }) =>
                              `${sessionTypeName} (${percentage.toFixed(0)}%)`
                            }
                            labelLine={true}
                          >
                            {data.revenueByType.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'الإيراد']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد بيانات
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Daily Revenue Area Chart */}
          <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.4 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">الإيراد اليومي (آخر 30 يوم)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.dailyRevenue} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(val: string) => {
                          const d = new Date(val)
                          return `${d.getDate()}/${d.getMonth() + 1}`
                        }}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'revenue') return [formatCurrency(value), 'الإيراد']
                          return [value, 'الزيارات']
                        }}
                        labelFormatter={(label: string) => formatDate(label)}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense by Category Horizontal Bar */}
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.45 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">توزيع المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.expenseByCategory.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.expenseByCategory}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={75} />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'المبلغ']}
                            content={<ChartTooltip />}
                          />
                          <Bar dataKey="total" name="المصروفات" fill="#ef4444" radius={[0, 4, 4, 0]}>
                            {data.expenseByCategory.map((_, index) => (
                              <Cell
                                key={index}
                                fill={['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6'][index % 7]}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد مصروفات في هذه الفترة
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Revenue by Day of Week */}
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.5 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">الإيراد حسب أيام الأسبوع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.revenueByDayOfWeek} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'avgRevenue') return [formatCurrency(value), 'متوسط الإيراد']
                            return [value, 'متوسط الزيارات']
                          }}
                        />
                        <Bar dataKey="avgRevenue" name="avgRevenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Patients */}
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.55 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    أعلى 10 مرضى إنفاقاً
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topPatients.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8 text-center">#</TableHead>
                            <TableHead>اسم المريض</TableHead>
                            <TableHead className="text-left">إجمالي الإنفاق</TableHead>
                            <TableHead className="text-center">الزيارات</TableHead>
                            <TableHead className="text-left">متوسط/زيارة</TableHead>
                            <TableHead className="text-left">آخر زيارة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.topPatients.map((p, i) => (
                            <TableRow key={p.patientId}>
                              <TableCell className="text-center">
                                <Badge
                                  variant={i < 3 ? 'default' : 'secondary'}
                                  className={cn(
                                    'w-6 h-6 p-0 flex items-center justify-center text-xs',
                                    i === 0 && 'bg-amber-500 text-white',
                                    i === 1 && 'bg-gray-400 text-white',
                                    i === 2 && 'bg-orange-600 text-white',
                                  )}
                                >
                                  {i + 1}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">{p.patientName}</TableCell>
                              <TableCell className="text-emerald-600 font-medium">{formatCurrency(p.totalSpent)}</TableCell>
                              <TableCell className="text-center">{p.visitCount}</TableCell>
                              <TableCell>{formatCurrency(p.avgPerVisit)}</TableCell>
                              <TableCell className="text-muted-foreground text-xs">{formatDate(p.lastVisit)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد بيانات
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Session Details */}
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.6 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    تفاصيل الجلسات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.revenueByType.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>اسم الجلسة</TableHead>
                            <TableHead className="text-center">الزيارات</TableHead>
                            <TableHead className="text-left">إجمالي الإيراد</TableHead>
                            <TableHead className="text-left">متوسط السعر</TableHead>
                            <TableHead className="text-center">النسبة %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.revenueByType.map((s) => (
                            <TableRow key={s.sessionTypeId}>
                              <TableCell className="font-medium">{s.sessionTypeName}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{s.totalVisits}</Badge>
                              </TableCell>
                              <TableCell className="text-emerald-600 font-medium">{formatCurrency(s.totalRevenue)}</TableCell>
                              <TableCell>{formatCurrency(s.avgPerVisit)}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="font-mono">
                                  {s.percentage.toFixed(1)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                      لا توجد بيانات
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Session Popularity Bar Chart */}
          {data.sessionPopularity.length > 0 && (
            <motion.div {...fadeInUp} transition={{ duration: 0.4, delay: 0.65 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">شعبية الجلسات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.sessionPopularity}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'revenue') return [formatCurrency(value), 'الإيراد']
                            return [value, 'العدد']
                          }}
                        />
                        <Legend />
                        <Bar dataKey="count" name="عدد الجلسات" fill="#0d9488" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="revenue" name="الإيراد" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileBarChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
        </div>
      )}
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────

const KPI_COLORS = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    icon: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400',
    value: 'text-red-600 dark:text-red-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    value: 'text-purple-600 dark:text-purple-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    value: 'text-amber-600 dark:text-amber-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    icon: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
    value: 'text-orange-600 dark:text-orange-400',
  },
} as const

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color,
  index,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: keyof typeof KPI_COLORS
  index: number
}) {
  const colors = KPI_COLORS[color]
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Card className={cn('border-none', colors.bg)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">{title}</span>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.icon)}>
              {icon}
            </div>
          </div>
          <p className={cn('text-xl font-bold', colors.value)}>{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Loading Skeleton ───────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-none bg-muted/50">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-none bg-muted/50">
            <CardContent className="p-4">
              <Skeleton className="h-3 w-20 mx-auto mb-2" />
              <Skeleton className="h-7 w-12 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-xl" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
