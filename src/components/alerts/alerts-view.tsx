'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bell, Plus, Trash2, CheckCheck, Clock, AlertTriangle, AlertCircle,
  Calendar, DollarSign, Package, Zap, User, TrendingUp,
  Filter, Search, X, ChevronLeft, BellOff, BellRing,
  CalendarClock, Wallet, RefreshCw, Eye, MessageSquare,
  Heart, Star, Shield, Info, Flame, Phone, ArrowRight,
  Megaphone, Timer, ClipboardList, CheckCircle2, XCircle,
  CircleDot, Volume2
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'
import { useAppStore } from '@/lib/store'

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface Alert {
  id: string
  patientId: string | null
  title: string
  message: string
  type: string
  priority: string
  date: string
  isRead: boolean
  isDismissed: boolean
  snoozedUntil: string | null
  actionUrl: string | null
  createdAt: string
  patient?: { id: string; name: string } | null
}

interface SmartAlertSummary {
  upcomingVisits: number
  overduePayments: number
  expiringPackages: number
  followUpNeeded: number
  todaySessions: number
  totalUnread: number
  highPriority: number
}

// ═══════════════════════════════════════
// Constants
// ═══════════════════════════════════════

const PRIORITY_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string; bg: string; border: string; glow: string }> = {
  urgent: { label: 'عاجل', icon: Flame, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-900/50', glow: 'shadow-red-200/50' },
  high: { label: 'مرتفع', icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-900/50', glow: 'shadow-orange-200/50' },
  normal: { label: 'عادي', icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/50', glow: 'shadow-blue-200/50' },
  low: { label: 'منخفض', icon: Bell, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/40', border: 'border-gray-200 dark:border-gray-900/50', glow: '' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Bell; color: string; bg: string }> = {
  reminder: { label: 'تذكير', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  appointment: { label: 'موعد', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  payment: { label: 'مستحقات', icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  package: { label: 'باقة', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  followup: { label: 'متابعة', icon: RefreshCw, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  laser: { label: 'ليزر', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  custom: { label: 'مخصص', icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  birthday: { label: 'عيد ميلاد', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  system: { label: 'نظام', icon: Shield, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900/30' },
}

const SNOOZE_OPTIONS = [
  { label: '15 دقيقة', value: '15m' },
  { label: '30 دقيقة', value: '30m' },
  { label: 'ساعة', value: '1h' },
  { label: '3 ساعات', value: '3h' },
  { label: 'غداً', value: '1d' },
  { label: 'أسبوع', value: '7d' },
]

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export function AlertsView() {
  const { setCurrentView, setSelectedPatientId } = useAppStore()
  const [activeTab, setActiveTab] = useState('inbox')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterRead, setFilterRead] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [smartSummary, setSmartSummary] = useState<SmartAlertSummary | null>(null)

  // Create form
  const [createForm, setCreateForm] = useState({
    patientId: '',
    title: '',
    message: '',
    type: 'reminder',
    priority: 'normal',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
  })
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([])

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const [alertRes, summaryRes, patientRes] = await Promise.all([
        fetch('/api/alerts').then(r => r.json()),
        fetch('/api/alerts/summary').then(r => r.json()),
        fetch('/api/patients?limit=500').then(r => r.json()),
      ])
      setAlerts(alertRes || [])
      setSmartSummary(summaryRes || null)
      setPatients(patientRes?.patients || [])
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  // ═══════════════════════════════════════
  // Smart Alert Generation
  // ═══════════════════════════════════════
  const handleGenerateSmartAlerts = async () => {
    try {
      const res = await fetch('/api/alerts/generate', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`تم إنشاء ${data.created} تنبيه ذكي`)
        emitChange('alerts', 'generate', null)
        fetchAlerts()
      } else {
        toast.error(data.error || 'خطأ')
      }
    } catch {
      toast.error('خطأ في إنشاء التنبيهات الذكية')
    }
  }

  // ═══════════════════════════════════════
  // Alert Actions
  // ═══════════════════════════════════════
  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a))
    } catch { toast.error('خطأ') }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/alerts/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))
      toast.success('تم تحديد الكل كمقروء')
    } catch { toast.error('خطأ') }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: 'DELETE' })
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('تم حذف التنبيه')
      emitChange('alerts', 'delete', id)
    } catch { toast.error('خطأ') }
  }

  const handleSnooze = async (id: string, duration: string) => {
    try {
      const ms: Record<string, number> = { '15m': 900000, '30m': 1800000, '1h': 3600000, '3h': 10800000, '1d': 86400000, '7d': 604800000 }
      const snoozeUntil = new Date(Date.now() + (ms[duration] || 3600000)).toISOString()
      await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozedUntil }),
      })
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, snoozedUntil } : a))
      toast.success('تم تأجيل التنبيه')
    } catch { toast.error('خطأ') }
  }

  const handleCreateAlert = async () => {
    if (!createForm.title.trim() || !createForm.message.trim()) {
      toast.error('العنوان والرسالة مطلوبان')
      return
    }
    try {
      const fullDate = createForm.date + 'T' + (createForm.time || '09:00')
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          patientId: createForm.patientId || null,
          date: fullDate,
        }),
      })
      toast.success('تم إنشاء التنبيه بنجاح')
      emitChange('alerts', 'create', null)
      setShowCreateForm(false)
      setCreateForm({ patientId: '', title: '', message: '', type: 'reminder', priority: 'normal', date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5) })
      fetchAlerts()
    } catch { toast.error('خطأ في إنشاء التنبيه') }
  }

  const handleGoToPatient = (patientId: string) => {
    setSelectedPatientId(patientId)
    setCurrentView('patient-detail')
  }

  // ═══════════════════════════════════════
  // Filtering
  // ═══════════════════════════════════════
  const now = new Date()
  const visibleAlerts = alerts.filter(a => {
    if (a.snoozedUntil && new Date(a.snoozedUntil) > now) return false
    if (activeTab === 'unread' && a.isRead) return false
    if (activeTab === 'read' && !a.isRead) return false
    if (filterType !== 'all' && a.type !== filterType) return false
    if (filterPriority !== 'all' && a.priority !== filterPriority) return false
    if (filterRead === 'unread' && a.isRead) return false
    if (filterRead === 'read' && !a.isRead) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || a.patient?.name.toLowerCase().includes(q) || false
    }
    return true
  })

  const unreadCount = alerts.filter(a => !a.isRead && (!a.snoozedUntil || new Date(a.snoozedUntil) <= now)).length

  // ═══════════════════════════════════════
  // Render - Summary Cards
  // ═══════════════════════════════════════
  const renderSummary = () => {
    if (!smartSummary) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>

    const summaryCards = [
      { title: 'تنبيهات غير مقروءة', value: smartSummary.totalUnread, icon: Bell, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', active: true },
      { title: 'مواعيد قادمة', value: smartSummary.upcomingVisits, icon: CalendarClock, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
      { title: 'مستحقات مالية', value: smartSummary.overduePayments, icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
      { title: 'باقات على وشك الانتهاء', value: smartSummary.expiringPackages, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
      { title: 'متابعة مطلوبة', value: smartSummary.followUpNeeded, icon: RefreshCw, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
      { title: 'جلسات اليوم', value: smartSummary.todaySessions, icon: Star, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
      { title: 'أولوية عالية', value: smartSummary.highPriority, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
      { title: 'إجمالي التنبيهات', value: alerts.length, icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-950/30' },
    ]

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={cn('hover:shadow-md transition-shadow', c.active && c.value > 0 && 'border-red-200 dark:border-red-900/50')}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', c.bg)}>
                    <c.icon className={cn('w-4.5 h-4.5', c.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">{c.title}</p>
                    <p className="text-lg font-bold">{c.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Render - Alert Card
  // ═══════════════════════════════════════
  const renderAlertCard = (alert: Alert, i: number) => {
    const priorityConfig = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.normal
    const typeConfig = TYPE_CONFIG[alert.type] || TYPE_CONFIG.custom
    const PriorityIcon = priorityConfig.icon
    const TypeIcon = typeConfig.icon

    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.02 }}
        layout
      >
        <Card className={cn(
          'hover:shadow-md transition-all cursor-pointer',
          !alert.isRead && cn('border-l-4', priorityConfig.border, 'bg-white dark:bg-card'),
          alert.isRead && 'opacity-70'
        )}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Priority Indicator */}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', priorityConfig.bg)}>
                <PriorityIcon className={cn('w-5 h-5', priorityConfig.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {!alert.isRead && <CircleDot className="w-2 h-2 text-primary fill-primary shrink-0" />}
                  <span className={cn('font-medium text-sm truncate', !alert.isRead && 'font-bold')}>{alert.title}</span>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <TypeIcon className="w-3 h-3" />
                    {typeConfig.label}
                  </Badge>
                  {alert.priority !== 'normal' && (
                    <Badge className={cn('text-[10px] gap-1', priorityConfig.color, priorityConfig.bg, 'border-0')}>
                      {priorityConfig.label}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{alert.message}</p>

                <div className="flex items-center gap-3 flex-wrap">
                  {alert.patient && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleGoToPatient(alert.patient!.id) }}
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <User className="w-3 h-3" />
                      {alert.patient.name}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(alert.date)}
                  </span>
                  {alert.snoozedUntil && new Date(alert.snoozedUntil) > now && (
                    <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                      <Timer className="w-3 h-3" />
                      مؤجل
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                {!alert.isRead && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleMarkRead(alert.id) }} title="تحديد كمقروء">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  </Button>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()} title="تأجيل">
                      <Timer className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs">
                    <DialogHeader><DialogTitle className="text-sm">تأجيل التنبيه</DialogTitle></DialogHeader>
                    <div className="space-y-2">
                      {SNOOZE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleSnooze(alert.id, opt.value)}
                          className="w-full text-right px-3 py-2.5 rounded-lg hover:bg-muted text-sm transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()} title="حذف">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف التنبيه</AlertDialogTitle>
                      <AlertDialogDescription>هل أنت متأكد من حذف هذا التنبيه؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(alert.id)} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ═══════════════════════════════════════
  // Render - Create Form
  // ═══════════════════════════════════════
  const renderCreateForm = () => (
    <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            إنشاء تنبيه جديد
          </DialogTitle>
          <DialogDescription>أنشئ تنبيه مخصص أو تذكير لمريض</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">المريض (اختياري)</Label>
            <Select value={createForm.patientId} onValueChange={v => setCreateForm(prev => ({ ...prev, patientId: v }))}>
              <SelectTrigger><SelectValue placeholder="اختر مريض..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون مريض</SelectItem>
                {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">العنوان *</Label>
            <Input value={createForm.title} onChange={e => setCreateForm(prev => ({ ...prev, title: e.target.value }))} placeholder="مثال: موعد جلسة ليزر" />
          </div>

          <div>
            <Label className="mb-1.5 block">الرسالة *</Label>
            <Textarea value={createForm.message} onChange={e => setCreateForm(prev => ({ ...prev, message: e.target.value }))} rows={3} placeholder="تفاصيل التنبيه..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">النوع</Label>
              <Select value={createForm.type} onValueChange={v => setCreateForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">الأولوية</Label>
              <Select value={createForm.priority} onValueChange={v => setCreateForm(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">التاريخ</Label>
              <Input type="date" value={createForm.date} onChange={e => setCreateForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">الوقت</Label>
              <Input type="time" value={createForm.time} onChange={e => setCreateForm(prev => ({ ...prev, time: e.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateForm(false)}>إلغاء</Button>
          <Button onClick={handleCreateAlert} className="gap-2">
            <Bell className="w-4 h-4" />
            إنشاء التنبيه
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // ═══════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Top Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Bell className="w-3.5 h-3.5" />
            {unreadCount} غير مقروء
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleGenerateSmartAlerts} className="gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            تنبيهات ذكية
          </Button>
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="gap-1.5" disabled={unreadCount === 0}>
            <CheckCheck className="w-3.5 h-3.5" />
            قراءة الكل
          </Button>
          <Button size="sm" onClick={() => setShowCreateForm(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            تنبيه جديد
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummary()}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox" className="gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            البريد
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-1.5">
            <CircleDot className="w-3.5 h-3.5" />
            غير مقروء
          </TabsTrigger>
          <TabsTrigger value="read" className="gap-1.5">
            <CheckCheck className="w-3.5 h-3.5" />
            مقروء
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث في التنبيهات..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pr-9 h-9"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-auto h-9 min-w-[120px]"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-auto h-9 min-w-[120px]"><SelectValue placeholder="الأولوية" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأولويات</SelectItem>
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Alert List */}
        <div className="mt-4">
          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : visibleAlerts.length === 0 ? (
              <div className="text-center py-16">
                <BellOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-1">
                  {activeTab === 'unread' ? 'لا توجد تنبيهات غير مقروءة' : activeTab === 'read' ? 'لا توجد تنبيهات مقروءة' : 'لا توجد تنبيهات'}
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {activeTab === 'inbox' ? 'أنشئ تنبيه جديد أو فعّل التنبيهات الذكية' : ''}
                </p>
                {activeTab === 'inbox' && (
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={handleGenerateSmartAlerts} className="gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      تنبيهات ذكية
                    </Button>
                    <Button size="sm" onClick={() => setShowCreateForm(true)} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      تنبيه جديد
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                <AnimatePresence>
                  {visibleAlerts.map((alert, i) => renderAlertCard(alert, i))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Create Form Dialog */}
      {renderCreateForm()}
    </div>
  )
}
