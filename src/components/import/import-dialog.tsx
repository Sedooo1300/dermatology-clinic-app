'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Users,
  CalendarDays,
  Scissors,
  Wallet,
  ArrowRightLeft,
  X,
  Loader2,
  Database,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type EntityType = 'patients' | 'visits' | 'sessionTypes' | 'expenses' | 'revenues'
type ImportMode = 'replace' | 'merge' | 'add'

interface FileData {
  fileName: string
  fileSize: number
  fileType: 'json' | 'csv' | 'xlsx'
  rawSheetNames?: string[]
  sheets: Record<string, Record<string, unknown>[]>
  detectedType: EntityType | null
}

interface ImportResult {
  success: boolean
  message: string
  total: number
  success: number
  failed: number
  skipped: number
  errors: { row: number; message: string }[]
}

const ENTITY_OPTIONS: { id: EntityType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'patients', label: 'المرضى', icon: Users, color: 'text-blue-500' },
  { id: 'visits', label: 'الزيارات', icon: CalendarDays, color: 'text-green-500' },
  { id: 'sessionTypes', label: 'أنواع الجلسات', icon: Scissors, color: 'text-purple-500' },
  { id: 'expenses', label: 'المصروفات', icon: Wallet, color: 'text-red-500' },
  { id: 'revenues', label: 'الإيرادات', icon: Wallet, color: 'text-emerald-500' },
]

const MODE_OPTIONS: { id: ImportMode; label: string; desc: string; color: string }[] = [
  { id: 'add', label: 'إضافة جديدة', desc: 'إضافة فقط بدون حذف أو تعديل البيانات الحالية', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' },
  { id: 'merge', label: 'دمج ذكي', desc: 'تخطي السجلات المكررة وإضافة الجديدة فقط', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { id: 'replace', label: 'استبدال الكل', desc: 'حذف جميع البيانات الحالية واستبدالها بالجديدة', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
]

const AUTO_DETECT_KEYWORDS: Record<EntityType, string[]> = {
  patients: ['name', 'patient', 'phone', 'age', 'gender', 'mobile', 'الاسم', 'المريض', 'الموبايل', 'العمر'],
  visits: ['visit', 'patient', 'session', 'date', 'price', 'paid', 'الزيارة', 'السعر', 'المدفوع', 'المتبقي'],
  sessionTypes: ['session_type', 'sessiontype', 'type', 'price', 'الجلسة', 'النوع', 'اسم الجلسة'],
  expenses: ['expense', 'category', 'cost', 'المصروف', 'التصنيف', 'التكلفة'],
  revenues: ['revenue', 'income', 'amount', 'الإيراد', 'الدخل', 'المبلغ'],
}

function detectEntityType(data: Record<string, unknown>[]): EntityType | null {
  if (!data || data.length === 0) return null
  const columns = Object.keys(data[0]).map(k => k.toLowerCase())

  let bestMatch: EntityType | null = null
  let bestScore = 0

  for (const [entity, keywords] of Object.entries(AUTO_DETECT_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (columns.some(col => col.includes(kw.toLowerCase()))) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = entity as EntityType
    }
  }

  return bestScore >= 1 ? bestMatch : null
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  switch (type) {
    case 'json': return FileJson
    case 'xlsx': return FileSpreadsheet
    case 'csv': return FileText
    default: return FileText
  }
}

function getFileTypeLabel(type: string) {
  switch (type) {
    case 'json': return 'JSON'
    case 'xlsx': return 'Excel'
    case 'csv': return 'CSV'
    default: return type.toUpperCase()
  }
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length < 2) return []

  // Detect delimiter
  const firstLine = lines[0]
  const commaCount = (firstLine.match(/,/g) || []).length
  const tabCount = (firstLine.match(/\t/g) || []).length
  const semicolonCount = (firstLine.match(/;/g) || []).length
  let delimiter = ','
  if (tabCount > commaCount && tabCount > semicolonCount) delimiter = '\t'
  else if (semicolonCount > commaCount) delimiter = ';'

  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''))
  const rows: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''))
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue
    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      if (idx < values.length) {
        const val = values[idx]
        // Try to parse numbers
        const num = Number(val)
        row[h] = val !== '' && !isNaN(num) ? num : val
      }
    })
    rows.push(row)
  }

  return rows
}

