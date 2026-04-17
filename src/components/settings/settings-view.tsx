'use client'

import { useState, useEffect } from 'react'
import { useAppStore, ThemeColor } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Palette, Download, Upload, Trash2, Database, HardDrive, Info, RotateCcw, Sun, Moon, FileUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { ImportDialog } from '@/components/import/import-dialog'

const themeOptions: { id: ThemeColor; label: string; color: string; className: string }[] = [
  { id: 'teal', label: 'أخضر مائي', color: 'bg-teal-500', className: '' },
  { id: 'blue', label: 'أزرق', color: 'bg-sky-500', className: '' },
  { id: 'cyan', label: 'سماوي', color: 'bg-cyan-400', className: '' },
  { id: 'green', label: 'أخضر', color: 'bg-green-500', className: '' },
  { id: 'lime', label: 'ليموني', color: 'bg-lime-500', className: '' },
  { id: 'purple', label: 'بنفسجي', color: 'bg-purple-500', className: '' },
  { id: 'pink', label: 'وردي', color: 'bg-pink-500', className: '' },
  { id: 'orange', label: 'برتقالي', color: 'bg-orange-500', className: '' },
  { id: 'red', label: 'أحمر', color: 'bg-red-500', className: '' },
]

interface Backup {
  id: string; name: string; size: number; createdAt: string
}

export function SettingsView() {
  const { themeColor, setThemeColor } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [backups, setBackups] = useState<Backup[]>([])
  const [backupName, setBackupName] = useState('')
  const [isLoadingBackups, setIsLoadingBackups] = useState(true)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    setIsLoadingBackups(true)
    try {
      const res = await fetch('/api/backups')
      const data = await res.json()
      setBackups(data)
    } catch { /* ignore */ }
    finally { setIsLoadingBackups(false) }
  }

  const handleExportData = async () => {
    try {
      const [patients, sessionTypes, visits, laserTreatments, photos, expenses, revenues, alerts] = await Promise.all([
        fetch('/api/patients').then(r => r.json()),
        fetch('/api/session-types').then(r => r.json()),
        fetch('/api/visits?limit=1000').then(r => r.json()),
        fetch('/api/laser').then(r => r.json()),
        fetch('/api/photos').then(r => r.json()),
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/revenues').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        patients: patients.patients || patients,
        sessionTypes,
        visits: visits.visits || visits,
        laserTreatments,
        photos,
        expenses: expenses.expenses || expenses,
        revenues: revenues.revenues || revenues,
        alerts,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clinic-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('تم تصدير البيانات بنجاح')
    } catch {
      toast.error('خطأ في تصدير البيانات')
    }
  }

  // Import is now handled by ImportDialog component

  const handleSaveBackup = async () => {
    if (!backupName.trim()) {
      toast.error('يرجى إدخال اسم النسخة الاحتياطية')
      return
    }
    try {
      const [patients, sessionTypes, visits, laserTreatments, photos, expenses, revenues, alerts] = await Promise.all([
        fetch('/api/patients').then(r => r.json()),
        fetch('/api/session-types').then(r => r.json()),
        fetch('/api/visits?limit=1000').then(r => r.json()),
        fetch('/api/laser').then(r => r.json()),
        fetch('/api/photos').then(r => r.json()),
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/revenues').then(r => r.json()),
        fetch('/api/alerts').then(r => r.json()),
      ])

      const backupData = {
        patients: patients.patients || patients,
        sessionTypes,
        visits: visits.visits || visits,
        laserTreatments,
        photos,
        expenses: expenses.expenses || expenses,
        revenues: revenues.revenues || revenues,
        alerts,
      }

      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: backupName.trim(), data: backupData }),
      })

      if (res.ok) {
        toast.success('تم حفظ النسخة الاحتياطية')
        setBackupName('')
        fetchBackups()
      }
    } catch {
      toast.error('خطأ في حفظ النسخة الاحتياطية')
    }
  }

  const handleDeleteBackup = async (id: string) => {
    try {
      await fetch(`/api/backups/${id}`, { method: 'DELETE' })
      toast.success('تم حذف النسخة الاحتياطية')
      fetchBackups()
    } catch {
      toast.error('خطأ في حذف النسخة')
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    try {
      const res = await fetch(`/api/backups`)
      const allBackups = await res.json()
      const backup = allBackups.find((b: Backup) => b.id === backupId)
      if (!backup) throw new Error('Backup not found')
      
      const backupData = JSON.parse(backup.data)
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupData }),
      })
      
      if (response.ok) {
        toast.success('تم استعادة النسخة الاحتياطية بنجاح - جاري إعادة التحميل...')
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch {
      toast.error('خطأ في استعادة النسخة')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Theme Picker */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              المظهر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? (
                  <Moon className="w-5 h-5 text-indigo-500" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">الوضع الليلي</p>
                  <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'مفعّل' : 'معطّل'}</p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
            <Separator />
            {/* Color Theme */}
            <div>
              <p className="text-sm font-medium mb-2">لون التطبيق</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setThemeColor(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                    themeColor === t.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-transparent hover:border-border'
                  )}
                >
                  <div className={cn('w-8 h-8 rounded-full', t.color)} />
                  <span className="text-xs font-medium">{t.label}</span>
                </button>
              ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Export / Import */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              تصدير واستيراد البيانات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleExportData} variant="outline" className="gap-2 flex-1">
                <Download className="w-4 h-4" />
                تصدير البيانات (JSON)
              </Button>
              <Button variant="outline" className="gap-2 flex-1" onClick={() => setImportOpen(true)}>
                <FileUp className="w-4 h-4" />
                استيراد البيانات
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Backups */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              النسخ الاحتياطية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="اسم النسخة..."
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveBackup()}
              />
              <Button onClick={handleSaveBackup} className="bg-primary text-primary-foreground shrink-0">
                حفظ
              </Button>
            </div>

            {isLoadingBackups ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
              </div>
            ) : backups.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{backup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(backup.size)} • {new Date(backup.createdAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 shrink-0"
                        onClick={() => handleRestoreBackup(backup.id)}
                        title="استعادة"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف النسخة الاحتياطية</AlertDialogTitle>
                          <AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteBackup(backup.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد نسخ احتياطية</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* App Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              معلومات التطبيق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">اسم التطبيق</span>
                <span className="font-medium">جلسات عيادة المغازى</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">الإصدار</span>
                <Badge variant="outline">2.0.0</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">الإطار</span>
                <span className="font-medium">Next.js 16 + PWA</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">قاعدة البيانات</span>
                <span className="font-medium">PostgreSQL (Neon)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Import Dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
