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
import { ArrowRight, CalendarDays, Wallet, FileText, Camera, Trash2, Download, Upload } from 'lucide-react'
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
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="visits">الزيارات</TabsTrigger>
          <TabsTrigger value="photos">الصور ({patient.photos.length})</TabsTrigger>
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
