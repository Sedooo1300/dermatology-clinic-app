'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Plus, Pill, Trash2, Printer, Search, Eye, CalendarDays, User, ClipboardList, Sparkles, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn, formatDate, formatCurrency } from '@/lib/utils'

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

// Smart Prescription Templates - Dermatology focused
const PRESCRIPTION_TEMPLATES: Record<string, {
  label: string
  color: string
  diagnosis: string
  items: Array<{ medicineName: string; dosage: string; frequency: string; duration: string; instructions: string }>
  notes: string
}> = {
  acne_active: {
    label: 'حب الشباب النشط',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    diagnosis: 'حب الشباب الالتهابي النشط',
    items: [
      { medicineName: 'كبسولات دوكسيسايكلين 100mg', dosage: '100mg', frequency: 'مرة يومياً بعد العشاء', duration: '3 أشهر', instructions: 'مع كوب ماء كبير، تجنب التعرض المباشر للشمس' },
      { medicineName: 'كريم تريتينوين 0.025%', dosage: 'حبة صغيرة على الوجه', frequency: 'مساءً فقط', duration: '3 أشهر', instructions: 'وضع كمية صغيرة جداً على بشرة جافة تماماً، مع واقي شمس نهاراً' },
      { medicineName: 'غسول بنزويل بيروكسايد 5%', dosage: 'كمية مناسبة', frequency: 'صباحاً ومساءً', duration: '3 أشهر', instructions: 'غسل الوجه بلطف ثم الشطف جيداً بالماء' },
      { medicineName: 'كريم واقي شمس SPF50', dosage: 'طبقة كافية', frequency: 'صباحاً', duration: 'يومياً (مستمر)', instructions: 'إعادة التطبيق كل ساعتين عند التعرض للشمس' },
    ],
    notes: 'متابعة كل شهر لتقييم التحسن وتعديل العلاج حسب الاستجابة. إبلاغ المريض بضرورة استخدام واقي الشمس يومياً',
  },
  acne_maintenance: {
    label: 'حب شباب - متابعة',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    diagnosis: 'حب الشباب - مرحلة المتابعة',
    items: [
      { medicineName: 'كريم تريتينوين 0.05%', dosage: 'حبة صغيرة', frequency: 'مساءً', duration: 'مستمر', instructions: 'وضع على بشرة جافة مع تجنب منطقة العين' },
      { medicineName: 'كريم مرطب خالي من الزيوت', dosage: 'كمية مناسبة', frequency: 'صباحاً ومساءً', duration: 'مستمر', instructions: 'بعد التريتينوين بـ 20 دقيقة' },
      { medicineName: 'كريم واقي شمس SPF50', dosage: 'طبقة كافية', frequency: 'صباحاً', duration: 'يومياً', instructions: 'حماية من التصبغات الناتجة عن العلاج' },
    ],
    notes: 'المتابعة كل 3 أشهر. تقليل التريتينوين إذا حدث جفاف شديد',
  },
  hyperpigmentation: {
    label: 'تصبغات الجلد',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    diagnosis: 'فرط التصبغ التالي للالتهاب / الكلف / التصبغات',
    items: [
      { medicineName: 'كريم هيدروكينون 4%', dosage: 'طبقة رقيقة', frequency: 'مساءً', duration: '2-3 أشهر', instructions: 'على المناطق المصابة فقط، تجنب العين والشفاه' },
      { medicineName: 'كريم تريتينوين 0.025%', dosage: 'حبة صغيرة', frequency: 'مساءً (قبل الهيدروكينون بـ 20 دقيقة)', duration: '2-3 أشهر', instructions: 'يساعد على تجديد الخلايا وتوحيد اللون' },
      { medicineName: 'فيتامين C سيروم', dosage: '3-4 قطرات', frequency: 'صباحاً', duration: 'مستمر', instructions: 'يساعد في تفتيح البشرة ومكافحة الأكسدة' },
      { medicineName: 'كريم واقي شمس SPF50+', dosage: 'طبقة كافية', frequency: 'صباحاً كل ساعتين', duration: 'يومياً', instructions: 'ضروري جداً لمنع تفاقم التصبغات' },
      { medicineName: 'حمض أزيليك 10%', dosage: 'طبقة رقيقة', frequency: 'صباحاً (تحت الواقي)', duration: '2 أشهر', instructions: 'بديل آمن للهيدروكينون للحوامل' },
    ],
    notes: 'مراجعة كل شهر لمراقبة التحسن. التوقف عن الهيدروكينون بعد 3 أشهر واستخدام بدائل آمنة',
  },
  eczema: {
    label: 'أكزيما / التهاب جلد',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    diagnosis: 'التهاب الجلد التأتبي / الأكزيما',
    items: [
      { medicineName: 'كريم موميتازون فوروات 0.1%', dosage: 'طبقة رقيقة', frequency: 'مرة يومياً على المناطق المصابة', duration: 'أسبوعين ثم تقليل تدريجي', instructions: 'لا تستخدم على الوجه أكثر من 5 أيام' },
      { medicineName: 'مرهم إيمولينت / مرطب طبي', dosage: 'كمية وفيرة', frequency: 'بعد الاستحمام وعند الحاجة', duration: 'مستمر', instructions: 'وضع على بشرة رطبة بعد الاستحمام مباشرة' },
      { medicineName: 'كريم مضاد هيستامين (يومًا جل)', dosage: 'طبقة رقيقة', frequency: '2-3 مرات عند الحاجة', duration: 'حسب الحاجة', instructions: 'لتخفيف الحكة' },
      { medicineName: 'دش خفيف (pH متوازن)', dosage: 'استحمام قصير بماء فاتر', frequency: 'يومياً', duration: 'مستمر', instructions: 'تجنب الماء الساخن والصابون القاسي' },
    ],
    notes: 'تجنب المحفزات المعروفة. استخدام ملابس قطنية. ترطيب مستمر للجلد',
  },
  fungal: {
    label: 'فطريات جلدية',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    diagnosis: 'عدوى فطرية جلدية (سعفة / كانتيدا / قدم رياضي)',
    items: [
      { medicineName: 'كريم كيتوكونازول 2%', dosage: 'طبقة رقيقة', frequency: 'مرتين يومياً', duration: '2-4 أسابيع', instructions: 'الاستمرار أسبوع بعد زوال الأعراض' },
      { medicineName: 'كبسولات فلوكونازول 150mg', dosage: '150mg', frequency: 'أسبوعياً', duration: '4-6 أسابيع', instructions: 'مع الوجبة (في الحالات المقاومة)' },
      { medicineName: 'شامبو كيتوكونازول 2%', dosage: 'كمية مناسبة', frequency: 'مرتين أسبوعياً', duration: '4 أسابيع', instructions: 'في حالة سعفة الرأس: ترك 5 دقائق قبل الشطف' },
      { medicineName: 'بودرة تالك مضادة للفطريات', dosage: 'كمية مناسبة', frequency: 'صباحاً ومساءً', duration: 'مستمر', instructions: 'للمناطق الرطبة كالأقدام والفخذين' },
    ],
    notes: 'مراجعة بعد أسبوعين. الحفاظ على جفاف المنطقة المصابة. تغيير الملابس يومياً',
  },
  hair_loss: {
    label: 'تساقط شعر',
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    diagnosis: 'تساقط الشعر / الثعلبة',
    items: [
      { medicineName: 'مينوكسيديل 5% لوشن', dosage: '1 مل (7 بخات)', frequency: 'مرتين يومياً', duration: '6 أشهر على الأقل', instructions: 'وضع على فروة الرأس الجافة، تدليك بلطف' },
      { medicineName: 'فيناسترايد 1mg', dosage: 'قرص واحد', frequency: 'يومياً', duration: 'مستمر', instructions: 'للذكور فقط - يمنع تحول التستوستيرون إلى DHT' },
      { medicineName: 'شامبو كيتوكونازول 2%', dosage: 'كمية مناسبة', frequency: 'مرتين أسبوعياً', duration: 'مستمر', instructions: 'بديل للعلاج الموضعي الداعم' },
      { medicineName: 'فيتامينات الشعر (بيوتين + زنك)', dosage: 'حبة واحدة', frequency: 'يومياً', duration: '3 أشهر', instructions: 'داعم للشعر والأظافر' },
    ],
    notes: 'النتائج تظهر بعد 3-6 أشهر من الاستخدام المنتظم. مراجعة كل شهر',
  },
  psoriasis: {
    label: 'صدفية',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    diagnosis: 'الصدفية',
    items: [
      { medicineName: 'مرهم كالسيبوتريول 0.005%', dosage: 'طبقة رقيقة', frequency: 'مرتين يومياً', duration: '6-8 أسابيع', instructions: 'لا تتجاوز 100 جرام أسبوعياً' },
      { medicineName: 'كريم بيتاميثازون دايبروبيونات 0.05%', dosage: 'طبقة رقيقة', frequency: 'مرتين يومياً', duration: 'أسبوعين (بديل)', instructions: 'للمناطق السميكة فقط، تقليل تدريجي' },
      { medicineName: 'مرطب يوريا 10%', dosage: 'كمية وفيرة', frequency: 'بعد الاستحمام وعند الحاجة', duration: 'مستمر', instructions: 'يساعد في تقشير وترطيب البشرة' },
      { medicineName: 'دش زيت ساليسيليك', dosage: 'استحمام بماء فاتر', frequency: 'يومياً', duration: 'مستمر', instructions: 'إزالة القشور بلطف' },
    ],
    notes: 'تجنب المحفزات (الضغط النفسي، التدخين، بعض الأدوية). متابعة شهرية للتقييم',
  },
  anti_aging: {
    label: 'مكافحة الشيخوخة',
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    diagnosis: 'تجديد البشرة / مكافحة الشيخوخة',
    items: [
      { medicineName: 'كريم ريتينول 0.3%', dosage: 'حبة صغيرة', frequency: 'مساءً', duration: 'مستمر', instructions: 'البدء بمرتين أسبوعياً ثم زيادة تدريجياً' },
      { medicineName: 'سيروم فيتامين C 20%', dosage: '3-4 قطرات', frequency: 'صباحاً', duration: 'مستمر', instructions: 'تحفيز الكولاجين ومكافحة الجذور الحرة' },
      { medicineName: 'كريم هيالورونيك أسيد', dosage: 'كمية مناسبة', frequency: 'صباحاً ومساءً', duration: 'مستمر', instructions: 'ترطيب عميق وتملأ الخطوط الدقيقة' },
      { medicineName: 'كريم واقي شمس SPF50', dosage: 'طبقة كافية', frequency: 'صباحاً', duration: 'يومياً', instructions: 'أساسي مع أي علاج مضاد للشيخوخة' },
    ],
    notes: 'نتائج تدريجية خلال 8-12 أسبوع. تجنب الجمع بين الريتينول والحمض في نفس الوقت',
  },
  wound_care: {
    label: 'عناية بالجروح',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    diagnosis: 'عناية بالجروح / ما بعد الإجراءات',
    items: [
      { medicineName: 'مضاد حيوي موضعي (فوسيدين / ميبو)', dosage: 'طبقة رقيقة', frequency: 'مرتين يومياً بعد التنظيف', duration: '7-10 أيام', instructions: 'تنظيف الجرح بالمحلول الملحي أولاً' },
      { medicineName: 'ضمادات شاش معقمة', dosage: 'حسب حجم الجرح', frequency: 'تغيير يومياً أو عند البلل', duration: 'حتى الشفاء', instructions: 'تغطية الجرح لمنع التلوث' },
      { medicineName: 'مسكن ألم (باراسيتامول 500mg)', dosage: 'حبة واحدة', frequency: 'كل 6-8 ساعات عند الحاجة', duration: '5 أيام', instructions: 'الحد الأقصى 4 جرعات يومياً' },
      { medicineName: 'كريم سيليكون (للندبات)', dosage: 'طبقة رقيقة', frequency: 'مرتين يومياً', duration: '3-6 أشهر', instructions: 'البدء بعد التئام الجرح مباشرة لمنع التندب' },
    ],
    notes: 'مراجعة بعد 48 ساعة ثم كل 3 أيام. إبلاغ المريض بعلامات العدوى (احمرار، تورم، ارتفاع حرارة)',
  },
}

