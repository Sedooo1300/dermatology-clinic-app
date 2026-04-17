'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Scissors, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'

interface SessionType {
  id: string; name: string; price: number; description: string | null; isActive: boolean
  _count: { visits: number }
}

export function SessionTypeList() {
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<SessionType | null>(null)
  const [formData, setFormData] = useState({ name: '', price: '', description: '', isActive: true })

  const fetchSessionTypes = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/session-types')
      const data = await res.json()
      setSessionTypes(data)
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchSessionTypes() }, [fetchSessionTypes])

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الجلسة')
      return
    }
    try {
      if (editingItem) {
        const res = await fetch(`/api/session-types/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast.success('تم تعديل نوع الجلسة')
          emitChange('session-types', 'update', editingItem.id)
        }
      } else {
        const res = await fetch('/api/session-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) {
          toast.success('تم إضافة نوع الجلسة')
          emitChange('session-types', 'create', null)
        }
      }
      setShowForm(false)
      setEditingItem(null)
      setFormData({ name: '', price: '', description: '', isActive: true })
      fetchSessionTypes()
    } catch {
      toast.error('خطأ في حفظ البيانات')
    }
  }

  const handleToggle = async (item: SessionType) => {
    try {
      const res = await fetch(`/api/session-types/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      if (res.ok) {
        toast.success(item.isActive ? 'تم تعطيل الجلسة' : 'تم تفعيل الجلسة')
        emitChange('session-types', 'update', item.id)
        fetchSessionTypes()
      }
    } catch {
      toast.error('خطأ في تحديث الحالة')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/session-types/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف نوع الجلسة')
        emitChange('session-types', 'delete', id)
        fetchSessionTypes()
      }
    } catch {
      toast.error('خطأ في حذف نوع الجلسة')
    }
  }

  const handleEdit = (item: SessionType) => {
    setEditingItem(item)
    setFormData({ name: item.name, price: item.price.toString(), description: item.description || '', isActive: item.isActive })
    setShowForm(true)
  }

  const activeCount = sessionTypes.filter((s) => s.isActive).length
  const inactiveCount = sessionTypes.filter((s) => !s.isActive).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{sessionTypes.length} نوع</Badge>
          <Badge variant="outline">{activeCount} نشط</Badge>
          {inactiveCount > 0 && <Badge variant="outline" className="text-muted-foreground">{inactiveCount} معطل</Badge>}
        </div>
        <Button onClick={() => { setEditingItem(null); setFormData({ name: '', price: '', description: '', isActive: true }); setShowForm(true) }} className="gap-2 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
          نوع جديد
        </Button>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <AnimatePresence>
            {sessionTypes.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={cn(!item.isActive && 'opacity-60')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Scissors className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          {!item.isActive && <Badge variant="secondary" className="text-[10px]">معطل</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-sm font-bold text-primary">{formatCurrency(item.price)}</span>
                          <span className="text-xs text-muted-foreground">{item._count.visits} جلسة</span>
                          {item.description && <span className="text-xs text-muted-foreground truncate hidden sm:inline">• {item.description}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggle(item)} title={item.isActive ? 'تعطيل' : 'تفعيل'}>
                          {item.isActive ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
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
                              <AlertDialogTitle>حذف نوع الجلسة</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف &quot;{item.name}&quot؛؟</AlertDialogDescription>
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
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditingItem(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'تعديل نوع الجلسة' : 'إضافة نوع جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الجلسة *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: كشف جلدي" />
            </div>
            <div>
              <Label>السعر (ج.م)</Label>
              <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="وصف مختصر..." rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.isActive} onCheckedChange={(v) => setFormData({ ...formData, isActive: v })} />
              <Label>نشط</Label>
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
