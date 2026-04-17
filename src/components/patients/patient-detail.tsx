'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { cn, formatCurrency, formatDate, formatRelative, getStatusLabel, getStatusColor, getGenderLabel } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ArrowRight, CalendarDays, Wallet, FileText, Camera, Trash2, Download, Upload, MessageSquare, Plus, Edit3, Send } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'
import { compressBase64 } from '@/lib/utils'

interface PatientDetail {
  id: string; name: string; phone: string | null; age: number | null; gender: string; notes: string | null
  totalPaid: number; totalRemaining: number; totalVisits: number
  visits: Array<{
    id: string; date: string; status: string; price: number; paid: number; remaining: number; notes: string | null
    sessionType: { id: string; name: string; price: number } | null
  }>
  photos: Array<{
    id: string; type: string; photoUrl: string; notes: string | null; createdAt: string
  }>
}

export function PatientDetail() {
  const { selectedPatientId, setCurrentView, patientDetailTab, setPatientDetailTab } = useAppStore()
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [photoType, setPhotoType] = useState<'before' | 'after'>('before')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [showFullPhoto, setShowFullPhoto] = useState<string | null>(null)

  // Notes state
  const [notes, setNotes] = useState<Array<{ id: string; patientId: string; content: string; category: string; createdAt: string }>>([])
  const [newNote, setNewNote] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')

  const fetchPatient = useCallback(async () => {
    if (!selectedPatientId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}`)
      if (res.ok) {
        const data = await res.json()
        setPatient(data)
      } else {
        toast.error('الحالة غير موجودة')
        setCurrentView('patients')
      }
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPatientId, setCurrentView])

  useEffect(() => { fetchPatient() }, [fetchPatient])

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    if (!selectedPatientId) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/notes`)
      if (res.ok) setNotes(await res.json())
    } catch { /* silent */ }
  }, [selectedPatientId])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedPatientId) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, category: noteCategory }),
      })
      if (res.ok) {
        toast.success('تم إضافة الملاحظة')
        setNewNote('')
        fetchNotes()
      }
    } catch {
      toast.error('خطأ في إضافة الملاحظة')
    }
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editingNoteContent.trim()) return
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingNoteContent, category: noteCategory }),
      })
      if (res.ok) {
        toast.success('تم تعديل الملاحظة')
        setEditingNoteId(null)
        setEditingNoteContent('')
        fetchNotes()
      }
    } catch {
      toast.error('خطأ في تعديل الملاحظة')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/notes/${noteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف الملاحظة')
        fetchNotes()
      }
    } catch {
      toast.error('خطأ في حذف الملاحظة')
    }
  }

  const CATEGORY_LABELS: Record<string, string> = {
    general: 'عامة',
    visit: 'زيارة',
    treatment: 'علاج',
    laser: 'ليزر',
    followup: 'متابعة',
    finance: 'مالية',
  }

  const handleCapturePhoto = async (file: File | null) => {
    if (!file && !photoPreview) return

    const base64 = file ? await fileToBase64(file) : photoPreview
    if (!base64) return

    const compressed = await compressBase64(base64)

    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          type: photoType,
          photoUrl: compressed,
        }),
      })
      if (res.ok) {
        toast.success('تم حفظ الصورة بنجاح')
        setShowPhotoDialog(false)
        setPhotoPreview(null)
        fetchPatient()
        emitChange('photos', 'create', null)
      }
    } catch {
      toast.error('خطأ في حفظ الصورة')
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      setTimeout(() => {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        stream.getTracks().forEach((t) => t.stop())
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        setPhotoPreview(dataUrl)
      }, 500)
    } catch {
      toast.error('لا يمكن الوصول للكاميرا')
    }
  }

  const handleDeletePhoto = async (id: string) => {
    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('تم حذف الصورة')
        fetchPatient()
        emitChange('photos', 'delete', id)
      }
    } catch {
      toast.error('خطأ في حذف الصورة')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!patient) return null

  const beforePhotos = patient.photos.filter((p) => p.type === 'before')
  const afterPhotos = patient.photos.filter((p) => p.type === 'after')

  return (
    <div className="space-y-4">
      {/* Back button & title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setCurrentView('patients')}>
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h3 className="font-bold text-lg">{patient.name}</h3>
        <Badge variant="outline">{getGenderLabel(patient.gender)}</Badge>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <CalendarDays className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{patient.totalVisits}</p>
            <p className="text-xs text-muted-foreground">زيارة</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Wallet className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold">{formatCurrency(patient.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">إجمالي المدفوع</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Wallet className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-lg font-bold">{formatCurrency(patient.totalRemaining)}</p>
            <p className="text-xs text-muted-foreground">المتبقي</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <FileText className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">{patient.photos.length}</p>
            <p className="text-xs text-muted-foreground">صور</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Details */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">التليفون:</span>
              <span className="font-medium mr-2">{patient.phone || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">العمر:</span>
              <span className="font-medium mr-2">{patient.age ? `${patient.age} سنة` : '—'}</span>
            </div>
            {patient.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground">ملاحظات:</span>
                <p className="mt-1 text-foreground">{patient.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={patientDetailTab} onValueChange={setPatientDetailTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="visits">الزيارات</TabsTrigger>
          <TabsTrigger value="photos">الصور ({patient.photos.length})</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            الملاحظات ({notes.length})
          </TabsTrigger>
        </TabsList>

        {/* Visits Tab */}
        <TabsContent value="visits" className="mt-4">
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {patient.visits.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد زيارات</p>
            ) : (
              patient.visits.map((visit) => (
                <Card key={visit.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{visit.sessionType?.name || 'جلسة عامة'}</span>
                          <Badge className={cn('text-[10px] px-2 py-0.5', getStatusColor(visit.status))}>
                            {getStatusLabel(visit.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(visit.date)} • المدفوع: {formatCurrency(visit.paid)}
                          {visit.remaining > 0 && ` • متبقي: ${formatCurrency(visit.remaining)}`}
                        </p>
                        {visit.notes && <p className="text-xs text-muted-foreground mt-0.5">{visit.notes}</p>}
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(visit.price)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Photos Tab */}
        <TabsContent value="photos" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Button onClick={() => { setPhotoType('before'); setShowPhotoDialog(true) }} variant="outline" className="gap-2 flex-1">
              <Camera className="w-4 h-4" />
              صورة قبل
            </Button>
            <Button onClick={() => { setPhotoType('after'); setShowPhotoDialog(true) }} variant="outline" className="gap-2 flex-1">
              <Camera className="w-4 h-4" />
              صورة بعد
            </Button>
          </div>

          {/* Before Photos */}
          {beforePhotos.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-sm mb-2 text-amber-600">صور قبل العلاج ({beforePhotos.length})</h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {beforePhotos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer" onClick={() => setShowFullPhoto(photo.photoUrl)}>
                    <img src={photo.photoUrl} alt="قبل" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation() }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الصورة</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من حذف هذه الصورة؟</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePhoto(photo.id)}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* After Photos */}
          {afterPhotos.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-sm mb-2 text-emerald-600">صور بعد العلاج ({afterPhotos.length})</h4>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {afterPhotos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer" onClick={() => setShowFullPhoto(photo.photoUrl)}>
                    <img src={photo.photoUrl} alt="بعد" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation() }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف الصورة</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من حذف هذه الصورة؟</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeletePhoto(photo.id)}>حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {patient.photos.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">لا توجد صور</p>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          {/* Add Note */}
          <Card className="mb-4">
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Select value={noteCategory} onValueChange={setNoteCategory}>
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="اكتب ملاحظة جديدة..."
                  className="min-h-[60px] text-sm resize-none"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
                />
                <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()} className="shrink-0 self-end h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes Timeline */}
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">لا توجد ملاحظات</p>
                <p className="text-xs text-muted-foreground mt-1">أضف ملاحظة جديدة لتتبع تطور حالة المريض</p>
              </div>
            ) : (
              <AnimatePresence>
                {notes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    {editingNoteId === note.id ? (
                      <Card className="border-primary/50 ring-1 ring-primary/20">
                        <CardContent className="p-3 space-y-2">
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) => setEditingNoteContent(e.target.value)}
                            className="min-h-[50px] text-sm resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingNoteId(null); setEditingNoteContent('') }}>إلغاء</Button>
                            <Button size="sm" onClick={() => handleUpdateNote(note.id)} className="bg-primary text-primary-foreground">حفظ</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {CATEGORY_LABELS[note.category] || note.category}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {formatRelative(note.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content) }}
                              >
                                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>حذف الملاحظة</AlertDialogTitle>
                                    <AlertDialogDescription>هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>حذف</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Photo Upload Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={(open) => { setShowPhotoDialog(open); setPhotoPreview(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{photoType === 'before' ? 'صورة قبل العلاج' : 'صورة بعد العلاج'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {photoPreview && (
              <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={photoPreview} alt="معاينة" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="gap-2" onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) {
                    const base64 = await fileToBase64(file)
                    setPhotoPreview(base64)
                  }
                }
                input.click()
              }}>
                <Upload className="w-4 h-4" />
                رفع صورة
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleCameraCapture}>
                <Camera className="w-4 h-4" />
                التقاط صورة
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPhotoDialog(false); setPhotoPreview(null) }}>إلغاء</Button>
            <Button onClick={() => handleCapturePhoto(null)} disabled={!photoPreview} className="bg-primary text-primary-foreground">
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Photo View */}
      <Dialog open={!!showFullPhoto} onOpenChange={() => setShowFullPhoto(null)}>
        <DialogContent className="max-w-lg p-2">
          {showFullPhoto && (
            <img src={showFullPhoto} alt="صورة" className="w-full rounded-xl" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
