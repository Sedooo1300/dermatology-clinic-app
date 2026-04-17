'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pill, Trash2, Printer, Search, Eye, CalendarDays, User, ClipboardList } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PrescriptionItem {
  id: string
  medicineName: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
  instructions?: string | null
  quantity?: number | null
}

interface Prescription {
  id: string
  patientId: string
  visitId?: string | null
  diagnosis?: string | null
  notes?: string | null
  createdAt: string
  patient: { id: string; name: string; phone?: string | null }
  items: PrescriptionItem[]
}

interface Patient {
  id: string
  name: string
  phone?: string | null
}

const commonMedicines = [
  'كريم تريتينوين 0.025%', 'كريم تريتينوين 0.05%', 'كريم هيدروكينون 4%',
  'كريم بانتينول', 'كريم موميتازون', 'كريم بيتاميثازون',
  'كبسولات دوكسيسايكلين 100mg', 'كبسولات مينوسايكلين',
  'كبسولات أزيثرومايسين', 'كبسولات إيزوتريتينوين 10mg', 'كبسولات إيزوتريتينوين 20mg',
  'شامبو كيتوكونازول', 'كريم كيتوكونازول', 'كريم كلوتريمازول',
  'فيتامين C', 'فيتامين E', 'حمض الفوليك', 'زنك',
  'كريم واقي شمس SPF50', 'كريم مرطب',
]