const commonMedicines = Object.values(PRESCRIPTION_TEMPLATES).flatMap(t => t.items.map(i => i.medicineName)).filter((v, i, a) => a.indexOf(v) === i)

export function PrescriptionsView() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  // Form state
  const [formPatientId, setFormPatientId] = useState('')
  const [formDiagnosis, setFormDiagnosis] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formItems, setFormItems] = useState<Array<{
    medicineName: string; dosage: string; frequency: string; duration: string; instructions: string; quantity: string
  }>>([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', quantity: '' }])

  const [showMedicineSuggestions, setShowMedicineSuggestions] = useState<number | null>(null)
  const [diagnosisSuggestions, setDiagnosisSuggestions] = useState(false)

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
    p.notes?.includes(searchQuery) ||
    p.items.some(i => i.medicineName.includes(searchQuery))
  )

  // Smart diagnosis suggestions
  const filteredTemplates = useMemo(() => {
    if (!formDiagnosis.trim()) return Object.entries(PRESCRIPTION_TEMPLATES)
    const q = formDiagnosis.trim().toLowerCase()
    return Object.entries(PRESCRIPTION_TEMPLATES).filter(([key, t]) =>
      key.includes(q) || t.label.includes(q) || t.diagnosis.includes(q)
    )
  }, [formDiagnosis])

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
    setShowTemplates(false)
  }

  // Auto-fill from template
  const applyTemplate = (key: string) => {
    const template = PRESCRIPTION_TEMPLATES[key]
    if (!template) return
    setFormDiagnosis(template.diagnosis)
    setFormNotes(template.notes)
    setFormItems(template.items.map(item => ({
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
      quantity: '',
    })))
    setShowTemplates(false)
    toast.success(`تم تطبيق قالب "${template.label}"`)
  }

  const handleCreate = async () => {
    const selectedPatient = patients.find((p) => p.id === formPatientId)
    if (!selectedPatient) {
      toast.error('يرجى اختيار المريض')
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
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-weight: bold; width: 5%; text-align: center; background: #f0fdfa;">${idx + 1}</td>
        <td style="padding: 12px 8px; font-weight: bold; font-size: 13px;">${item.medicineName}</td>
        <td style="padding: 12px 8px; font-size: 12px; color: #555;">${item.dosage || '-'}</td>
        <td style="padding: 12px 8px; font-size: 12px; color: #555;">${item.frequency || '-'}</td>
        <td style="padding: 12px 8px; font-size: 12px; color: #555;">${item.duration || '-'}</td>
        <td style="padding: 12px 8px; font-size: 11px; color: #666; max-width: 200px;">${item.instructions || '-'}</td>
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
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Cairo', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px 20px; direction: rtl; color: #1a1a1a; }
            .header { text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 25px; position: relative; }
            .header::after { content: ''; position: absolute; bottom: -6px; right: 0; left: 0; height: 1px; background: #e5e7eb; }
            .header h1 { color: #0d9488; margin: 0; font-size: 26px; font-weight: 700; }
            .header .subtitle { color: #666; margin: 5px 0 0; font-size: 14px; }
            .header .clinic-info { color: #999; font-size: 11px; margin-top: 8px; }
            .patient-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; background: linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%); padding: 18px 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #ccfbf1; }
            .patient-info .label { font-size: 11px; color: #888; margin-bottom: 3px; }
            .patient-info .value { font-weight: 600; font-size: 14px; }
            .diagnosis { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); padding: 14px 20px; border-radius: 12px; margin-bottom: 20px; font-weight: 700; font-size: 15px; border: 1px solid #fde68a; display: flex; align-items: center; gap: 8px; }
            .diagnosis::before { content: '◎'; color: #f59e0b; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            thead th { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 12px 8px; text-align: right; font-size: 12px; font-weight: 600; }
            tbody tr:hover { background: #f9fafb; }
            .notes { background: #f8fafc; padding: 14px 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
            .notes .title { font-weight: 700; font-size: 13px; margin-bottom: 5px; color: #475569; }
            .notes .content { font-size: 12px; color: #64748b; line-height: 1.8; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
            .footer .clinic-name { color: #0d9488; font-weight: 700; font-size: 16px; }
            .footer .date { color: #999; font-size: 11px; margin-top: 5px; }
            .signature { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
            .signature .sig-line { border-bottom: 1px solid #ccc; width: 200px; text-align: center; padding-bottom: 5px; color: #999; font-size: 11px; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(13, 148, 136, 0.03); font-weight: bold; pointer-events: none; }
            @media print { .watermark { display: none; } }
          </style>
        </head>
        <body>
          <div class="watermark">عيادة المغازى</div>
          <div class="header">
            <h1>عيادة المغازى الجلدية</h1>
            <p class="subtitle">وصفة طبية</p>
            <p class="clinic-info">أمراض جلدية · تجميل · ليزر</p>
          </div>
          <div class="patient-info">
            <div><div class="label">المريض</div><div class="value">${patient.name}</div></div>
            ${patient.phone ? `<div><div class="label">الهاتف</div><div class="value">${patient.phone}</div></div>` : '<div></div>'}
            <div><div class="label">التاريخ</div><div class="value">${new Date(prescription.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</div></div>
          </div>
          ${prescription.diagnosis ? `<div class="diagnosis">${prescription.diagnosis}</div>` : ''}
          <table>
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th>الدواء</th>
                <th>الجرعة</th>
                <th>التكرار</th>
                <th>المدة</th>
                <th>تعليمات</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          ${prescription.notes ? `<div class="notes"><div class="title">ملاحظات وتعليمات</div><div class="content">${prescription.notes}</div></div>` : ''}
          <div class="signature">
            <div class="sig-line">توقيع الطبيب</div>
            <div class="sig-line">ختم العيادة</div>
          </div>
          <div class="footer">
            <div class="clinic-name">عيادة المغازى الجلدية</div>
            <div class="date">تاريخ الإصدار: ${new Date(prescription.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
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
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                وصفة طبية ذكية
              </DialogTitle>
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

              {/* Smart Diagnosis with Templates */}
              <div className="relative">
                <Label className="flex items-center gap-1">
                  التشخيص
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </Label>
                <Input
                  className="mt-1"
                  placeholder="اكتب التشخيص أو اختر من القوالب المقترحة..."
                  value={formDiagnosis}
                  onChange={(e) => setFormDiagnosis(e.target.value)}
                  onFocus={() => setDiagnosisSuggestions(true)}
                  onBlur={() => setTimeout(() => setDiagnosisSuggestions(false), 300)}
                />
                {diagnosisSuggestions && formDiagnosis.length > 0 && filteredTemplates.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-popover border rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                    <div className="p-2 border-b">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> اقتراحات ذكية - اضغط للتطبيق التلقائي
                      </p>
                    </div>
                    {filteredTemplates.map(([key, t]) => (
                      <button
                        key={key}
                        className="w-full text-right px-4 py-3 hover:bg-muted transition-colors border-b last:border-0"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          applyTemplate(key)
                          setDiagnosisSuggestions(false)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', t.color)}>{t.label}</span>
                          <span className="text-[10px] text-muted-foreground">{t.items.length} أدوية</span>
                        </div>
                        <p className="text-sm font-medium mt-1">{t.diagnosis}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Templates Button */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="gap-2 w-full justify-center"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  {showTemplates ? 'إخفاء القوالب' : 'عرض القوالب الجاهزة'}
                </Button>
                <AnimatePresence>
                  {showTemplates && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                        {Object.entries(PRESCRIPTION_TEMPLATES).map(([key, t]) => (
                          <motion.button
                            key={key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => applyTemplate(key)}
                            className={cn(
                              'p-3 rounded-xl border text-right transition-all hover:shadow-md',
                              'bg-card hover:bg-accent/50',
                              formDiagnosis === t.diagnosis && 'ring-2 ring-primary/30 border-primary/30'
                            )}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={cn('text-[9px]', t.color)}>{t.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{t.diagnosis}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{t.items.length} أدوية</p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Pill className="w-3 h-3" /> دواء #{index + 1}
                        </span>
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
                <Label>ملاحظات وارشادات المريض</Label>
                <Textarea
                  className="mt-1"
                  placeholder="ملاحظات إضافية للوصفة وتعليمات للمريض..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline">إلغاء</Button>
              </DialogClose>
              <Button onClick={handleCreate} className="bg-primary text-primary-foreground gap-2">
                <FileText className="w-4 h-4" />
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
          placeholder="بحث بالاسم أو التشخيص أو اسم الدواء..."
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
                          <span>·</span>
                          <span>{prescription.items.length} أدوية</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {prescription.items.slice(0, 4).map((item, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {item.medicineName.length > 20 ? item.medicineName.substring(0, 20) + '...' : item.medicineName}
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
