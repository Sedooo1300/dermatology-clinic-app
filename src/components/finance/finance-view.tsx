'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'

const EXPENSE_CATEGORIES = ['إيجار', 'رواتب', 'مستلزمات طبية', 'أجهزة', 'صيانة', 'كهرباء ومياه', 'تسويق', 'أخرى']
const REVENUE_CATEGORIES = ['جلسات', 'كشف', 'استشارات', 'منتجات', 'أخرى']

const COLORS = ['oklch(0.55 0.12 175)', 'oklch(0.65 0.15 145)', 'oklch(0.55 0.15 25)', 'oklch(0.65 0.18 55)', 'oklch(0.55 0.15 300)', 'oklch(0.60 0.10 200)']

interface Expense {
  id: string; category: string; amount: number; description: string | null; date: string; createdAt: string
}

interface Revenue {
  id: string; category: string; amount: number; description: string | null; date: string; createdAt: string
}

export function FinanceView() {
  const [activeTab, setActiveTab] = useState('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [totalRevenues, setTotalRevenues] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Expense | Revenue | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formData, setFormData] = useState({
    category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0],
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const [expRes, revRes] = await Promise.all([
        fetch(`/api/expenses?${params}`),
        fetch(`/api/revenues?${params}`),
      ])
      const expData = await expRes.json()
      const revData = await revRes.json()
      setExpenses(expData.expenses || [])
      setTotalExpenses(expData.totalAmount || 0)
      setRevenues(revData.revenues || [])
      setTotalRevenues(revData.totalAmount || 0)
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async () => {
    if (!formData.category || !formData.amount) {
      toast.error('يرجى ملء الفئة والمبلغ')
      return
    }
    try {
      const url = activeTab === 'expenses' ? '/api/expenses' : '/api/revenues'
      if (editingItem) {
        const editUrl = activeTab === 'expenses' ? `/api/expenses/${editingItem.id}` : `/api/revenues/${editingItem.id}`
        await fetch(editUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('تم التعديل')
        emitChange(activeTab, 'update', editingItem.id)
      } else {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('تمت الإضافة')
        emitChange(activeTab, 'create', null)
      }
      setShowForm(false)
      setEditingItem(null)
      setFormData({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
      fetchData()
    } catch {
      toast.error('خطأ في حفظ البيانات')
    }
  }

  const handleDelete = async (id: string) => {
    const url = activeTab === 'expenses' ? `/api/expenses/${id}` : `/api/revenues/${id}`
    try {
      await fetch(url, { method: 'DELETE' })
      toast.success('تم الحذف')
      emitChange(activeTab, 'delete', id)
      fetchData()
    } catch {
      toast.error('خطأ في الحذف')
    }
  }

  const handleEdit = (item: Expense | Revenue) => {
    setEditingItem(item)
    setFormData({
      category: item.category,
      amount: item.amount.toString(),
      description: item.description || '',
      date: item.date.split('T')[0],
    })
    setShowForm(true)
  }

  const netProfit = totalRevenues - totalExpenses
  const categories = activeTab === 'expenses' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES
  const items = activeTab === 'expenses' ? expenses : revenues

  // Chart data by category
  const chartData = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount
    return acc
  }, {} as Record<string, number>)

  const pieData = Object.entries(chartData).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalRevenues)}</p>
            <p className="text-[10px] text-muted-foreground">الإيرادات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <TrendingDown className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-sm font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-[10px] text-muted-foreground">المصروفات</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Wallet className={cn('w-5 h-5 mx-auto mb-1', netProfit >= 0 ? 'text-emerald-500' : 'text-red-500')} />
            <p className={cn('text-sm font-bold', netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {formatCurrency(netProfit)}
            </p>
            <p className="text-[10px] text-muted-foreground">صافي الربح</p>
          </CardContent>
        </Card>
      </div>

      {/* Date Filters */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label className="text-xs">من</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
        </div>
        <div className="flex-1">
          <Label className="text-xs">إلى</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>الكل</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="expenses">المصروفات ({expenses.length})</TabsTrigger>
          <TabsTrigger value="revenues">الإيرادات ({revenues.length})</TabsTrigger>
        </TabsList>

        {(['expenses', 'revenues'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setEditingItem(null); setFormData({ category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] }); setShowForm(true) }} className="gap-2 bg-primary text-primary-foreground text-sm">
                <Plus className="w-4 h-4" />
                {tab === 'expenses' ? 'مصروف جديد' : 'إيراد جديد'}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
            ) : (
              <AnimatePresence>
                {(tab === 'expenses' ? expenses : revenues).map((item, index) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                    <Card className="mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', tab === 'expenses' ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30')}>
                            {tab === 'expenses' ? <TrendingDown className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{item.category}</span>
                              {item.description && <span className="text-xs text-muted-foreground truncate">• {item.description}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={cn('text-sm font-bold', tab === 'expenses' ? 'text-red-500' : 'text-emerald-600')}>
                              {tab === 'expenses' ? '-' : '+'}{formatCurrency(item.amount)}
                            </span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف</AlertDialogTitle>
                                  <AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Chart */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">التوزيع حسب الفئة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '12px', direction: 'rtl' }}
                    formatter={(value: number) => `${value.toLocaleString('ar-EG')} ج.م`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="text-xs">{item.name} ({formatCurrency(item.value)})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'تعديل' : activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة إيراد'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الفئة *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ (ج.م) *</Label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">{editingItem ? 'تعديل' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
