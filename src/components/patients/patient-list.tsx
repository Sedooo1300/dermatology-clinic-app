'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn, formatRelative, getGenderLabel } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Search, Plus, Edit, Trash2, Eye, User, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'

interface Patient {
  id: string
  name: string
  phone: string | null
  age: number | null
  gender: string
  notes: string | null
  createdAt: string
  _count: { visits: number; photos: number; alerts: number }
}

interface PatientListResponse {
  patients: Patient[]
  total: number
}

export function PatientList() {
  const { setCurrentView, setSelectedPatientId } = useAppStore()
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', age: '', gender: 'male', notes: '' })

  const fetchPatients = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (genderFilter) params.set('gender', genderFilter)
      const res = await fetch(`/api/patients?${params}`)
      const data: PatientListResponse = await res.json()
      setPatients(data.patients)
      setTotal(data.total)
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [search, genderFilter])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم المريض')
      return
    }
    try {
      if (editingPatient) {
        const res = await fetch(`/api/patients/${editingPatient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast.success('تم تعديل الحالة بنجاح')
          emitChange('patients', 'update', editingPatient.id)
        }
      } else {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast.success('تم إضافة الحالة بنجاح')
          emitChange('patients', 'create', null)
        }
      }
      setShowForm(false)
      setEditingPatient(null)
      setFormData({ name: '', phone: '', age: '', gender: 'male', notes: '' })
      fetchPatients()
    } catch {
      toast.error('خطأ في حفظ البيانات')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف الحالة')
        emitChange('patients', 'delete', id)
        fetchPatients()
      }
    } catch {
      toast.error('خطأ في حذف الحالة')
    }
  }

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setFormData({
      name: patient.name,
      phone: patient.phone || '',
      age: patient.age?.toString() || '',
      gender: patient.gender,
      notes: patient.notes || '',
    })
    setShowForm(true)
  }

  const handleView = (id: string) => {
    setSelectedPatientId(id)
    setCurrentView('patient-detail')
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو التليفون..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="الجنس" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="male">ذكر</SelectItem>
            <SelectItem value="female">أنثى</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingPatient(null); setFormData({ name: '', phone: '', age: '', gender: 'male', notes: '' }); setShowForm(true) }} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          حالة جديدة
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">إجمالي {total} حالة</p>

      {/* Patient List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {patients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleView(patient.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{patient.name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {getGenderLabel(patient.gender)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {patient.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />{patient.phone}
                            </span>
                          )}
                          {patient.age && (
                            <span className="text-xs text-muted-foreground">{patient.age} سنة</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {patient._count.visits} زيارة
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelative(patient.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(patient.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(patient)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الحالة</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف حالة &quot;{patient.name}&quot؛؟ سيتم حذف جميع البيانات المرتبطة.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(patient.id)} className="bg-red-500 hover:bg-red-600">
                                حذف
                              </AlertDialogAction>
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

        {!isLoading && patients.length === 0 && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد حالات</p>
            <p className="text-sm text-muted-foreground mt-1">اضغط على &quot;حالة جديدة&quot; لإضافة مريض</p>
          </div>
        )}
      </div>

      {/* Patient Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setEditingPatient(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'تعديل الحالة' : 'إضافة حالة جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="اسم المريض"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التليفون</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <div>
                <Label>السن</Label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  placeholder="العمر"
                />
              </div>
            </div>
            <div>
              <Label>الجنس</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} className="bg-primary text-primary-foreground">
              {editingPatient ? 'تعديل' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
