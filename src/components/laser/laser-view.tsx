'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatCurrency, formatDate, formatDateTime, formatRelative, cn as classnames } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Zap, Plus, Edit, Trash2, User, Package, Cpu, DollarSign,
  Calendar, TrendingUp, Activity, AlertTriangle, CheckCircle,
  Clock, BarChart3, Search, X, ChevronLeft, ChevronRight,
  Eye, FileText, Settings, RefreshCw, Stethoscope, Info
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { emitChange } from '@/lib/socket'

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface Machine {
  id: string; name: string; type: string; wavelength: string | null
  maxFluence: number | null; spotSizes: string | null; isActive: boolean
  notes: string | null; createdAt: string; _count?: { sessions: number }
}

interface Area {
  id: string; name: string; malePulses: number; femalePulses: number
  pulsePrice: number; isActive: boolean; createdAt: string
  _count?: { sessions: number; packages: number }
}

interface Profile {
  id: string; patientId: string; skinType: string; hairColor: string | null
  hairThickness: string | null; skinSensitivity: string | null
  hormonalConditions: string | null; contraindications: string | null
  previousTreatments: string | null; notes: string | null; createdAt: string
  patient: { id: string; name: string; phone: string | null; gender: string; age: number | null }
  _count?: { sessions: number; packages: number }
  sessions?: Session[]; packages?: LaserPackage[]
}

interface Session {
  id: string; profileId: string; patientId: string; machineId: string; areaId: string
  packageId: string | null; sessionNumber: number; date: string
  fluence: number; pulseWidth: number; spotSize: number; cooling: string | null
  pulsesUsed: number; pulsesPerSecond: number | null
  paymentMode: string; pulsePrice: number; totalAmount: number; paid: number; remaining: number
  painLevel: number | null; hairReduction: number | null; sideEffects: string | null
  skinReaction: string | null; notes: string | null; status: string; nextSessionDate: string | null
  createdAt: string
  profile?: { id: string; skinType: string; hairColor: string | null }
  patient?: { id: string; name: string; phone: string | null; gender: string }
  machine?: { id: string; name: string; type: string }
  area?: { id: string; name: string }
  package?: { id: string; name: string } | null
}

interface LaserPackage {
  id: string; profileId: string; patientId: string; areaId: string
  name: string; totalSessions: number; totalPulses: number
  usedSessions: number; usedPulses: number
  remainingSessions: number; remainingPulses: number
  totalPrice: number; paid: number; remaining: number; status: string
  purchaseDate: string; expiryDate: string | null; notes: string | null; createdAt: string
  profile?: { id: string; skinType: string }
  patient?: { id: string; name: string; phone: string | null; gender: string }
  area?: { id: string; name: string }
  sessions?: Array<{ id: string; date: string; status: string }>
}

interface Revenue {
  id: string; patientId: string | null; sessionId: string | null
  packageId: string | null; type: string; amount: number
  description: string | null; date: string; createdAt: string
  patient?: { id: string; name: string }
  session?: { id: string; area: { name: string } }
}

interface DashboardData {
  sessionsToday: number; sessionsMonth: number
  revenueMonth: number; revenueToday: number
  activeProfiles: number; activePackages: number; totalMachines: number
  popularAreas: Array<{ areaId: string; name: string; count: number }>
  todaySessions: Session[]; nearCompletionPackages: Array<{
    id: string; patient: { id: string; name: string }; area: { id: string; name: string }
    remainingSessions: number; totalSessions: number
  }>
}

// ═══════════════════════════════════════
// Constants
// ═══════════════════════════════════════

const SKIN_TYPES_INFO: Record<string, { label: string; desc: string; color: string }> = {
  '1': { label: 'النوع 1', desc: 'بشرة فاتحة جداً، حروق شمس بسهولة، لا تسمر أبداً', color: '#FFDFC4' },
  '2': { label: 'النوع 2', desc: 'بشرة فاتحة، تسمر قليلاً، حروق شمس شائعة', color: '#F0C8A0' },
  '3': { label: 'النوع 3', desc: 'بشرة متوسطة، تسمر بالتساوي، حروق شمس معتدلة', color: '#D4A574' },
  '4': { label: 'النوع 4', desc: 'بشرة زيتونية، تسمر بسهولة، حروق شمس نادرة', color: '#C68642' },
  '5': { label: 'النوع 5', desc: 'بشرة بنية، تسمر بسرعة، حروق شمس نادرة جداً', color: '#8D5524' },
  '6': { label: 'النوع 6', desc: 'بشرة داكنة جداً، لا تحترق أبداً', color: '#4A2C0A' },
}

