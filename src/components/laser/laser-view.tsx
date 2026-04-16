'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Zap, Plus, Edit, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'

const AREAS = [
  'الوجه', 'الذقن', 'الشارب', 'البطن', 'الصدر', 'الظهر',
  'الإبطين', 'الذراعين', 'الساقين', 'القدمين', 'اليدين', 'الرقبة',
  'البيكيني', 'الجسم الكامل', 'خط شعر الرأس', 'الأذنين',
]

const SKIN_TYPES = ['1', '2', '3', '4', '5', '6']
const HAIR_COLORS = ['أسود', 'بني غامق', 'بني فاتح', 'أشقر', 'أحمر', 'رمادي', 'أبيض']
const COOLING_TYPES = ['تبريد بالمكعب', 'تبريد بالهواء', 'تبريد بالجل', 'بدون تبريد']

interface LaserTreatment {
  id: string; visitId: string; area: string; skinType: string | null; hairColor: string | null
  skinSensitivity: string | null; fluence: string | null; pulseWidth: string | null
  spotSize: string | null; coolingType: string | null; painLevel: number | null
  progress: string | null; sessionsDone: number; sessionsTotal: number
  nextSessionDate: string | null; notes: string | null; createdAt: string
  visit: { id: string; patient: { id: string; name: string } }
}