export function PrescriptionsView() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null)

  // Form state
  const [formPatientId, setFormPatientId] = useState('')
  const [formDiagnosis, setFormDiagnosis] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formItems, setFormItems] = useState<Array<{
    medicineName: string; dosage: string; frequency: string; duration: string; instructions: string; quantity: string
  }>>([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }])

  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState<number | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [prescriptionsRes, patientsRes] = await Promise.all([
        fetch('/api/prescriptions'),
        fetch('/api/patients'),
      ])
      const prescriptionsData = await prescriptionsRes.json()
      const patientsData = await patientsRes.json()
      setPrescriptions(prescriptionsData)
      setPatients(patientsData.patients || patientsData)
    } catch (err) {
      console.error('Failed to fetch:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter((p) =>
    p.patient.name.includes(searchQuery) ||
    p.diagnosis?.includes(searchQuery) ||
    p.notes?.includes(searchQuery)
  )

  const addItem = () => {
    setFormItems([...formItems, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }])
  }

  const removeItem = (index: number) => {
    if (formItems.length <= 1) return
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...formItems]
    updated[index] = { ...updated[index], [field]: value }
    setFormItems(updated)
  }

  const resetForm = () => {
    setFormPatientId('')
    setFormDiagnosis('')
    setFormNotes('')
    setFormItems([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }])
  }

  const handleCreate = async () => {
    const selectedPatient = patients.find((p) => p.id === formPatientId)
    if (!selectedPatient) {
      toast.error('يرجى اختيار مريض')
      return
    }
    if (formItems.every((i) => !i.medicineName.trim())) {
      toast.error('يرجى إضافة دواء واحد على الأقل')
      return
    }

    try {
      const validItems = formItems.filter((i) => i.medicineName.trim())
      await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formPatientId,
          diagnosis: formDiagnosis,
          notes: formNotes,
          items: validItems.map((i) => ({
            medicineName: i.medicineName,
            dosage: i.dosage || null,
            frequency: i.frequency || null,
            duration: i.duration || null,
            instructions: i.instructions || null,
            quantity: i.quantity ? parseInt(i.quantity) : null,
          })),
        }),
      })
      toast.success('تم حفظ الوصفة بنجاح')
      setShowCreateDialog(false)
      resetForm()
      fetchData()
    } catch {
      toast.error('خطأ في حفظ الوصفة')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' })
      toast.success('تم حذف الوصفة')
      fetchData()
    } catch {
      toast.error('خطأ في حذف الوصفة')
    }
  }

  const handlePrint = (prescription: Prescription) => {
    const patient = prescription.patient
    const itemsHtml = prescription.items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px; font-weight: bold; width: 5%;">${idx + 1}</td>
        <td style="padding: 8px; font-weight: bold;">${item.medicineName}</td>
        <td style="padding: 8px;">${item.dosage || '-'}</td>
        <td style="padding: 8px;">${item.frequency || '-'}</td>
        <td style="padding: 8px;">${item.duration || '-'}</td>
        <td style="padding: 8px;">${item.instructions || '-'}</td>
      </tr>
    `).join('')

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <title>وصفة طبية - ${patient.name}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; direction: rtl; }
            .header { text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { color: #0d9488; margin: 0; font-size: 24px; }
            .header p { color: #666; margin: 5px 0 0; }
            .patient-info { display: flex; justify-content: space-between; background: #f0fdfa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .diagnosis { background: #fef3c7; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #0d9488; color: white; padding: 10px 8px; text-align: right; }
            .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #888; }
            .notes { background: #f5f5f5; padding: 10px 15px; border-radius: 8px; margin-bottom: 20px; }
            .signature { margin-top: 60px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>عيادة المغازى الجلدية</h1>
            <p>وصفة طبية</p>
          </div>
          <div class="patient-info">
            <div><strong>المريض:</strong> ${patient.name}</div>
            ${patient.phone ? `<div><strong>الهاتف:</strong> ${patient.phone}</div>` : ''}
            <div><strong>التاريخ:</strong> ${new Date(prescription.createdAt).toLocaleDateString('ar-EG')}</div>
          </div>
          ${prescription.diagnosis ? `<div class="diagnosis">التشخيص: ${prescription.diagnosis}</div>` : ''}
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الدواء</th>
                <th>الجرعة</th>
                <th>التكرار</th>
                <th>المدة</th>
                <th>تعليمات</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          ${prescription.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${prescription.notes}</div>` : ''}
          <div class="signature">
            <p>توقيع الطبيب: _______________</p>
          </div>
          <div class="footer">جلسات عيادة المغازى الجلدية</div>
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">الوصفات الطبية</h2>
          <Badge variant="secondary">{prescriptions.length}</Badge>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              وصفة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>وصفة طبية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Patient Selection */}
              <div>
                <Label>المريض *</Label>
                <select
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                >
                  <option value="">اختر المريض...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.phone ? `- ${p.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diagnosis */}
              <div>
                <Label>التشخيص</Label>
                <Input
                  className="mt-1"
                  placeholder="مثال: حب الشباب الالتهابي"
                  value={formDiagnosis}
                  onChange={(e) => setFormDiagnosis(e.target.value)}
                />
              </div>

              {/* Medicine Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>الأدوية *</Label>
                  <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                    <Plus className="w-3 h-3" />
                    إضافة دواء
                  </Button>
                </div>
                <div className="space-y-3">
                  {formItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl border bg-muted/30 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">دواء #{index + 1}</span>
                        {formItems.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(index)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="اسم الدواء *"
                          value={item.medicineName}
                          onChange={(e) => updateItem(index, 'medicineName', e.target.value)}
                          onFocus={() => setShowMedicineSuggestions(index)}
                          onBlur={() => setTimeout(() => setShowMedicineSuggestions(null), 200)}
                        />
                        {showMedicineSuggestions === index && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                            {commonMedicines
                              .filter((m) => m.includes(item.medicineName) && item.medicineName.length > 0)
                              .slice(0, 8)
                              .map((med) => (
                                <button
                                  key={med}
                                  className="w-full text-right px-3 py-2 text-sm hover:bg-muted transition-colors"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    updateItem(index, 'medicineName', med)
                                    setShowMedicineSuggestions(null)
                                  }}
                                >
                                  {med}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="الجرعة (مثال: 500mg)" value={item.dosage} onChange={(e) => updateItem(index, 'dosage', e.target.value)} />
                        <Input placeholder="التكرار (مثال: مرتين يومياً)" value={item.frequency} onChange={(e) => updateItem(index, 'frequency', e.target.value)} />
                        <Input placeholder="المدة (مثال: 7 أيام)" value={item.duration} onChange={(e) => updateItem(index, 'duration', e.target.value)} />
                        <Input placeholder="الكمية" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} type="number" />
                      </div>
                      <Textarea
                        placeholder="تعليمات خاصة..."
                        value={item.instructions}
                        onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                        rows={2}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label>ملاحظات</Label>
                <Textarea
                  className="mt-1"
                  placeholder="ملاحظات إضافية للوصفة..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button onClick={handleCreate} className="bg-primary text-primary-foreground">
                حفظ الوصفة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو التشخيص..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Prescriptions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد وصفات طبية</p>
            <p className="text-sm text-muted-foreground mt-1">اضغط على &quot;وصفة جديدة&quot; لإنشاء واحدة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredPrescriptions.map((prescription, index) => (
              <motion.div
                key={prescription.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-primary" />
                          <p className="font-bold text-sm">{prescription.patient.name}</p>
                          {prescription.diagnosis && (
                            <Badge variant="outline" className="text-[10px]">{prescription.diagnosis}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(prescription.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prescription.items.slice(0, 4).map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {item.medicineName}
                              {item.dosage && ` - ${item.dosage}`}
                            </Badge>
                          ))}
                          {prescription.items.length > 4 && (
                            <Badge variant="secondary" className="text-[10px]">
                              +{prescription.items.length - 4} أخرى
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewingPrescription(prescription)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(prescription)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الوصفة</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف هذه الوصفة؟</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(prescription.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
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
        </div>
      )}

      {/* View Prescription Dialog */}
      <Dialog open={!!viewingPrescription} onOpenChange={() => setViewingPrescription(null)}>
        <DialogContent className="max-w-lg">
          {viewingPrescription && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  وصفة طبية - {viewingPrescription.patient.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {viewingPrescription.diagnosis && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                    <p className="text-xs text-muted-foreground mb-1">التشخيص</p>
                    <p className="font-medium text-sm">{viewingPrescription.diagnosis}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <p className="font-medium text-sm">الأدوية ({viewingPrescription.items.length})</p>
                  {viewingPrescription.items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{idx + 1}</Badge>
                        <p className="font-medium text-sm">{item.medicineName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        {item.dosage && <p>الجرعة: {item.dosage}</p>}
                        {item.frequency && <p>التكرار: {item.frequency}</p>}
                        {item.duration && <p>المدة: {item.duration}</p>}
                        {item.quantity && <p>الكمية: {item.quantity}</p>}
                      </div>
                      {item.instructions && (
                        <p className="text-xs text-primary mt-1">* {item.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
                {viewingPrescription.notes && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                    <p className="text-sm">{viewingPrescription.notes}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {new Date(viewingPrescription.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handlePrint(viewingPrescription)} className="gap-2">
                  <Printer className="w-4 h-4" />
                  طباعة
                </Button>
                <DialogClose asChild>
                  <Button>إغلاق</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