const HAIR_COLORS = ['أسود', 'بني غامق', 'بني فاتح', 'أشقر', 'أحمر', 'رمادي', 'أبيض']
const HAIR_THICKNESS = ['رفيع', 'متوسط', 'كثيف']
const SKIN_SENSITIVITY = ['منخفضة', 'متوسطة', 'عالية']
const COOLING_TYPES = ['تبريد تلامسي', 'تبريد رذاذ', 'تبريد cryo', 'بدون تبريد']
const MACHINE_TYPES = ['Alexandrite', 'Diode', 'Nd:YAG', 'IPL', 'Ruby', 'Triple Wavelength']

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  completed: { label: 'مكتملة', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  scheduled: { label: 'مجدولة', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  cancelled: { label: 'ملغاة', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  active: { label: 'نشطة', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  expired: { label: 'منتهية', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
}

const TYPE_LABELS: Record<string, string> = {
  Alexandrite: 'إلكسندرايت', Diode: 'دايود', 'Nd:YAG': 'Nd:YAG',
  IPL: 'IPL', Ruby: 'روبي', 'Triple Wavelength': 'ثلاثي الأطوال',
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export function LaserView() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [machines, setMachines] = useState<Machine[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [packages, setPackages] = useState<LaserPackage[]>([])
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [patients, setPatients] = useState<Array<{ id: string; name: string; phone: string | null; gender: string; age: number | null }>>([])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [showMachineForm, setShowMachineForm] = useState(false)
  const [showAreaForm, setShowAreaForm] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [showPackageForm, setShowPackageForm] = useState(false)
  const [showRevenueForm, setShowRevenueForm] = useState(false)
  const [showProfileDetail, setShowProfileDetail] = useState<Profile | null>(null)
  const [showPackageDetail, setShowPackageDetail] = useState<LaserPackage | null>(null)

  // Editing
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editingPackage, setEditingPackage] = useState<LaserPackage | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [m, a, p, s, pk, r, d, pat] = await Promise.all([
        fetch('/api/laser-v2/machines').then(r => r.json()),
        fetch('/api/laser-v2/areas').then(r => r.json()),
        fetch('/api/laser-v2/profiles').then(r => r.json()),
        fetch('/api/laser-v2/sessions').then(r => r.json()),
        fetch('/api/laser-v2/packages').then(r => r.json()),
        fetch('/api/laser-v2/revenue').then(r => r.json()),
        fetch('/api/laser-v2/dashboard').then(r => r.json()),
        fetch('/api/patients?limit=500').then(r => r.json()),
      ])
      setMachines(m || [])
      setAreas(a || [])
      setProfiles(p || [])
      setSessions(s || [])
      setPackages(pk || [])
      setRevenues(r?.revenues || [])
      setDashboardData(d || null)
      setPatients(pat?.patients || [])
    } catch {
      toast.error('خطأ في جلب البيانات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Seed data
  const handleSeed = async () => {
    try {
      const res = await fetch('/api/laser-v2/seed', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        emitChange('laser', 'seed', null)
        fetchAll()
      } else {
        toast.error(data.error || 'خطأ')
      }
    } catch {
      toast.error('خطأ في إضافة البيانات الأولية')
    }
  }

  // ═══════════════════════════════════════
  // Dashboard Tab
  // ═══════════════════════════════════════
  const renderDashboard = () => {
    if (!dashboardData) return <div className="grid grid-cols-2 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>

    const cards = [
      { title: 'جلسات اليوم', value: dashboardData.sessionsToday, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
      { title: 'إيرادات الشهر', value: formatCurrency(dashboardData.revenueMonth), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
      { title: 'البروفايلات النشطة', value: dashboardData.activeProfiles, icon: User, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
      { title: 'الباقات النشطة', value: dashboardData.activePackages, icon: Package, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    ]

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg)}>
                      <c.icon className={cn('w-5 h-5', c.color)} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                      <p className="text-lg font-bold">{c.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Today's Sessions + Near Completion */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                جلسات اليوم ({dashboardData.todaySessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.todaySessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد جلسات اليوم</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {dashboardData.todaySessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{s.patient?.name}</p>
                          <p className="text-xs text-muted-foreground">{s.area?.name} • {s.machine?.name}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground">{formatDateTime(s.date)}</p>
                        <p className="text-xs font-medium">{formatCurrency(s.paid)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                باقات على وشك الانتهاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.nearCompletionPackages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد باقات على وشك الانتهاء</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {dashboardData.nearCompletionPackages.map((pkg) => (
                    <div key={pkg.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                      <div>
                        <p className="text-sm font-medium">{pkg.patient.name}</p>
                        <p className="text-xs text-muted-foreground">{pkg.area.name}</p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-300 dark:border-orange-700">
                        متبقي {pkg.remainingSessions} جلسة
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Popular Areas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              أكثر المناطق طلباً
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.popularAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات كافية</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.popularAreas.map((a, i) => {
                  const max = dashboardData.popularAreas[0]?.count || 1
                  return (
                    <div key={a.areaId} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">{a.name}</span>
                          <span className="text-xs text-muted-foreground">{a.count} جلسة</span>
                        </div>
                        <Progress value={(a.count / max) * 100} className="h-2" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ═══════════════════════════════════════
  // Profiles Tab
  // ═══════════════════════════════════════
  const renderProfiles = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Badge variant="secondary">{profiles.length} بروفايل</Badge>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleSeed} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            بيانات تجريبية
          </Button>
          <Button size="sm" onClick={() => { setEditingProfile(null); setShowProfileForm(true) }} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-3.5 h-3.5" />
            بروفايل جديد
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">لا توجد بروفايلات ليزر</p>
          <p className="text-xs text-muted-foreground mb-4">أنشئ بروفايل جديد لبدء تتبع جلسات الليزر</p>
          <Button onClick={() => setShowProfileForm(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-4 h-4" /> إنشاء بروفايل
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {profiles.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewProfile(p.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{p.patient.name}</span>
                          <Badge variant="outline" className="text-[10px]">Fitz {p.skinType}</Badge>
                          {p.hairColor && <Badge variant="outline" className="text-[10px]">{p.hairColor}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{p._count?.sessions || 0} جلسة</span>
                          <span>{p._count?.packages || 0} باقة</span>
                          {p.patient.phone && <span>{p.patient.phone}</span>}
                        </div>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )

  const handleViewProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/laser-v2/profiles/${id}`)
      const data = await res.json()
      setShowProfileDetail(data)
    } catch {
      toast.error('خطأ في جلب البيانات')
    }
  }

  const renderProfileDetail = () => {
    if (!showProfileDetail) return null
    const p = showProfileDetail
    const skinInfo = SKIN_TYPES_INFO[p.skinType]

    return (
      <Dialog open={true} onOpenChange={() => setShowProfileDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-500" />
              {p.patient.name}
            </DialogTitle>
            <DialogDescription>بروفايل الليزر التفصيلي</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">الجنس</p>
                <p className="font-medium text-sm">{p.patient.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">العمر</p>
                <p className="font-medium text-sm">{p.patient.age || '—'}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">الهاتف</p>
                <p className="font-medium text-sm">{p.patient.phone || '—'}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">إجمالي الجلسات</p>
                <p className="font-medium text-sm">{p.sessions?.length || 0}</p>
              </div>
            </div>

            {/* Skin & Hair Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">معلومات البشرة والشعر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-300" style={{ backgroundColor: skinInfo?.color }} />
                  <div>
                    <p className="font-medium text-sm">{skinInfo?.label} - Fitzpatrick {p.skinType}</p>
                    <p className="text-xs text-muted-foreground">{skinInfo?.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">لون الشعر:</span> <span className="font-medium">{p.hairColor || '—'}</span></div>
                  <div><span className="text-muted-foreground">كثافة الشعر:</span> <span className="font-medium">{p.hairThickness || '—'}</span></div>
                  <div><span className="text-muted-foreground">حساسية البشرة:</span> <span className="font-medium">{p.skinSensitivity || '—'}</span></div>
                </div>
                {p.hormonalConditions && <div className="text-sm"><span className="text-muted-foreground">حالات هرمونية:</span> <span>{p.hormonalConditions}</span></div>}
                {p.contraindications && <div className="text-sm text-red-600"><span className="font-medium">موانع استعمال:</span> {p.contraindications}</div>}
                {p.previousTreatments && <div className="text-sm"><span className="text-muted-foreground">علاجات سابقة:</span> {p.previousTreatments}</div>}
                {p.notes && <div className="text-sm"><span className="text-muted-foreground">ملاحظات:</span> {p.notes}</div>}
              </CardContent>
            </Card>

            {/* Sessions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">الجلسات ({p.sessions?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {(!p.sessions || p.sessions.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد جلسات</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {p.sessions!.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">ج{s.sessionNumber}</Badge>
                          <span>{s.area?.name}</span>
                          <span className="text-muted-foreground">• {s.machine?.name}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-xs">{formatDate(s.date)}</p>
                          <Badge className={cn('text-[10px]', STATUS_MAP[s.status]?.color)}>{STATUS_MAP[s.status]?.label}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Packages */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">الباقات ({p.packages?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {(!p.packages || p.packages.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد باقات</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {p.packages!.map((pkg) => (
                      <div key={pkg.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-xs text-muted-foreground">{pkg.area?.name} • {formatCurrency(pkg.totalPrice)}</p>
                        </div>
                        <Badge className={cn('text-[10px]', STATUS_MAP[pkg.status]?.color)}>{STATUS_MAP[pkg.status]?.label}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDetail(null)}>إغلاق</Button>
            <Button className="gap-2 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => {
              setShowProfileDetail(null)
              setEditingProfile(p)
              setShowProfileForm(true)
            }}>
              <Edit className="w-4 h-4" /> تعديل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ═══════════════════════════════════════
  // Session Form
  // ═══════════════════════════════════════
  const [sessionForm, setSessionForm] = useState({
    profileId: '', patientId: '', machineId: '', areaId: '', packageId: '',
    date: new Date().toISOString().split('T')[0],
    fluence: '', pulseWidth: '', spotSize: '', cooling: '',
    pulsesUsed: '', pulsesPerSecond: '',
    paymentMode: 'pulse', pulsePrice: '', paid: '',
    painLevel: 3, hairReduction: '', sideEffects: '', skinReaction: '',
    notes: '', status: 'completed', nextSessionDate: '',
  })

  const resetSessionForm = () => {
    setSessionForm({
      profileId: '', patientId: '', machineId: '', areaId: '', packageId: '',
      date: new Date().toISOString().split('T')[0],
      fluence: '', pulseWidth: '', spotSize: '', cooling: '',
      pulsesUsed: '', pulsesPerSecond: '',
      paymentMode: 'pulse', pulsePrice: '', paid: '',
      painLevel: 3, hairReduction: '', sideEffects: '', skinReaction: '',
      notes: '', status: 'completed', nextSessionDate: '',
    })
  }

  const handleSessionSubmit = async () => {
    if (!sessionForm.profileId || !sessionForm.patientId || !sessionForm.machineId || !sessionForm.areaId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    if (!sessionForm.fluence) {
      toast.error('يرجى إدخال الطاقة (fluence)')
      return
    }

    try {
      if (editingSession) {
        await fetch(`/api/laser-v2/sessions/${editingSession.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionForm),
        })
        toast.success('تم تعديل الجلسة')
        emitChange('laser', 'update', editingSession.id)
      } else {
        await fetch('/api/laser-v2/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionForm),
        })
        toast.success('تم تسجيل الجلسة بنجاح')
        emitChange('laser', 'create', null)
      }
      setShowSessionForm(false)
      setEditingSession(null)
      resetSessionForm()
      fetchAll()
    } catch {
      toast.error('خطأ في حفظ الجلسة')
    }
  }

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`/api/laser-v2/sessions/${id}`, { method: 'DELETE' })
      toast.success('تم حذف الجلسة')
      emitChange('laser', 'delete', id)
      fetchAll()
    } catch {
      toast.error('خطأ في حذف الجلسة')
    }
  }

  // Get available packages for selected patient and area
  const getAvailablePackages = () => {
    if (!sessionForm.patientId || !sessionForm.areaId) return []
    return packages.filter(
      (pkg) => pkg.patientId === sessionForm.patientId && pkg.areaId === sessionForm.areaId && pkg.status === 'active' && pkg.remainingSessions > 0
    )
  }

  // Calculate total when pulse mode
  const calcTotal = () => {
    if (sessionForm.paymentMode === 'pulse') {
      return (parseInt(sessionForm.pulsesUsed) || 0) * (parseFloat(sessionForm.pulsePrice) || 0)
    }
    return 0
  }

  const selectedArea = areas.find((a) => a.id === sessionForm.areaId)
  const selectedProfile = profiles.find((p) => p.id === sessionForm.profileId)
  const selectedPatientGender = selectedProfile?.patient?.gender || 'male'

  const renderSessionForm = () => {
    const availablePkgs = getAvailablePackages()

    return (
      <Dialog open={showSessionForm} onOpenChange={(open) => { setShowSessionForm(open); if (!open) { resetSessionForm(); setEditingSession(null) } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {editingSession ? 'تعديل جلسة' : 'تسجيل جلسة جديدة'}
            </DialogTitle>
            <DialogDescription>
              {editingSession ? 'قم بتعديل بيانات الجلسة' : 'أدخل بيانات الجلسة الجديدة'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Patient Selection */}
            <div>
              <Label className="mb-1.5 block">المريض *</Label>
              <Select value={sessionForm.profileId} onValueChange={(v) => {
                const prof = profiles.find(p => p.id === v)
                if (prof) {
                  setSessionForm(prev => ({ ...prev, profileId: v, patientId: prof.patientId }))
                }
              }}>
                <SelectTrigger><SelectValue placeholder="اختر المريض (من بروفايلات الليزر)" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.patient.name} - Fitz {p.skinType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Machine & Area */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">الجهاز *</Label>
                <Select value={sessionForm.machineId} onValueChange={(v) => setSessionForm(prev => ({ ...prev, machineId: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر الجهاز" /></SelectTrigger>
                  <SelectContent>
                    {machines.filter(m => m.isActive).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">المنطقة *</Label>
                <Select value={sessionForm.areaId} onValueChange={(v) => {
                  const area = areas.find(a => a.id === v)
                  const gender = selectedPatientGender
                  const suggested = area ? (gender === 'male' ? area.malePulses : area.femalePulses) : 0
                  setSessionForm(prev => ({
                    ...prev,
                    areaId: v,
                    pulsesUsed: prev.pulsesUsed || String(suggested),
                    pulsePrice: prev.pulsePrice || String(area?.pulsePrice || 0),
                  }))
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                  <SelectContent>
                    {areas.filter(a => a.isActive).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.pulsePrice} ج.م/نبضة)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date */}
            <div>
              <Label className="mb-1.5 block">تاريخ الجلسة</Label>
              <Input type="date" value={sessionForm.date} onChange={(e) => setSessionForm(prev => ({ ...prev, date: e.target.value }))} />
            </div>

            <Separator />

            {/* Payment Mode */}
            <div>
              <Label className="mb-1.5 block">نوع المحاسبة</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card
                  className={cn('cursor-pointer transition-all', sessionForm.paymentMode === 'pulse' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500' : 'hover:border-gray-300')}
                  onClick={() => setSessionForm(prev => ({ ...prev, paymentMode: 'pulse', packageId: '' }))}
                >
                  <CardContent className="p-3 text-center">
                    <Zap className={cn('w-5 h-5 mx-auto mb-1', sessionForm.paymentMode === 'pulse' ? 'text-amber-600' : 'text-muted-foreground')} />
                    <p className="text-sm font-medium">نظام النبضات</p>
                  </CardContent>
                </Card>
                <Card
                  className={cn('cursor-pointer transition-all', sessionForm.paymentMode === 'package' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500' : 'hover:border-gray-300')}
                  onClick={() => setSessionForm(prev => ({ ...prev, paymentMode: 'package' }))}
                >
                  <CardContent className="p-3 text-center">
                    <Package className={cn('w-5 h-5 mx-auto mb-1', sessionForm.paymentMode === 'package' ? 'text-amber-600' : 'text-muted-foreground')} />
                    <p className="text-sm font-medium">نظام الباقة</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Pulse System */}
            {sessionForm.paymentMode === 'pulse' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1.5 block">عدد النبضات</Label>
                        <Input type="number" value={sessionForm.pulsesUsed} onChange={(e) => setSessionForm(prev => ({ ...prev, pulsesUsed: e.target.value }))} placeholder={selectedArea ? (selectedPatientGender === 'male' ? String(selectedArea.malePulses) : String(selectedArea.femalePulses)) : '0'} />
                        {selectedArea && <p className="text-[10px] text-muted-foreground mt-1">اقتراح: {selectedPatientGender === 'male' ? `${selectedArea.malePulses} ذكر` : `${selectedArea.femalePulses} أنثى`}</p>}
                      </div>
                      <div>
                        <Label className="mb-1.5 block">سعر النبضة (ج.م)</Label>
                        <Input type="number" step="0.5" value={sessionForm.pulsePrice} onChange={(e) => setSessionForm(prev => ({ ...prev, pulsePrice: e.target.value }))} placeholder="0" />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">الإجمالي:</span><span className="font-bold">{formatCurrency(calcTotal())}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1.5 block">المدفوع</Label>
                        <Input type="number" value={sessionForm.paid} onChange={(e) => setSessionForm(prev => ({ ...prev, paid: e.target.value }))} placeholder="0" />
                      </div>
                      <div>
                        <Label className="mb-1.5 block">المتبقي</Label>
                        <Input type="number" value={Math.max(0, calcTotal() - (parseFloat(sessionForm.paid) || 0)).toFixed(2)} readOnly className="bg-muted" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Package System */}
            {sessionForm.paymentMode === 'package' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <Card className="border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <Label className="mb-1.5 block">اختر الباقة</Label>
                      <Select value={sessionForm.packageId || ''} onValueChange={(v) => setSessionForm(prev => ({ ...prev, packageId: v }))}>
                        <SelectTrigger><SelectValue placeholder="اختر باقة متاحة" /></SelectTrigger>
                        <SelectContent>
                          {availablePkgs.length === 0 ? (
                            <SelectItem value="none" disabled>لا توجد باقات متاحة</SelectItem>
                          ) : (
                            availablePkgs.map(pkg => (
                              <SelectItem key={pkg.id} value={pkg.id}>
                                {pkg.name} (متبقي {pkg.remainingSessions} جلسة)
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {sessionForm.packageId && (() => {
                      const pkg = availablePkgs.find(p => p.id === sessionForm.packageId)
                      if (!pkg) return null
                      return (
                        <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                          <div className="flex justify-between"><span className="text-muted-foreground">الجلسات المتبقية:</span><span className="font-medium">{pkg.remainingSessions}/{pkg.totalSessions}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">النبضات المتبقية:</span><span className="font-medium">{pkg.remainingPulses}/{pkg.totalPulses}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">السعر:</span><span className="font-bold">{formatCurrency(pkg.totalPrice)}</span></div>
                        </div>
                      )
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <Separator />

            {/* Machine Settings */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Settings className="w-4 h-4" /> إعدادات الجهاز</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="mb-1.5 block">الطاقة (J/cm²) *</Label>
                  <Input type="number" step="0.5" value={sessionForm.fluence} onChange={(e) => setSessionForm(prev => ({ ...prev, fluence: e.target.value }))} placeholder="15" />
                </div>
                <div>
                  <Label className="mb-1.5 block">عرض النبضة (ms)</Label>
                  <Input type="number" step="0.1" value={sessionForm.pulseWidth} onChange={(e) => setSessionForm(prev => ({ ...prev, pulseWidth: e.target.value }))} placeholder="30" />
                </div>
                <div>
                  <Label className="mb-1.5 block">حجم البقعة (mm)</Label>
                  <Input type="number" step="1" value={sessionForm.spotSize} onChange={(e) => setSessionForm(prev => ({ ...prev, spotSize: e.target.value }))} placeholder="12" />
                </div>
                <div>
                  <Label className="mb-1.5 block">التبريد</Label>
                  <Select value={sessionForm.cooling} onValueChange={(v) => setSessionForm(prev => ({ ...prev, cooling: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {COOLING_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">النبضات المستخدمة</Label>
                  <Input type="number" value={sessionForm.pulsesUsed} onChange={(e) => setSessionForm(prev => ({ ...prev, pulsesUsed: e.target.value }))} />
                </div>
                <div>
                  <Label className="mb-1.5 block">نبضات/ثانية</Label>
                  <Input type="number" value={sessionForm.pulsesPerSecond} onChange={(e) => setSessionForm(prev => ({ ...prev, pulsesPerSecond: e.target.value }))} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Assessment */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><Activity className="w-4 h-4" /> التقييم</p>
              <div className="space-y-3">
                <div>
                  <Label className="mb-1.5 block">مستوى الألم: {sessionForm.painLevel}/10</Label>
                  <Slider value={[sessionForm.painLevel]} onValueChange={([v]) => setSessionForm(prev => ({ ...prev, painLevel: v }))} min={1} max={10} step={1} />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1 - لا ألم</span><span>10 - ألم شديد</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">نسبة تقليل الشعر (%)</Label>
                    <Input type="number" step="5" min="0" max="100" value={sessionForm.hairReduction} onChange={(e) => setSessionForm(prev => ({ ...prev, hairReduction: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">رد فعل الجلد</Label>
                    <Select value={sessionForm.skinReaction} onValueChange={(v) => setSessionForm(prev => ({ ...prev, skinReaction: v }))}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">طبيعي</SelectItem>
                        <SelectItem value="mild_redness">احمرار بسيط</SelectItem>
                        <SelectItem value="swelling">ورم خفيف</SelectItem>
                        <SelectItem value="blister">فقاعات</SelectItem>
                        <SelectItem value="burn">حروق</SelectItem>
                        <SelectItem value="hyperpigmentation">تصبغ زائد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">آثار جانبية</Label>
                  <Textarea value={sessionForm.sideEffects} onChange={(e) => setSessionForm(prev => ({ ...prev, sideEffects: e.target.value }))} rows={2} placeholder="أي آثار جانبية..." />
                </div>
              </div>
            </div>

            {/* Notes & Next Session */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">تاريخ الجلسة القادمة</Label>
                <Input type="date" value={sessionForm.nextSessionDate} onChange={(e) => setSessionForm(prev => ({ ...prev, nextSessionDate: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">الحالة</Label>
                <Select value={sessionForm.status} onValueChange={(v) => setSessionForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">مكتملة</SelectItem>
                    <SelectItem value="scheduled">مجدولة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">ملاحظات</Label>
              <Textarea value={sessionForm.notes} onChange={(e) => setSessionForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSessionForm(false); resetSessionForm(); setEditingSession(null) }}>إلغاء</Button>
            <Button onClick={handleSessionSubmit} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Zap className="w-4 h-4" /> {editingSession ? 'تعديل الجلسة' : 'تسجيل الجلسة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ═══════════════════════════════════════
  // New Session Tab
  // ═══════════════════════════════════════
  const renderNewSession = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">تسجيل جلسة جديدة</h3>
          <p className="text-xs text-muted-foreground">سجّل جلسة ليزر جديدة مع كل التفاصيل</p>
        </div>
        <Button size="sm" onClick={() => { setEditingSession(null); resetSessionForm(); setShowSessionForm(true) }} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-3.5 h-3.5" />
          جلسة جديدة
        </Button>
      </div>

      {/* Sessions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">آخر الجلسات ({sessions.length})</p>
        </div>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد جلسات مسجلة</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            <AnimatePresence>
              {sessions.slice(0, 50).map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                          <Zap className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{s.patient?.name}</span>
                            <Badge className={cn('text-[10px]', STATUS_MAP[s.status]?.color)}>{STATUS_MAP[s.status]?.label}</Badge>
                            <Badge variant="outline" className="text-[10px]">{s.paymentMode === 'pulse' ? 'نبضات' : 'باقة'}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.area?.name} • {s.machine?.name} • {s.fluence} J/cm²</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>{formatDateTime(s.date)}</span>
                            {s.painLevel && <span>الألم: {s.painLevel}/10</span>}
                            {s.hairReduction && <span>تقليل: {s.hairReduction}%</span>}
                          </div>
                          {s.paymentMode === 'pulse' && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="text-muted-foreground">{s.pulsesUsed} نبضة × {s.pulsePrice} ج.م</span>
                              <span className="font-medium">{formatCurrency(s.totalAmount)}</span>
                              {s.remaining > 0 && <span className="text-red-500">متبقي {formatCurrency(s.remaining)}</span>}
                            </div>
                          )}
                          {s.paymentMode === 'package' && s.package && (
                            <p className="text-xs mt-1 text-amber-600">باقة: {s.package.name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الجلسة</AlertDialogTitle>
                                <AlertDialogDescription>هل أنت متأكد من حذف هذه الجلسة؟</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSession(s.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
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
      </div>
      {renderSessionForm()}
    </div>
  )

  // ═══════════════════════════════════════
  // Packages Tab
  // ═══════════════════════════════════════
  const [packageForm, setPackageForm] = useState({
    profileId: '', patientId: '', areaId: '', name: '',
    totalSessions: '', totalPulses: '', totalPrice: '', paid: '',
    expiryDate: '', notes: '',
  })

  const resetPackageForm = () => setPackageForm({
    profileId: '', patientId: '', areaId: '', name: '',
    totalSessions: '6', totalPulses: '', totalPrice: '', paid: '',
    expiryDate: '', notes: '',
  })

  const handlePackageSubmit = async () => {
    if (!packageForm.profileId || !packageForm.patientId || !packageForm.areaId || !packageForm.name) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }
    try {
      const url = editingPackage ? `/api/laser-v2/packages/${editingPackage.id}` : '/api/laser-v2/packages'
      const method = editingPackage ? 'PUT' : 'POST'
      const payload = editingPackage ? {
        name: packageForm.name,
        totalSessions: packageForm.totalSessions,
        totalPulses: packageForm.totalPulses,
        paid: packageForm.paid,
        status: undefined,
        expiryDate: packageForm.expiryDate,
        notes: packageForm.notes,
      } : packageForm

      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      toast.success(editingPackage ? 'تم تعديل الباقة' : 'تم إنشاء الباقة')
      emitChange('laser', editingPackage ? 'update' : 'create', null)
      setShowPackageForm(false)
      setEditingPackage(null)
      resetPackageForm()
      fetchAll()
    } catch {
      toast.error('خطأ في حفظ الباقة')
    }
  }

  const handleDeletePackage = async (id: string) => {
    try {
      await fetch(`/api/laser-v2/packages/${id}`, { method: 'DELETE' })
      toast.success('تم حذف الباقة')
      emitChange('laser', 'delete', id)
      fetchAll()
    } catch {
      toast.error('خطأ في حذف الباقة')
    }
  }

  const renderPackages = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">{packages.length} باقة</Badge>
        <Button size="sm" onClick={() => { setEditingPackage(null); resetPackageForm(); setShowPackageForm(true) }} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
          <Plus className="w-3.5 h-3.5" />
          باقة جديدة
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : packages.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد باقات</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-240px)] overflow-y-auto">
          <AnimatePresence>
            {packages.map((pkg, i) => {
              const progressPercent = pkg.totalSessions > 0 ? Math.round((pkg.usedSessions / pkg.totalSessions) * 100) : 0
              return (
                <motion.div key={pkg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{pkg.name}</span>
                            <Badge className={cn('text-[10px]', STATUS_MAP[pkg.status]?.color)}>{STATUS_MAP[pkg.status]?.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{pkg.patient?.name} • {pkg.area?.name}</p>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">التقدم: {pkg.usedSessions}/{pkg.totalSessions} جلسة</span>
                              <span className="font-medium">{progressPercent}%</span>
                            </div>
                            <Progress value={progressPercent} className="h-2" />
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>السعر: {formatCurrency(pkg.totalPrice)}</span>
                            <span>المدفوع: {formatCurrency(pkg.paid)}</span>
                            {pkg.remaining > 0 && <span className="text-red-500">متبقي: {formatCurrency(pkg.remaining)}</span>}
                          </div>
                          {pkg.expiryDate && <p className="text-xs text-amber-600 mt-1">تنتهي: {formatDate(pkg.expiryDate)}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPackageDetail(pkg)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الباقة</AlertDialogTitle>
                                <AlertDialogDescription>هل أنت متأكد؟ سيتم حذف الباقة وجميع بياناتها.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePackage(pkg.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
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
        </div>
      )}

      {/* Package Form */}
      <Dialog open={showPackageForm} onOpenChange={(open) => { setShowPackageForm(open); if (!open) { resetPackageForm(); setEditingPackage(null) } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              {editingPackage ? 'تعديل باقة' : 'إنشاء باقة جديدة'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">المريض *</Label>
              <Select value={packageForm.profileId} onValueChange={(v) => {
                const prof = profiles.find(p => p.id === v)
                if (prof) setPackageForm(prev => ({ ...prev, profileId: v, patientId: prof.patientId }))
              }}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.patient.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">المنطقة *</Label>
              <Select value={packageForm.areaId} onValueChange={(v) => setPackageForm(prev => ({ ...prev, areaId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                <SelectContent>
                  {areas.filter(a => a.isActive).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">اسم الباقة *</Label>
              <Input value={packageForm.name} onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))} placeholder="مثال: باقة 6 جلسات - ساقين" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">عدد الجلسات</Label>
                <Input type="number" value={packageForm.totalSessions} onChange={(e) => setPackageForm(prev => ({ ...prev, totalSessions: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">إجمالي النبضات</Label>
                <Input type="number" value={packageForm.totalPulses} onChange={(e) => setPackageForm(prev => ({ ...prev, totalPulses: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">السعر الإجمالي (ج.م)</Label>
                <Input type="number" value={packageForm.totalPrice} onChange={(e) => setPackageForm(prev => ({ ...prev, totalPrice: e.target.value }))} />
              </div>
              <div>
                <Label className="mb-1.5 block">المدفوع (ج.م)</Label>
                <Input type="number" value={packageForm.paid} onChange={(e) => setPackageForm(prev => ({ ...prev, paid: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">تاريخ الانتهاء</Label>
              <Input type="date" value={packageForm.expiryDate} onChange={(e) => setPackageForm(prev => ({ ...prev, expiryDate: e.target.value }))} />
            </div>
            <div>
              <Label className="mb-1.5 block">ملاحظات</Label>
              <Textarea value={packageForm.notes} onChange={(e) => setPackageForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPackageForm(false); resetPackageForm(); setEditingPackage(null) }}>إلغاء</Button>
            <Button onClick={handlePackageSubmit} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Package className="w-4 h-4" /> {editingPackage ? 'تعديل' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Detail */}
      {showPackageDetail && (
        <Dialog open={true} onOpenChange={() => setShowPackageDetail(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" /> {showPackageDetail.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">المريض</p>
                  <p className="font-medium text-sm">{showPackageDetail.patient?.name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">المنطقة</p>
                  <p className="font-medium text-sm">{showPackageDetail.area?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-center">
                  <p className="text-xs text-muted-foreground">الجلسات</p>
                  <p className="font-bold text-lg">{showPackageDetail.usedSessions}<span className="text-muted-foreground font-normal">/{showPackageDetail.totalSessions}</span></p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-center">
                  <p className="text-xs text-muted-foreground">النبضات</p>
                  <p className="font-bold text-lg">{showPackageDetail.usedPulses}<span className="text-muted-foreground font-normal">/{showPackageDetail.totalPulses}</span></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center">
                  <p className="text-xs text-muted-foreground">المدفوع</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(showPackageDetail.paid)}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-center">
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className="font-bold text-red-600">{formatCurrency(showPackageDetail.remaining)}</p>
                </div>
              </div>
              {showPackageDetail.expiryDate && (
                <p className="text-sm text-amber-600">تاريخ الانتهاء: {formatDate(showPackageDetail.expiryDate)}</p>
              )}
              {showPackageDetail.sessions && showPackageDetail.sessions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">الجلسات المستخدمة:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {showPackageDetail.sessions.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                        <span>{formatDate(s.date)}</span>
                        <Badge className={cn('text-[10px]', STATUS_MAP[s.status]?.color)}>{STATUS_MAP[s.status]?.label}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPackageDetail(null)}>إغلاق</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )

  // ═══════════════════════════════════════
  // Machines & Areas Tab
  // ═══════════════════════════════════════
  const [machineForm, setMachineForm] = useState({ name: '', type: '', wavelength: '', maxFluence: '', spotSizes: '', notes: '' })
  const [areaForm, setAreaForm] = useState({ name: '', malePulses: '200', femalePulses: '150', pulsePrice: '2' })

  const handleMachineSubmit = async () => {
    if (!machineForm.name.trim() || !machineForm.type) { toast.error('يرجى ملء الحقول المطلوبة'); return }
    try {
      if (editingMachine) {
        await fetch(`/api/laser-v2/machines/${editingMachine.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(machineForm) })
        toast.success('تم تعديل الجهاز')
        emitChange('laser', 'update', editingMachine.id)
      } else {
        await fetch('/api/laser-v2/machines', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(machineForm) })
        toast.success('تم إضافة الجهاز')
        emitChange('laser', 'create', null)
      }
      setShowMachineForm(false); setEditingMachine(null); setMachineForm({ name: '', type: '', wavelength: '', maxFluence: '', spotSizes: '', notes: '' }); fetchAll()
    } catch { toast.error('خطأ في حفظ الجهاز') }
  }

  const handleAreaSubmit = async () => {
    if (!areaForm.name.trim()) { toast.error('يرجى إدخال اسم المنطقة'); return }
    try {
      if (editingArea) {
        await fetch(`/api/laser-v2/areas/${editingArea.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(areaForm) })
        toast.success('تم تعديل المنطقة')
        emitChange('laser', 'update', editingArea.id)
      } else {
        await fetch('/api/laser-v2/areas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(areaForm) })
        toast.success('تم إضافة المنطقة')
        emitChange('laser', 'create', null)
      }
      setShowAreaForm(false); setEditingArea(null); setAreaForm({ name: '', malePulses: '200', femalePulses: '150', pulsePrice: '2' }); fetchAll()
    } catch { toast.error('خطأ في حفظ المنطقة') }
  }

  const handleToggleMachine = async (m: Machine) => {
    try {
      await fetch(`/api/laser-v2/machines/${m.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !m.isActive }) })
      emitChange('laser', 'update', m.id)
      fetchAll()
    } catch { toast.error('خطأ') }
  }

  const handleToggleArea = async (a: Area) => {
    try {
      await fetch(`/api/laser-v2/areas/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !a.isActive }) })
      emitChange('laser', 'update', a.id)
      fetchAll()
    } catch { toast.error('خطأ') }
  }

  const handleDeleteMachine = async (id: string) => {
    try { await fetch(`/api/laser-v2/machines/${id}`, { method: 'DELETE' }); toast.success('تم حذف الجهاز'); emitChange('laser', 'delete', id); fetchAll() }
    catch { toast.error('خطأ') }
  }

  const handleDeleteArea = async (id: string) => {
    try { await fetch(`/api/laser-v2/areas/${id}`, { method: 'DELETE' }); toast.success('تم حذف المنطقة'); emitChange('laser', 'delete', id); fetchAll() }
    catch { toast.error('خطأ') }
  }

  const renderMachinesAreas = () => (
    <div className="space-y-6">
      {/* Machines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center gap-2"><Cpu className="w-4 h-4 text-amber-500" /> الأجهزة ({machines.length})</h3>
          <Button size="sm" onClick={() => { setEditingMachine(null); setMachineForm({ name: '', type: '', wavelength: '', maxFluence: '', spotSizes: '', notes: '' }); setShowMachineForm(true) }} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-3.5 h-3.5" /> إضافة جهاز
          </Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {machines.map(m => (
            <Card key={m.id} className={cn(!m.isActive && 'opacity-60')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                      <Cpu className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[m.type] || m.type}</Badge>
                        {m.wavelength && <span className="text-xs text-muted-foreground">{m.wavelength}</span>}
                        <span className="text-xs text-muted-foreground">{m._count?.sessions || 0} جلسة</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={m.isActive} onCheckedChange={() => handleToggleMachine(m)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingMachine(m); setMachineForm({ name: m.name, type: m.type, wavelength: m.wavelength || '', maxFluence: m.maxFluence?.toString() || '', spotSizes: m.spotSizes || '', notes: m.notes || '' }); setShowMachineForm(true) }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>حذف الجهاز</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMachine(m.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Areas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-amber-500" /> المناطق ({areas.length})</h3>
          <Button size="sm" onClick={() => { setEditingArea(null); setAreaForm({ name: '', malePulses: '200', femalePulses: '150', pulsePrice: '2' }); setShowAreaForm(true) }} className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white">
            <Plus className="w-3.5 h-3.5" /> إضافة منطقة
          </Button>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {areas.map(a => (
            <Card key={a.id} className={cn(!a.isActive && 'opacity-60')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>ذكر: {a.malePulses}</span>
                        <span>أنثى: {a.femalePulses}</span>
                        <span className="font-medium text-amber-600">{a.pulsePrice} ج.م/نبضة</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={a.isActive} onCheckedChange={() => handleToggleArea(a)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingArea(a); setAreaForm({ name: a.name, malePulses: String(a.malePulses), femalePulses: String(a.femalePulses), pulsePrice: String(a.pulsePrice) }); setShowAreaForm(true) }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>حذف المنطقة</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteArea(a.id)} className="bg-red-500 hover:bg-red-600">حذف</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Machine Form Dialog */}
      <Dialog open={showMachineForm} onOpenChange={(open) => { setShowMachineForm(open); if (!open) setEditingMachine(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Cpu className="w-5 h-5 text-amber-500" /> {editingMachine ? 'تعديل جهاز' : 'إضافة جهاز جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="mb-1.5 block">اسم الجهاز *</Label><Input value={machineForm.name} onChange={(e) => setMachineForm(prev => ({ ...prev, name: e.target.value }))} placeholder="مثال: Candela GentleLase Pro" /></div>
            <div><Label className="mb-1.5 block">نوع الشعاع *</Label>
              <Select value={machineForm.type} onValueChange={(v) => setMachineForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                <SelectContent>{MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">الطول الموجي</Label><Input value={machineForm.wavelength} onChange={(e) => setMachineForm(prev => ({ ...prev, wavelength: e.target.value }))} placeholder="755nm" /></div>
              <div><Label className="mb-1.5 block">أقصى طاقة J/cm²</Label><Input type="number" value={machineForm.maxFluence} onChange={(e) => setMachineForm(prev => ({ ...prev, maxFluence: e.target.value }))} /></div>
            </div>
            <div><Label className="mb-1.5 block">أحجام البقعة</Label><Input value={machineForm.spotSizes} onChange={(e) => setMachineForm(prev => ({ ...prev, spotSizes: e.target.value }))} placeholder="10,12,15,18 mm" /></div>
            <div><Label className="mb-1.5 block">ملاحظات</Label><Textarea value={machineForm.notes} onChange={(e) => setMachineForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMachineForm(false)}>إلغاء</Button>
            <Button onClick={handleMachineSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">{editingMachine ? 'تعديل' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Area Form Dialog */}
      <Dialog open={showAreaForm} onOpenChange={(open) => { setShowAreaForm(open); if (!open) setEditingArea(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-amber-500" /> {editingArea ? 'تعديل منطقة' : 'إضافة منطقة جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="mb-1.5 block">اسم المنطقة *</Label><Input value={areaForm.name} onChange={(e) => setAreaForm(prev => ({ ...prev, name: e.target.value }))} placeholder="مثال: الوجه الكامل" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">نبضات ذكر</Label><Input type="number" value={areaForm.malePulses} onChange={(e) => setAreaForm(prev => ({ ...prev, malePulses: e.target.value }))} /></div>
              <div><Label className="mb-1.5 block">نبضات أنثى</Label><Input type="number" value={areaForm.femalePulses} onChange={(e) => setAreaForm(prev => ({ ...prev, femalePulses: e.target.value }))} /></div>
            </div>
            <div><Label className="mb-1.5 block">سعر النبضة (ج.م)</Label><Input type="number" step="0.5" value={areaForm.pulsePrice} onChange={(e) => setAreaForm(prev => ({ ...prev, pulsePrice: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAreaForm(false)}>إلغاء</Button>
            <Button onClick={handleAreaSubmit} className="bg-amber-600 hover:bg-amber-700 text-white">{editingArea ? 'تعديل' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // ═══════════════════════════════════════
  // Finance Tab
  // ═══════════════════════════════════════
  const [revenueForm, setRevenueForm] = useState({ patientId: '', type: 'extra', amount: '', description: '', date: '' })

  const handleRevenueSubmit = async () => {
    if (!revenueForm.amount || parseFloat(revenueForm.amount) <= 0) { toast.error('يرجى إدخال مبلغ صالح'); return }
    try {
      await fetch('/api/laser-v2/revenue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(revenueForm),
      })
      toast.success('تم إضافة الإيراد')
      emitChange('laser', 'create', null)
      setShowRevenueForm(false)
      setRevenueForm({ patientId: '', type: 'extra', amount: '', description: '', date: '' })
      fetchAll()
    } catch { toast.error('خطأ في إضافة الإيراد') }
  }

  const totalSessionRevenue = revenues.filter(r => r.type === 'session').reduce((s, r) => s + r.amount, 0)
  const totalPackageRevenue = revenues.filter(r => r.type === 'package').reduce((s, r) => s + r.amount, 0)
  const totalExtraRevenue = revenues.filter(r => r.type === 'extra').reduce((s, r) => s + r.amount, 0)
  const totalAllRevenue = revenues.reduce((s, r) => s + r.amount, 0)

  const renderFinance = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalAllRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">جلسات (نبضات)</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(totalSessionRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">باقات</p>
              <p className="text-lg font-bold text-violet-600">{formatCurrency(totalPackageRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">إيرادات أخرى</p>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(totalExtraRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{revenues.length} سجل إيراد</p>
        <Button size="sm" onClick={() => setShowRevenueForm(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-3.5 h-3.5" /> إيراد جديد
        </Button>
      </div>

      {/* Revenue List */}
      <div className="space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto">
        {revenues.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد إيرادات</p>
          </div>
        ) : (
          <AnimatePresence>
            {revenues.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      r.type === 'session' ? 'bg-amber-100 dark:bg-amber-950/30' : r.type === 'package' ? 'bg-violet-100 dark:bg-violet-950/30' : 'bg-emerald-100 dark:bg-emerald-950/30'
                    )}>
                      <DollarSign className={cn(
                        'w-4 h-4',
                        r.type === 'session' ? 'text-amber-600' : r.type === 'package' ? 'text-violet-600' : 'text-emerald-600'
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{r.description || 'إيراد'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(r.date)}</span>
                        {r.patient && <span>{r.patient.name}</span>}
                        <Badge variant="outline" className="text-[10px]">
                          {r.type === 'session' ? 'جلسة' : r.type === 'package' ? 'باقة' : 'أخرى'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-emerald-600">{formatCurrency(r.amount)}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Revenue Form */}
      <Dialog open={showRevenueForm} onOpenChange={(open) => { setShowRevenueForm(open); if (!open) setRevenueForm({ patientId: '', type: 'extra', amount: '', description: '', date: '' }) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> إضافة إيراد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="mb-1.5 block">المريض (اختياري)</Label>
              <Select value={revenueForm.patientId} onValueChange={(v) => setRevenueForm(prev => ({ ...prev, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مريض</SelectItem>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="mb-1.5 block">النوع</Label>
              <Select value={revenueForm.type} onValueChange={(v) => setRevenueForm(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="session">جلسة</SelectItem>
                  <SelectItem value="package">باقة</SelectItem>
                  <SelectItem value="extra">إيراد آخر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="mb-1.5 block">المبلغ (ج.م) *</Label><Input type="number" value={revenueForm.amount} onChange={(e) => setRevenueForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0" /></div>
            <div><Label className="mb-1.5 block">الوصف</Label><Input value={revenueForm.description} onChange={(e) => setRevenueForm(prev => ({ ...prev, description: e.target.value }))} /></div>
            <div><Label className="mb-1.5 block">التاريخ</Label><Input type="date" value={revenueForm.date} onChange={(e) => setRevenueForm(prev => ({ ...prev, date: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevenueForm(false)}>إلغاء</Button>
            <Button onClick={handleRevenueSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  // ═══════════════════════════════════════
  // Profile Form Dialog
  // ═══════════════════════════════════════
  const [profileForm, setProfileForm] = useState({
    patientId: '', skinType: '', hairColor: '', hairThickness: '',
    skinSensitivity: '', hormonalConditions: '', contraindications: '',
    previousTreatments: '', notes: '',
  })

  const handleProfileSubmit = async () => {
    if (!profileForm.patientId || !profileForm.skinType) { toast.error('يرجى اختيار المريض ونوع البشرة'); return }
    try {
      if (editingProfile) {
        await fetch(`/api/laser-v2/profiles/${editingProfile.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileForm),
        })
        toast.success('تم تعديل البروفايل')
        emitChange('laser', 'update', editingProfile.id)
      } else {
        await fetch('/api/laser-v2/profiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileForm),
        })
        toast.success('تم إنشاء البروفايل')
        emitChange('laser', 'create', null)
      }
      setShowProfileForm(false); setEditingProfile(null)
      setProfileForm({ patientId: '', skinType: '', hairColor: '', hairThickness: '', skinSensitivity: '', hormonalConditions: '', contraindications: '', previousTreatments: '', notes: '' })
      fetchAll()
    } catch (e) {
      const errMsg = e && typeof e === 'object' && 'error' in e ? (e as { error: string }).error : 'خطأ في حفظ البروفايل'
      toast.error(errMsg)
    }
  }

  const handleDeleteProfile = async (id: string) => {
    try {
      await fetch(`/api/laser-v2/profiles/${id}`, { method: 'DELETE' })
      toast.success('تم حذف البروفايل')
      emitChange('laser', 'delete', id)
      fetchAll()
    } catch { toast.error('خطأ') }
  }

  const renderProfileForm = () => (
    <Dialog open={showProfileForm} onOpenChange={(open) => { setShowProfileForm(open); if (!open) { setEditingProfile(null); setProfileForm({ patientId: '', skinType: '', hairColor: '', hairThickness: '', skinSensitivity: '', hormonalConditions: '', contraindications: '', previousTreatments: '', notes: '' }) } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-amber-500" />
            {editingProfile ? 'تعديل البروفايل' : 'إنشاء بروفايل ليزر جديد'}
          </DialogTitle>
          <DialogDescription>{editingProfile ? 'قم بتعديل بيانات البروفايل' : 'أنشئ بروفايل جديد لتابع جلسات الليزر'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Patient Selection */}
          <div>
            <Label className="mb-1.5 block">المريض *</Label>
            {editingProfile ? (
              <Input value={editingProfile.patient.name} disabled />
            ) : (
              <Select value={profileForm.patientId} onValueChange={(v) => setProfileForm(prev => ({ ...prev, patientId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
                <SelectContent>
                  {patients.filter(p => !profiles.some(pr => pr.patientId === p.id)).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.phone ? `• ${p.phone}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!editingProfile && profiles.length >= patients.length && patients.length > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Info className="w-3 h-3" /> جميع المرضى لديهم بروفايل ليزر بالفعل</p>
            )}
          </div>

          {/* Skin Type */}
          <div>
            <Label className="mb-1.5 block">نوع البشرة (Fitzpatrick) *</Label>
            <Select value={profileForm.skinType} onValueChange={(v) => setProfileForm(prev => ({ ...prev, skinType: v }))}>
              <SelectTrigger><SelectValue placeholder="اختر نوع البشرة" /></SelectTrigger>
              <SelectContent>
                {Object.entries(SKIN_TYPES_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: info.color }} />
                      <span>{info.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {profileForm.skinType && SKIN_TYPES_INFO[profileForm.skinType] && (
              <p className="text-xs text-muted-foreground mt-1">{SKIN_TYPES_INFO[profileForm.skinType].desc}</p>
            )}
          </div>

          {/* Hair Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">لون الشعر</Label>
              <Select value={profileForm.hairColor} onValueChange={(v) => setProfileForm(prev => ({ ...prev, hairColor: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{HAIR_COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block">كثافة الشعر</Label>
              <Select value={profileForm.hairThickness} onValueChange={(v) => setProfileForm(prev => ({ ...prev, hairThickness: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{HAIR_THICKNESS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">حساسية البشرة</Label>
            <Select value={profileForm.skinSensitivity} onValueChange={(v) => setProfileForm(prev => ({ ...prev, skinSensitivity: v }))}>
              <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>{SKIN_SENSITIVITY.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Medical Info */}
          <div>
            <Label className="mb-1.5 block">حالات هرمونية</Label>
            <Textarea value={profileForm.hormonalConditions} onChange={(e) => setProfileForm(prev => ({ ...prev, hormonalConditions: e.target.value }))} rows={2} placeholder="مثل: تكيس المبايض، مشاكل الغدة الدرقية..." />
          </div>
          <div>
            <Label className="mb-1.5 block">موانع استعمال</Label>
            <Textarea value={profileForm.contraindications} onChange={(e) => setProfileForm(prev => ({ ...prev, contraindications: e.target.value }))} rows={2} placeholder="مثل: حساسية ضوئية، أمراض جلدية..." />
          </div>
          <div>
            <Label className="mb-1.5 block">علاجات سابقة</Label>
            <Textarea value={profileForm.previousTreatments} onChange={(e) => setProfileForm(prev => ({ ...prev, previousTreatments: e.target.value }))} rows={2} placeholder="علاجات ليزر سابقة أو طرق أخرى..." />
          </div>
          <div>
            <Label className="mb-1.5 block">ملاحظات</Label>
            <Textarea value={profileForm.notes} onChange={(e) => setProfileForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowProfileForm(false)}>إلغاء</Button>
          <Button onClick={handleProfileSubmit} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
            <CheckCircle className="w-4 h-4" /> {editingProfile ? 'تعديل البروفايل' : 'إنشاء البروفايل'}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">نظام الليزر المتكامل</h2>
            <p className="text-xs text-muted-foreground">إدارة جلسات الليزر والباقات والمالية</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={fetchAll} className="gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          تحديث
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="w-full grid grid-cols-6 h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="dashboard" className="text-xs py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <BarChart3 className="w-3.5 h-3.5 ml-1" />
            لوحة التحكم
          </TabsTrigger>
          <TabsTrigger value="profiles" className="text-xs py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <User className="w-3.5 h-3.5 ml-1" />
            البروفايلات
          </TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Zap className="w-3.5 h-3.5 ml-1" />
            الجلسات
          </TabsTrigger>
          <TabsTrigger value="packages" className="text-xs py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Package className="w-3.5 h-3.5 ml-1" />
            الباقات
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Settings className="w-3.5 h-3.5 ml-1" />
            الأجهزة والمناطق
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs py-2 rounded-lg data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <DollarSign className="w-3.5 h-3.5 ml-1" />
            المالية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">{renderDashboard()}</TabsContent>
        <TabsContent value="profiles" className="mt-4">{renderProfiles()}</TabsContent>
        <TabsContent value="sessions" className="mt-4">{renderNewSession()}</TabsContent>
        <TabsContent value="packages" className="mt-4">{renderPackages()}</TabsContent>
        <TabsContent value="settings" className="mt-4">{renderMachinesAreas()}</TabsContent>
        <TabsContent value="finance" className="mt-4">{renderFinance()}</TabsContent>
      </Tabs>

      {/* Dialogs */}
      {renderProfileForm()}
      {renderProfileDetail()}
    </div>
  )
}