export function LaserView() {
  const [treatments, setTreatments] = useState<LaserTreatment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<LaserTreatment | null>(null)
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [visits, setVisits] = useState<Array<{ id: string; patient: { id: string; name: string } }>>([])
  const [formData, setFormData] = useState({
    visitId: '', area: '', skinType: '', hairColor: '', skinSensitivity: '',
    fluence: '', pulseWidth: '', spotSize: '', coolingType: '', painLevel: 3,
    progress: '', sessionsDone: 0, sessionsTotal: 6, nextSessionDate: '', notes: '',
  })

  const fetchTreatments = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/laser')
      const data = await res.json()
      setTreatments(data)
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchTreatments() }, [fetchTreatments])

  const fetchVisits = async (patientId: string) => {
    if (!patientId) { setVisits([]); return }
    try {
      const res = await fetch(`/api/visits?patientId=${patientId}&limit=100`)
      const data = await res.json()
      setVisits(data.visits || [])
    } catch { /* ignore */ }
  }

  const handleSubmit = async () => {
    if (!formData.visitId || !formData.area) {
      toast.error('يرجى اختيار الزيارة والمنطقة')
      return
    }
    try {
      if (editingItem) {
        await fetch(`/api/laser/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('تم تعديل جلسة الليزر')
        emitChange('laser', 'update', editingItem.id)
      } else {
        await fetch('/api/laser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('تم إضافة جلسة الليزر')
        emitChange('laser', 'create', null)
      }
      setShowForm(false)
      setEditingItem(null)
      resetForm()
      fetchTreatments()
    } catch {
      toast.error('خطأ في حفظ البيانات')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/laser/${id}`, { method: 'DELETE' })
      toast.success('تم حذف جلسة الليزر')
      emitChange('laser', 'delete', id)
      fetchTreatments()
    } catch {
      toast.error('خطأ في حذف جلسة الليزر')
    }
  }

  const handleEdit = (item: LaserTreatment) => {
    setEditingItem(item)
    setSelectedPatientId(item.visit.patient.id)
    fetchVisits(item.visit.patient.id)
    setFormData({
      visitId: item.visitId, area: item.area, skinType: item.skinType || '', hairColor: item.hairColor || '',
      skinSensitivity: item.skinSensitivity || '', fluence: item.fluence || '', pulseWidth: item.pulseWidth || '',
      spotSize: item.spotSize || '', coolingType: item.coolingType || '', painLevel: item.painLevel || 3,
      progress: item.progress || '', sessionsDone: item.sessionsDone, sessionsTotal: item.sessionsTotal,
      nextSessionDate: item.nextSessionDate ? item.nextSessionDate.split('T')[0] : '', notes: item.notes || '',
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      visitId: '', area: '', skinType: '', hairColor: '', skinSensitivity: '',
      fluence: '', pulseWidth: '', spotSize: '', coolingType: '', painLevel: 3,
      progress: '', sessionsDone: 0, sessionsTotal: 6, nextSessionDate: '', notes: '',
    })
    setSelectedPatientId('')
    setVisits([])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{treatments.length} جلسة ليزر</Badge>
        <Button onClick={() => { setEditingItem(null); resetForm(); setShowForm(true) }} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          جلسة جديدة
        </Button>
      </div>

      {/* Area Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(
          treatments.reduce((acc, t) => { acc[t.area] = (acc[t.area] || 0) + 1; return acc }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([area, count]) => (
          <Card key={area}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">{area}</p>
              <p className="text-lg font-bold text-primary">{count}</p>
              <p className="text-[10px] text-muted-foreground">جلسة</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Treatment List */}
      <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
        ) : (
          <AnimatePresence>
            {treatments.map((treatment, index) => {
              const progressPercent = treatment.sessionsTotal > 0 ? Math.round((treatment.sessionsDone / treatment.sessionsTotal) * 100) : 0
              return (
                <motion.div key={treatment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                          <Zap className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">{treatment.visit.patient.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{treatment.area}</p>
                          {treatment.skinType && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">Fitzpatrick {treatment.skinType}</Badge>
                              {treatment.fluence && <Badge variant="outline" className="text-[10px]">{treatment.fluence} J/cm²</Badge>}
                              {treatment.spotSize && <Badge variant="outline" className="text-[10px]">{treatment.spotSize} mm</Badge>}
                            </div>
                          )}
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">التقدم: {treatment.sessionsDone}/{treatment.sessionsTotal}</span>
                              <span className="font-medium">{progressPercent}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                          </div>
                          {treatment.nextSessionDate && (
                            <p className="text-xs text-amber-600 mt-1">الجلسة القادمة: {formatDate(treatment.nextSessionDate)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(treatment)}>
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
                                <AlertDialogTitle>حذف جلسة الليزر</AlertDialogTitle>
                                <AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(treatment.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}

        {!isLoading && treatments.length === 0 && (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد جلسات ليزر</p>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'تعديل جلسة الليزر' : 'إضافة جلسة ليزر جديدة'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>بحث عن المريض</Label>
              <Input
                placeholder="ابحث باسم المريض..."
                value={selectedPatientId ? (treatments.find(t => t.visit.patient.id === selectedPatientId)?.visit.patient.name || '') : ''}
                onChange={async (e) => {
                  const q = e.target.value
                  if (q.length >= 2) {
                    try {
                      const res = await fetch(`/api/patients?search=${q}&limit=5`)
                      const data = await res.json()
                      if (data.patients.length > 0) {
                        setSelectedPatientId(data.patients[0].id)
                        await fetchVisits(data.patients[0].id)
                      }
                    } catch { /* ignore */ }
                  }
                }}
              />
            </div>

            <div>
              <Label>الزيارة *</Label>
              <Select value={formData.visitId} onValueChange={(v) => setFormData({ ...formData, visitId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الزيارة" /></SelectTrigger>
                <SelectContent>
                  {visits.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.patient.name} - {v.id.slice(-6)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>المنطقة المعالجة *</Label>
              <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>نوع البشرة (Fitzpatrick)</Label>
                <Select value={formData.skinType} onValueChange={(v) => setFormData({ ...formData, skinType: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {SKIN_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>لون الشعر</Label>
                <Select value={formData.hairColor} onValueChange={(v) => setFormData({ ...formData, hairColor: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {HAIR_COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الطاقة (J/cm²)</Label>
                <Input value={formData.fluence} onChange={(e) => setFormData({ ...formData, fluence: e.target.value })} placeholder="مثال: 15" />
              </div>
              <div>
                <Label>عرض النبضة (ms)</Label>
                <Input value={formData.pulseWidth} onChange={(e) => setFormData({ ...formData, pulseWidth: e.target.value })} placeholder="مثال: 30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>حجم البقعة (mm)</Label>
                <Input value={formData.spotSize} onChange={(e) => setFormData({ ...formData, spotSize: e.target.value })} placeholder="مثال: 12" />
              </div>
              <div>
                <Label>نوع التبريد</Label>
                <Select value={formData.coolingType} onValueChange={(v) => setFormData({ ...formData, coolingType: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {COOLING_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>مستوى الألم: {formData.painLevel}</Label>
              <Slider
                value={[formData.painLevel]}
                onValueChange={([v]) => setFormData({ ...formData, painLevel: v })}
                min={1} max={10} step={1}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 - لا ألم</span>
                <span>10 - ألم شديد</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>جلسات منجزة</Label>
                <Input type="number" value={formData.sessionsDone} onChange={(e) => setFormData({ ...formData, sessionsDone: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>إجمالي الجلسات</Label>
                <Input type="number" value={formData.sessionsTotal} onChange={(e) => setFormData({ ...formData, sessionsTotal: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>الجلسة القادمة</Label>
                <Input type="date" value={formData.nextSessionDate} onChange={(e) => setFormData({ ...formData, nextSessionDate: e.target.value })} />
              </div>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} />
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