async function parseExcel(buffer: ArrayBuffer): Promise<{ sheets: Record<string, Record<string, unknown>[]>; sheetNames: string[] }> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheets: Record<string, Record<string, unknown>[]> = {}
  const sheetNames: string[] = []

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    if (jsonData.length > 0) {
      sheets[name] = jsonData
      sheetNames.push(name)
    }
  }

  return { sheets, sheetNames }
}

async function parseFile(file: File): Promise<FileData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  let fileType: 'json' | 'csv' | 'xlsx' = 'json'

  if (ext === 'csv' || ext === 'tsv') fileType = 'csv'
  else if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx'
  else if (ext === 'json') fileType = 'json'
  else {
    // Try to detect from content
    const text = await file.text()
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) fileType = 'json'
    else fileType = 'csv'
  }

  const sheets: Record<string, Record<string, unknown>[]> = {}

  if (fileType === 'json') {
    const text = await file.text()
    const parsed = JSON.parse(text)

    if (Array.isArray(parsed)) {
      sheets['Sheet1'] = parsed
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Check if it's a backup format with multiple entity arrays
      const entityKeys = ['patients', 'visits', 'sessionTypes', 'expenses', 'revenues', 'alerts', 'photos', 'laserTreatments', 'prescriptions', 'diagnoses']
      const foundKeys = entityKeys.filter(k => Array.isArray(parsed[k]))
      if (foundKeys.length > 0) {
        for (const key of foundKeys) {
          sheets[key] = parsed[key]
        }
      } else {
        // Try to find array values
        for (const [key, value] of Object.entries(parsed)) {
          if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            sheets[key] = value
          }
        }
      }
      // If still no sheets found, try first array-like property
      if (Object.keys(sheets).length === 0) {
        for (const [key, value] of Object.entries(parsed)) {
          if (Array.isArray(value)) {
            sheets[key] = value
            break
          }
        }
      }
    }
  } else if (fileType === 'csv') {
    const text = await file.text()
    sheets['Sheet1'] = parseCSV(text)
  } else if (fileType === 'xlsx') {
    const buffer = await file.arrayBuffer()
    const result = await parseExcel(buffer)
    Object.assign(sheets, result.sheets)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType,
      rawSheetNames: result.sheetNames,
      sheets,
      detectedType: null,
    }
  }

  const firstSheetData = Object.values(sheets)[0] || []
  const detectedType = detectEntityType(firstSheetData)

  return {
    fileName: file.name,
    fileSize: file.size,
    fileType,
    rawSheetNames: Object.keys(sheets),
    sheets,
    detectedType,
  }
}

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [entityType, setEntityType] = useState<EntityType | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>('add')
  const [skipErrors, setSkipErrors] = useState(true)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep('upload')
    setFileData(null)
    setSelectedSheet('')
    setEntityType(null)
    setImportMode('add')
    setSkipErrors(true)
    setImportResult(null)
    setIsDragOver(false)
    setIsProcessing(false)
  }, [])

  const handleClose = useCallback(() => {
    onOpenChange(false)
    setTimeout(resetState, 300)
  }, [onOpenChange, resetState])

  const handleFile = useCallback(async (file: File) => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('حجم الملف أكبر من 10 ميجابايت')
      return
    }

    setIsProcessing(true)
    try {
      const parsed = await parseFile(file)
      setFileData(parsed)

      const sheetNames = Object.keys(parsed.sheets)
      if (sheetNames.length === 0) {
        toast.error('لم يتم العثور على بيانات في الملف')
        setIsProcessing(false)
        return
      }

      setSelectedSheet(sheetNames[0])
      setEntityType(parsed.detectedType)
      setStep('preview')
    } catch (err) {
      toast.error('فشل في قراءة الملف - تأكد من صحته')
      console.error('Parse error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const currentData = fileData?.sheets[selectedSheet] || []
  const previewData = currentData.slice(0, 10)
  const columns = previewData.length > 0 ? Object.keys(previewData[0]) : []

  const handleImport = async () => {
    if (!entityType || !currentData.length) return

    setStep('importing')
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          data: currentData,
          mode: importMode,
          skipErrors,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        setImportResult(result)
        setStep('result')
        toast.success(result.message || 'تم الاستيراد بنجاح')
      } else {
        toast.error(result.error || 'فشل في الاستيراد')
        setStep('preview')
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم')
      setStep('preview')
    }
  }

  // Download sample template
  const downloadTemplate = (type: EntityType) => {
    const templates: Record<EntityType, { headers: string[]; rows: string[][] }> = {
      patients: {
        headers: ['الاسم', 'الموبايل', 'العمر', 'الجنس', 'ملاحظات'],
        rows: [
          ['أحمد محمد', '01012345678', '30', 'ذكر', 'حالة جلدية'],
          ['فاطمة علي', '01198765432', '25', 'أنثى', ''],
        ],
      },
      visits: {
        headers: ['اسم المريض', 'اسم الجلسة', 'التاريخ', 'السعر', 'المدفوع', 'المتبقي', 'ملاحظات'],
        rows: [
          ['أحمد محمد', 'كشف', '2025-01-15', '500', '500', '0', 'متابعة'],
          ['فاطمة علي', 'تنظيف بشرة', '2025-01-16', '300', '200', '100', ''],
        ],
      },
      sessionTypes: {
        headers: ['الاسم', 'السعر', 'الوصف'],
        rows: [
          ['كشف', '500', 'كشف عيادة'],
          ['تنظيف بشرة', '300', 'تنظيف البشرة بالكامل'],
          ['حب شباب', '400', 'علاج حب الشباب'],
        ],
      },
      expenses: {
        headers: ['التصنيف', 'المبلغ', 'الوصف', 'التاريخ'],
        rows: [
          ['إيجار', '5000', 'إيجار العيادة الشهري', '2025-01-01'],
          ['مستلزمات', '1200', 'مستلزمات طبية', '2025-01-05'],
        ],
      },
      revenues: {
        headers: ['التصنيف', 'المبلغ', 'الوصف', 'التاريخ'],
        rows: [
          ['جلسات', '5000', 'إيراد الجلسات اليوم', '2025-01-15'],
          ['كشف', '2000', 'إيراد الكشوف', '2025-01-15'],
        ],
      },
    }

    const template = templates[type]
    const csvContent = [
      template.headers.join(','),
      ...template.rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-${type}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('تم تحميل القالب')
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload className="w-5 h-5 text-primary" />
            استيراد البيانات
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            استيراد بيانات من ملفات JSON أو CSV أو Excel
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
                    transition-all duration-200
                    ${isDragOver
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".json,.csv,.tsv,.xlsx,.xls"
                    onChange={handleFileInput}
                  />
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">جاري قراءة الملف...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="text-base font-medium">
                          {isDragOver ? 'أفلت الملف هنا' : 'اسحب الملف وأفلته هنا'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          أو اضغط لاختيار ملف
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="gap-1">
                          <FileJson className="w-3 h-3" /> JSON
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <FileSpreadsheet className="w-3 h-3" /> Excel
                        </Badge>
                        <Badge variant="secondary" className="gap-1">
                          <FileText className="w-3 h-3" /> CSV
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Supported Formats Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs">
                    <FileJson className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">JSON</p>
                      <p className="text-muted-foreground">نسخة احتياطية أو مصفوفة بيانات</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Excel (.xlsx)</p>
                      <p className="text-muted-foreground">ورقة أو أكثر من البيانات</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 text-xs">
                    <FileText className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">CSV / TSV</p>
                      <p className="text-muted-foreground">بيانات نصية مفصولة بفاصلة</p>
                    </div>
                  </div>
                </div>

                {/* Templates Download */}
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    قوالب جاهزة للتحميل:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ENTITY_OPTIONS.map(opt => (
                      <Button
                        key={opt.id}
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={(e) => { e.stopPropagation(); downloadTemplate(opt.id) }}
                      >
                        <opt.icon className="w-3.5 h-3.5" />
                        {opt.label}
                        <Download className="w-3 h-3 opacity-50" />
                      </Button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Preview & Configure */}
            {step === 'preview' && fileData && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* File Info */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                  {(() => {
                    const Icon = getFileIcon(fileData.fileType)
                    return <Icon className="w-5 h-5 text-primary shrink-0" />
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileData.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {getFileTypeLabel(fileData.fileType)} • {formatFileSize(fileData.fileSize)} • {currentData.length} سجل
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => { setStep('upload'); setFileData(null) }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Sheet Selection (Excel) */}
                {Object.keys(fileData.sheets).length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">اختر ورقة البيانات</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(fileData.sheets).map(sheetName => (
                        <Button
                          key={sheetName}
                          variant={selectedSheet === sheetName ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => {
                            setSelectedSheet(sheetName)
                            const data = fileData.sheets[sheetName]
                            setEntityType(detectEntityType(data))
                          }}
                        >
                          <FileSpreadsheet className="w-3 h-3 ml-1" />
                          {sheetName}
                          <Badge variant="secondary" className="mr-1 text-[10px] px-1.5">
                            {fileData.sheets[sheetName].length}
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entity Type Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">نوع البيانات</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ENTITY_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setEntityType(opt.id)}
                        className={`
                          flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-right
                          ${entityType === opt.id
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent hover:border-border bg-muted/30'
                          }
                        `}
                      >
                        <opt.icon className={`w-4 h-4 shrink-0 ${opt.color}`} />
                        <span className="text-sm font-medium">{opt.label}</span>
                        {fileData.detectedType === opt.id && (
                          <Badge variant="secondary" className="mr-auto text-[10px] px-1.5 bg-primary/10 text-primary">
                            مقترح
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Import Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">طريقة الاستيراد</Label>
                  <div className="space-y-2">
                    {MODE_OPTIONS.map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setImportMode(mode.id)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right
                          ${importMode === mode.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:border-border bg-muted/30'
                          }
                        `}
                      >
                        <ArrowRightLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{mode.label}</p>
                          <p className="text-xs text-muted-foreground">{mode.desc}</p>
                        </div>
                        {importMode === mode.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                        {importMode === 'replace' && mode.id === 'replace' && (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skip Errors */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">تخطي الأخطاء</p>
                    <p className="text-xs text-muted-foreground">استمرار الاستيراد حتى مع وجود سجلات خاطئة</p>
                  </div>
                  <Switch checked={skipErrors} onCheckedChange={setSkipErrors} />
                </div>

                {/* Data Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      معاينة البيانات (أول {Math.min(10, currentData.length)} من {currentData.length})
                    </Label>
                  </div>
                  <div className="rounded-xl border overflow-hidden">
                    <ScrollArea className="max-h-48">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-right font-medium text-muted-foreground w-8">#</th>
                            {columns.map(col => (
                              <th key={col} className="px-3 py-2 text-right font-medium text-muted- whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, idx) => (
                            <tr key={idx} className="border-t border-border/50 hover:bg-muted/20">
                              <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                              {columns.map(col => (
                                <td key={col} className="px-3 py-2 max-w-[150px] truncate">
                                  {String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setStep('upload'); setFileData(null) }}
                  >
                    رجوع
                  </Button>
                  <Button
                    className="flex-1 bg-primary text-primary-foreground"
                    disabled={!entityType || currentData.length === 0}
                    onClick={handleImport}
                  >
                    <Database className="w-4 h-4 ml-2" />
                    استيراد {currentData.length} سجل
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Importing */}
            {step === 'importing' && (
              <motion.div
                key="importing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-medium">جاري استيراد البيانات...</p>
                  <p className="text-sm text-muted-foreground mt-1">يرجى الانتظار</p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && importResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-lg font-medium">{importResult.message}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{importResult.total}</p>
                    <p className="text-xs text-muted-foreground">إجمالي</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">{importResult.success}</p>
                    <p className="text-xs text-green-600">نجح</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">
                    <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                    <p className="text-xs text-yellow-600">تم تخطيه</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <p className="text-2xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-xs text-red-600">فشل</p>
                  </div>
                </div>

                {/* Progress Bar */}
                {importResult.total > 0 && (
                  <div className="space-y-1">
                    <Progress value={(importResult.success / importResult.total) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {Math.round((importResult.success / importResult.total) * 100)}% نجح
                    </p>
                  </div>
                )}

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-1 text-red-500">
                      <AlertTriangle className="w-4 h-4" />
                      الأخطاء ({importResult.errors.length})
                    </p>
                    <ScrollArea className="max-h-40 rounded-xl border">
                      <div className="p-2 space-y-1">
                        {importResult.errors.slice(0, 20).map((err, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span>
                              <span className="font-medium text-red-600">سطر {err.row}:</span>{' '}
                              <span className="text-muted-foreground">{err.message}</span>
                            </span>
                          </div>
                        ))}
                        {importResult.errors.length > 20 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            و {importResult.errors.length - 20} خطأ آخر...
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={handleClose}>
                    إغلاق
                  </Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" onClick={resetState}>
                    <Upload className="w-4 h-4 ml-2" />
                    استيراد ملف آخر
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
