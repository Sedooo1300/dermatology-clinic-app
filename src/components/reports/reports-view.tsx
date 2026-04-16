'use client'

import { useState, useEffect } from 'react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts'
import { FileBarChart, Download } from 'lucide-react'
import { toast } from 'sonner'

interface ReportData {
  visits?: Array<{ id: string; status: string; paid: number; date: string; patient: { name: string }; sessionType: { name: string } | null }>
  completed?: Array<{ id: string; paid: number }>
  cancelled?: Array<{ id: string }>
  scheduled?: Array<{ id: string }>
  totalRevenue?: number
  expenses?: Array<{ id: string; category: string; amount: number; date: string }>
  revenues?: Array<{ id: string; category: string; amount: number; date: string }>
  totalExpenses?: number
  totalRevenues?: number
  netProfit?: number
  treatments?: Array<{ id: string; area: string; createdAt: string; visit: { patient: { name: string } } }>
  areas?: Record<string, number>
  patients?: Array<{ id: string; name: string; createdAt: string; _count: { visits: number } }>
  newPatients?: Array<{ id: string }>
  total?: number
  newThisPeriod?: number
  period?: string
}

export function ReportsView() {
  const [reportType, setReportType] = useState('visits')
  const [period, setPeriod] = useState('monthly')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchReport = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ type: reportType, period })
      if (date) params.set('date', date)
      const res = await fetch(`/api/reports?${params}`)
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('خطأ في جلب التقرير')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [reportType, period])

  const handleExport = () => {
    if (!data) return
    const jsonStr = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportType}-${period}-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تصدير التقرير')
  }

  const reportTypes = [
    { id: 'visits', label: 'الزيارات' },
    { id: 'finance', label: 'المالية' },
    { id: 'laser', label: 'الليزر' },
    { id: 'patients', label: 'الحالات' },
  ]

  const periods = [
    { id: 'daily', label: 'يومي' },
    { id: 'weekly', label: 'أسبوعي' },
    { id: 'monthly', label: 'شهري' },
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Label className="text-xs">نوع التقرير</Label>
          <Select value={reportType} onValueChange={(v) => setReportType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {reportTypes.map((rt) => <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs">الفترة</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs">التاريخ</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={fetchReport} variant="outline" className="bg-primary text-primary-foreground">
            <FileBarChart className="w-4 h-4 ml-2" />
            عرض
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Visits Report */}
          {reportType === 'visits' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{data.visits?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">إجمالي الزيارات</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{data.completed?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">مكتملة</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-amber-600">{data.scheduled?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">مجدولة</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{data.cancelled?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">ملغاة</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">إجمالي الإيرادات: {formatCurrency(data.totalRevenue || 0)}</CardTitle>
                </CardHeader>
              </Card>
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {(data.visits || []).map((v) => (
                  <Card key={v.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{v.patient?.name}</p>
                        <p className="text-xs text-muted-foreground">{v.sessionType?.name || 'جلسة'} • {formatDate(v.date)}</p>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(v.paid)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Finance Report */}
          {reportType === 'finance' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(data.totalRevenues || 0)}</p>
                    <p className="text-xs text-muted-foreground">الإيرادات</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{formatCurrency(data.totalExpenses || 0)}</p>
                    <p className="text-xs text-muted-foreground">المصروفات</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className={cn('text-lg font-bold', (data.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formatCurrency(data.netProfit || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">صافي الربح</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">تفاصيل المصروفات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {(data.expenses || []).map((e) => (
                      <div key={e.id} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
                        <div>
                          <span className="font-medium">{e.category}</span>
                          <span className="text-xs text-muted-foreground mr-2">{formatDate(e.date)}</span>
                        </div>
                        <span className="text-red-500 font-medium">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Laser Report */}
          {reportType === 'laser' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">إجمالي جلسات الليزر في هذه الفترة</p>
                  <p className="text-2xl font-bold">{data.treatments?.length || 0}</p>
                </CardContent>
              </Card>
              {data.areas && Object.keys(data.areas).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">توزيع المناطق</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(data.areas).map(([area, count]) => ({ area, count }))} layout="vertical" margin={{ top: 5, right: 5, left: 40, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="area" tick={{ fontSize: 11 }} width={100} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '12px' }}
                          />
                          <Bar dataKey="count" name="عدد الجلسات" fill="oklch(0.65 0.15 55)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Patients Report */}
          {reportType === 'patients' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{data.total || 0}</p>
                    <p className="text-xs text-muted-foreground">إجمالي الحالات</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-primary">{data.newThisPeriod || 0}</p>
                    <p className="text-xs text-muted-foreground">حالات جديدة</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                {(data.patients || []).map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p._count.visits} زيارة • {formatDate(p.createdAt)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileBarChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">اضغط &quot;عرض&quot; لتحميل التقرير</p>
        </div>
      )}
    </div>
  )
}
