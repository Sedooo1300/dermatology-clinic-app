'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn, formatDate, formatCurrency, formatRelative, getStatusLabel, getStatusColor } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { CalendarDays, Plus, Edit, Trash2, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'

interface Visit {
  id: string; date: string; status: string; price: number; paid: number; remaining: number; notes: string | null
  patient: { id: string; name: string; phone: string | null }
  sessionType: { id: string; name: string; price: number } | null
}

interface SessionTypeOption {
  id: string; name: string; price: number; isActive: boolean
}

export function VisitList() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Visit | null>(null)
  const [sessionTypes, setSessionTypes] = useState<SessionTypeOption[]>([])
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    patientId: '', sessionTypeId: '', date: new Date().toISOString().split('T')[0],
    price: '', paid: '', notes: '', status: 'completed',
  })

  const fetchVisits = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/visits?${params}`)
      const data = await res.json()
      setVisits(data.visits || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { fetchVisits() }, [fetchVisits])

  useEffect(() => {
    async function fetchData() {
      try {
        const [stRes, pRes] = await Promise.all([
          fetch('/api/session-types'),
          fetch('/api/patients?limit=200'),
        ])
        const stData = await stRes.json()
        const pData = await pRes.json()
        setSessionTypes(stData.filter((s: SessionTypeOption) => s.isActive))
        setPatients(pData.patients || [])
      } catch { /* ignore */ }
    }
    fetchData()
  }, [])

  const handleSessionTypeChange = (stId: string) => {
    const st = sessionTypes.find((s) => s.id === stId)
    setFormData({
      ...formData,
      sessionTypeId: stId,
      price: st?.price?.toString() || '',
    })
  }

  const handlePaidChange = (paid: string) => {
    setFormData({ ...formData, paid })
  }

  const handleSubmit = async () => {
    if (!formData.patientId) { toast.error('يرجى اختيار المريض'); return }
    try {
      if (editingItem) {
        await fetch(`/api/visits/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('تم تعديل الزيارة')
        emitChange('visits', 'update', editingItem.id)
      } else {
        await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('تم تسجيل الزيارة بنجاح')
        emitChange('visits', 'create', null)
      }
      setShowForm(false)
      setEditingItem(null)
      resetForm()
      fetchVisits()
    } catch {
      toast.error('خطأ في حفظ البيانات')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/visits/${id}`, { method: 'DELETE' })
      toast.success('تم حذف الزيارة')
      emitChange('visits', 'delete', id)
      fetchVisits()
    } catch {
      toast.error('خطأ في حذف الزيارة')
    }
  }

  const handleEdit = (item: Visit) => {
    setEditingItem(item)
    setFormData({
      patientId: item.patient.id,
      sessionTypeId: item.sessionType?.id || '',
      date: item.date.split('T')[0],
      price: item.price.toString(),
      paid: item.paid.toString(),
      notes: item.notes || '',
      status: item.status,
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({ patientId: '', sessionTypeId: '', date: new Date().toISOString().split('T')[0], price: '', paid: '', notes: '', status: 'completed' })
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث باسم المريض..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="scheduled">مجدولة</SelectItem>
            <SelectItem value="cancelled">ملغاة</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingItem(null); resetForm(); setShowForm(true) }} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          زيارة جديدة
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">إجمالي {total} زيارة</p>

      {/* Visit List */}
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : (
          <AnimatePresence>
            {visits.map((visit, index) => (
              <motion.div key={visit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{visit.patient.name}</span>
                          {visit.sessionType && (
                            <Badge variant="outline" className="text-[10px]">{visit.sessionType.name}</Badge>
                          )}
                          <Badge className={cn('text-[10px] px-2 py-0.5', getStatusColor(visit.status))}>
                            {getStatusLabel(visit.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{formatDate(visit.date)}</span>
                          <span className="text-xs font-medium text-emerald-600">مدفوع: {formatCurrency(visit.paid)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold">{formatCurrency(visit.price)}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(visit)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الزيارة</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(visit.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
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

        {!isLoading && visits.length === 0 && (
          <div className="text-center py-12">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد زيارات</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'تعديل الزيارة' : 'تسجيل زيارة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المريض *</Label>
              <Select value={formData.patientId} onValueChange={(v) => setFormData({ ...formData, patientId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>نوع الجلسة</Label>
              <Select value={formData.sessionTypeId} onValueChange={handleSessionTypeChange}>
                <SelectTrigger><SelectValue placeholder="اختر نوع الجلسة" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {sessionTypes.map((st) => <SelectItem key={st.id} value={st.id}>{st.name} - {formatCurrency(st.price)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>السعر</Label>
                <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
              </div>
              <div>
                <Label>المدفوع</Label>
                <Input type="number" value={formData.paid} onChange={(e) => handlePaidChange(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>الحالة</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">مكتملة</SelectItem>
                  <SelectItem value="scheduled">مجدولة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">{editingItem ? 'تعديل' : 'تسجيل'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
