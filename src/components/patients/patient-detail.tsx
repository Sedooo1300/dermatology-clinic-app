'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
import { ArrowRight, CalendarDays, Wallet, FileText, Camera, Trash2, Download, Upload, MessageSquare, Plus, Edit3, Send, GitCompare, LayoutGrid, Clock } from 'lucide-react'
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

type Photo = PatientDetail['photos'][number]

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

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

  // Compare & view state
  const [showCompareView, setShowCompareView] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [selectedCompareIndex, setSelectedCompareIndex] = useState(0)
  const [sliderPos, setSliderPos] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const compareContainerRef = useRef<HTMLDivElement>(null)

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

  // Slider drag handlers
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!compareContainerRef.current) return
      const rect = compareContainerRef.current.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const x = clientX - rect.left
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
      setSliderPos(pct)
    }

    const handleUp = () => setIsDragging(false)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove)
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [isDragging])

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

  // Derived data — computed before early returns to satisfy rules-of-hooks
  const allPhotos = patient?.photos ?? []
  const beforePhotos = allPhotos.filter((p) => p.type === 'before')
  const afterPhotos = allPhotos.filter((p) => p.type === 'after')

  const comparePairs = useMemo(() => {
    const pairs: Array<{ before: Photo; after: Photo }> = []
    const usedAfterIds = new Set<string>()

    const sortedBefore = [...beforePhotos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    const sortedAfter = [...afterPhotos].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    for (const before of sortedBefore) {
      const beforeDate = new Date(before.createdAt)
      const bestAfter = sortedAfter.find(
        (a) => !usedAfterIds.has(a.id) && new Date(a.createdAt) >= beforeDate
      )
      if (bestAfter) {
        pairs.push({ before, after: bestAfter })
        usedAfterIds.add(bestAfter.id)
      }
    }

    return pairs
  }, [beforePhotos, afterPhotos])

  const photosByMonth = useMemo(() => {
    const sorted = [...allPhotos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const groups: Record<string, Photo[]> = {}

    for (const photo of sorted) {
      const date = new Date(photo.createdAt)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!groups[key]) groups[key] = []
      groups[key].push(photo)
    }

    return Object.entries(groups).map(([key, photos]) => {
      const [year, month] = key.split('-')
      return {
        label: `${ARABIC_MONTHS[parseInt(month) - 1]} ${year}`,
        photos,
      }
    })
  }, [allPhotos])

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

  // Reusable photo card renderer
  const renderPhotoCard = (photo: Photo) => (
    <motion.div
      key={photo.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="relative group aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer border-2 transition-shadow hover:shadow-md"
      style={{ borderColor: photo.type === 'before' ? 'var(--color-amber-400)' : 'var(--color-emerald-400)' }}
      onClick={() => setShowFullPhoto(photo.photoUrl)}
    >
      <img
        src={photo.photoUrl}
        alt={photo.type === 'before' ? 'قبل' : 'بعد'}
        className="w-full h-full object-cover"
      />

      {/* Type badge */}
      <Badge
        className={cn(
          'absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 shadow-sm font-medium z-10',
          photo.type === 'before' ? 'bg-amber-500 text-white hover:bg-amber-500' : 'bg-emerald-500 text-white hover:bg-emerald-500'
        )}
      >
        {photo.type === 'before' ? 'قبل' : 'بعد'}
      </Badge>

      {/* Date & notes overlay on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 pt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        <p className="text-[10px] text-white font-medium">{formatDate(photo.createdAt)}</p>
        {photo.notes && (
          <p className="text-[10px] text-white/80 truncate mt-0.5">{photo.notes}</p>
        )}
      </div>

      {/* Delete button on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 shadow-lg"
              onClick={(e) => { e.stopPropagation() }}
            >
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
    </motion.div>
  )

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
          {/* Upload buttons */}
          <div className="flex gap-2 mb-3">
            <Button onClick={() => { setPhotoType('before'); setShowPhotoDialog(true) }} variant="outline" className="gap-2 flex-1 border-amber-400 text-amber-600 hover:bg-amber-50">
              <Camera className="w-4 h-4" />
              صورة قبل
            </Button>
            <Button onClick={() => { setPhotoType('after'); setShowPhotoDialog(true) }} variant="outline" className="gap-2 flex-1 border-emerald-400 text-emerald-600 hover:bg-emerald-50">
              <Camera className="w-4 h-4" />
              صورة بعد
            </Button>
          </div>

          {/* View toggle & Compare button */}
          {patient.photos.length > 0 && (
            <motion.div
              className="flex gap-1 mb-4 p-1 bg-muted rounded-lg"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant={!showTimeline ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowTimeline(false)}
                className="gap-1.5 flex-1 h-8 text-xs"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                شبكة
              </Button>
              <Button
                variant={showTimeline ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowTimeline(true)}
                className="gap-1.5 flex-1 h-8 text-xs"
              >
                <Clock className="w-3.5 h-3.5" />
                خط زمني
              </Button>
              {comparePairs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCompareIndex(0)
                    setSliderPos(50)
                    setShowCompareView(true)
                  }}
                  className="gap-1.5 flex-1 h-8 text-xs text-primary hover:text-primary"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  مقارنة
                  <Badge className="bg-primary text-primary-foreground text-[9px] px-1 min-w-[16px] h-4">
                    {comparePairs.length}
                  </Badge>
                </Button>
              )}
            </motion.div>
          )}

          {/* Grid View */}
          <AnimatePresence mode="wait">
            {!showTimeline && patient.photos.length > 0 && (
              <motion.div
                key="grid-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[500px] overflow-y-auto custom-scrollbar"
              >
                {/* Before Photos */}
                {beforePhotos.length > 0 && (
                  <div className="mb-5">
                    <h4 className="font-bold text-sm mb-2 text-amber-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      صور قبل العلاج ({beforePhotos.length})
                    </h4>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {beforePhotos.map(renderPhotoCard)}
                    </div>
                  </div>
                )}

                {/* After Photos */}
                {afterPhotos.length > 0 && (
                  <div className="mb-2">
                    <h4 className="font-bold text-sm mb-2 text-emerald-600 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      صور بعد العلاج ({afterPhotos.length})
                    </h4>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {afterPhotos.map(renderPhotoCard)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Timeline View */}
            {showTimeline && patient.photos.length > 0 && (
              <motion.div
                key="timeline-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[500px] overflow-y-auto custom-scrollbar pl-2"
              >
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute right-[9px] top-2 bottom-2 w-0.5 bg-border" />

                  {photosByMonth.map((month, monthIdx) => (
                    <motion.div
                      key={month.label}
                      className="relative pr-8 pb-6 last:pb-0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: monthIdx * 0.05 }}
                    >
                      {/* Timeline dot */}
                      <div className="absolute right-2 top-1 w-[18px] h-[18px] rounded-full bg-primary border-[3px] border-background shadow-sm z-10" />

                      {/* Month label */}
                      <h4 className="font-bold text-sm mb-3 text-foreground">{month.label}</h4>

                      {/* Photos grid for this month */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {month.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="relative group aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border-2 transition-all hover:shadow-md"
                            style={{
                              borderColor: photo.type === 'before' ? 'var(--color-amber-400)' : 'var(--color-emerald-400)',
                            }}
                            onClick={() => setShowFullPhoto(photo.photoUrl)}
                          >
                            <img
                              src={photo.photoUrl}
                              alt={photo.type === 'before' ? 'قبل' : 'بعد'}
                              className="w-full h-full object-cover"
                            />

                            {/* Type badge */}
                            <Badge
                              className={cn(
                                'absolute top-1 right-1 text-[9px] px-1 py-0 shadow-sm',
                                photo.type === 'before'
                                  ? 'bg-amber-500 text-white hover:bg-amber-500'
                                  : 'bg-emerald-500 text-white hover:bg-emerald-500'
                              )}
                            >
                              {photo.type === 'before' ? 'قبل' : 'بعد'}
                            </Badge>

                            {/* Date overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-1.5 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[9px] text-white font-medium">
                                {formatDate(photo.createdAt)}
                              </p>
                              {photo.notes && (
                                <p className="text-[9px] text-white/75 truncate">{photo.notes}</p>
                              )}
                            </div>

                            {/* Delete on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-7 w-7 shadow-lg"
                                    onClick={(e) => { e.stopPropagation() }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
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
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {patient.photos.length === 0 && (
            <div className="text-center py-8">
              <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">لا توجد صور</p>
              <p className="text-xs text-muted-foreground mt-1">أضف صور قبل وبعد العلاج لمتابعة تطور الحالة</p>
            </div>
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

      {/* Before/After Compare Dialog */}
      <Dialog open={showCompareView} onOpenChange={(open) => { setShowCompareView(open); setIsDragging(false) }}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              مقارنة قبل وبعد العلاج
            </DialogTitle>
          </DialogHeader>

          {comparePairs.length > 0 ? (
            <div className="space-y-4">
              {/* Pair selector thumbnails */}
              {comparePairs.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                  {comparePairs.map((pair, idx) => (
                    <button
                      key={`${pair.before.id}-${pair.after.id}`}
                      onClick={() => {
                        setSelectedCompareIndex(idx)
                        setSliderPos(50)
                      }}
                      className={cn(
                        'flex gap-0.5 shrink-0 rounded-lg overflow-hidden border-2 transition-all',
                        selectedCompareIndex === idx
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      )}
                    >
                      <div className="w-10 h-10 relative">
                        <img src={pair.before.photoUrl} alt="قبل" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-l border-white/50" />
                      </div>
                      <div className="w-10 h-10">
                        <img src={pair.after.photoUrl} alt="بعد" className="w-full h-full object-cover" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Slider comparison */}
              {comparePairs[selectedCompareIndex] && (
                <>
                  <div
                    ref={compareContainerRef}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted select-none"
                    onMouseDown={() => setIsDragging(true)}
                    onTouchStart={() => setIsDragging(true)}
                  >
                    {/* After photo (base layer) */}
                    <img
                      src={comparePairs[selectedCompareIndex].after.photoUrl}
                      alt="بعد العلاج"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Before photo (clipped overlay) */}
                    <div
                      className="absolute inset-0"
                      style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                    >
                      <img
                        src={comparePairs[selectedCompareIndex].before.photoUrl}
                        alt="قبل العلاج"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Slider handle */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-20 cursor-ew-resize"
                      style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
                    >
                      {/* Handle circle */}
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border border-white/80">
                        <div className="flex gap-0.5">
                          <div className="w-0 h-3 border-r border-gray-500" />
                          <div className="w-0 h-3 border-r border-gray-500" />
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    <Badge className="absolute top-3 right-3 bg-amber-500 text-white text-xs shadow-lg z-10">
                      قبل العلاج
                    </Badge>
                    <Badge className="absolute top-3 left-3 bg-emerald-500 text-white text-xs shadow-lg z-10">
                      بعد العلاج
                    </Badge>

                    {/* Drag instruction overlay */}
                    <AnimatePresence>
                      {!isDragging && (
                        <motion.div
                          className="absolute inset-0 flex items-center justify-center bg-black/20 z-30 cursor-ew-resize"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onMouseDown={() => setIsDragging(true)}
                          onTouchStart={() => setIsDragging(true)}
                        >
                          <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                            ← اسحب للمقارنة →
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Photo dates info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-amber-600 font-medium">قبل العلاج</p>
                        <p className="text-xs text-amber-800 truncate">
                          {formatDate(comparePairs[selectedCompareIndex].before.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-emerald-600 font-medium">بعد العلاج</p>
                        <p className="text-xs text-emerald-800 truncate">
                          {formatDate(comparePairs[selectedCompareIndex].after.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pair navigation */}
                  {comparePairs.length > 1 && (
                    <div className="flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompareIndex((prev) => Math.max(0, prev - 1))
                          setSliderPos(50)
                        }}
                        disabled={selectedCompareIndex === 0}
                        className="gap-1.5"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        السابق
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {selectedCompareIndex + 1} / {comparePairs.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCompareIndex((prev) => Math.min(comparePairs.length - 1, prev + 1))
                          setSliderPos(50)
                        }}
                        disabled={selectedCompareIndex === comparePairs.length - 1}
                        className="gap-1.5"
                      >
                        التالي
                        <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <GitCompare className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">لا توجد أزواج للمقارنة</p>
              <p className="text-xs text-muted-foreground mt-1">أضف صور قبل وبعد العلاج لتفعيل المقارنة</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
