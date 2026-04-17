'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  Users, Plus, Clock, Play, Check, SkipForward, Trash2, Timer, AlertTriangle,
  ChevronUp, ChevronDown, UserCheck, UserX, ListOrdered,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Patient { id: string; name: string; phone?: string | null }

interface QueueEntry {
  id: string
  patientId: string
  patientName: string
  visitType?: string | null
  notes?: string | null
  status: string
  priority: string
  arrivedAt: string
  startedAt?: string | null
  completedAt?: string | null
  order: number
  patient: { id: string; name: string; phone?: string | null }
}

const visitTypes = ['كشف', 'متابعة', 'ليزر', 'جلسة', 'استشارة', 'أخرى']
const priorityLabels: Record<string, string> = { urgent: 'عاجل', normal: 'عادي', low: 'غير مستعجل' }
const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900',
  normal: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  low: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
}

function getWaitTime(arrivedAt: string, startedAt?: string | null): string {
  const start = new Date(arrivedAt).getTime()
  const end = startedAt ? new Date(startedAt).getTime() : Date.now()
  const diffMs = end - start
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `${minutes} دقيقة`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours} ساعة ${mins} د`
}

export function QueueView() {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formPatientId, setFormPatientId] = useState('')
  const [formVisitType, setFormVisitType] = useState('كشف')
  const [formPriority, setFormPriority] = useState('normal')
  const [formNotes, setFormNotes] = useState('')

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue')
      const data = await res.json()
      setEntries(data)
    } catch (err) {
      console.error('Failed to fetch queue:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [fetchQueue])

  useEffect(() => {
    fetch('/api/patients').then(r => r.json()).then(data => {
      setPatients(data.patients || data)
    }).catch(() => {})
  }, [])

  const waiting = entries.filter(e => e.status === 'waiting')
  const inProgress = entries.filter(e => e.status === 'in-progress')
  const completed = entries.filter(e => e.status === 'completed')

  const handleAdd = async () => {
    if (!formPatientId) { toast.error('يرجى اختيار المريض'); return }
    const patient = patients.find(p => p.id === formPatientId)
    if (!patient) return

    const alreadyInQueue = entries.find(e => e.patientId === formPatientId && e.status !== 'completed')
    if (alreadyInQueue) { toast.error('المريض موجود بالفعل في الانتظار'); return }

    try {
      await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formPatientId,
          patientName: patient.name,
          visitType: formVisitType,
          priority: formPriority,
          notes: formNotes,
        }),
      })
      toast.success('تم إضافة المريض للانتظار')
      setShowAddDialog(false)
      setFormPatientId('')
      setFormNotes('')
      fetchQueue()
    } catch {
      toast.error('خطأ في الإضافة')
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/queue/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success(status === 'in-progress' ? 'بدء الفحص' : status === 'completed' ? 'تم الانتهاء' : 'تم التخطي')
      fetchQueue()
    } catch {
      toast.error('خطأ في التحديث')
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await fetch(`/api/queue/${id}`, { method: 'DELETE' })
      toast.success('تم الحذف')
      fetchQueue()
    } catch {
      toast.error('خطأ في الحذف')
    }
  }

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentEntry = waiting.find(e => e.id === id)
    if (!currentEntry) return

    const sortedWaiting = [...waiting].sort((a, b) => a.order - b.order)
    const currentIdx = sortedWaiting.findIndex(e => e.id === id)
    const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1

    if (swapIdx < 0 || swapIdx >= sortedWaiting.length) return

    const newEntries = sortedWaiting.map((e, i) => {
      if (i === currentIdx) return { ...e, order: sortedWaiting[swapIdx].order }
      if (i === swapIdx) return { ...e, order: currentEntry.order }
      return e
    })

    try {
      await fetch('/api/queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: newEntries.map(e => ({ id: e.id, order: e.order })) }),
      })
      fetchQueue()
    } catch {
      toast.error('خطأ في إعادة الترتيب')
    }
  }

  const stats = {
    avgWait: waiting.length > 0
      ? Math.round(waiting.reduce((acc, e) => acc + (Date.now() - new Date(e.arrivedAt).getTime()) / 60000, 0) / waiting.length)
      : 0,
    completedToday: completed.length,
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500">{waiting.length}</p>
            <p className="text-xs text-muted-foreground">في الانتظار</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">{inProgress.length}</p>
            <p className="text-xs text-muted-foreground">قيد الفحص</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-500">{completed.length}</p>
            <p className="text-xs text-muted-foreground">مكتمل</p>
          </CardContent>
        </Card>
      </div>

      {/* Average Wait & Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          متوسط الانتظار: {stats.avgWait} دقيقة
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" />
              إضافة للدور
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مريض للانتظار</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>المريض *</Label>
                <select
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm"
                  value={formPatientId}
                  onChange={e => setFormPatientId(e.target.value)}
                >
                  <option value="">اختر المريض...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name} {p.phone ? `- ${p.phone}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>نوع الزيارة</Label>
                  <select className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm" value={formVisitType} onChange={e => setFormVisitType(e.target.value)}>
                    {visitTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>الأولوية</Label>
                  <select className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm" value={formPriority} onChange={e => setFormPriority(e.target.value)}>
                    <option value="urgent">عاجل</option>
                    <option value="normal">عادي</option>
                    <option value="low">غير مستعجل</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input className="mt-1" placeholder="ملاحظات إضافية..." value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
              <Button onClick={handleAdd} className="bg-primary text-primary-foreground">إضافة</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ListOrdered className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">قائمة الانتظار فارغة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* In Progress */}
          {inProgress.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4" /> قيد الفحص ({inProgress.length})
              </h3>
              <div className="space-y-2">
                {inProgress.map((entry, i) => (
                  <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                            <Play className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm">{entry.patientName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {entry.visitType && <Badge variant="outline" className="text-[10px]">{entry.visitType}</Badge>}
                              <span>بدأ منذ {getWaitTime(entry.arrivedAt, entry.startedAt)}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="gap-1 text-emerald-600" onClick={() => handleStatusChange(entry.id, 'completed')}>
                              <Check className="w-3 h-3" /> تم
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting */}
          {waiting.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                <Timer className="w-4 h-4" /> في الانتظار ({waiting.length})
              </h3>
              <div className="space-y-2">
                {[...waiting].sort((a, b) => {
                  const pOrder = { urgent: 0, normal: 1, low: 2 }
                  if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority]
                  return a.order - b.order
                }).map((entry, i) => {
                  const waitMinutes = (Date.now() - new Date(entry.arrivedAt).getTime()) / 60000
                  const isLongWait = waitMinutes > 30
                  return (
                    <motion.div key={entry.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className={cn(
                        'border transition-all',
                        isLongWait ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/10' : ''
                      )}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center font-bold text-amber-600">
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">{entry.patientName}</p>
                                <Badge className={cn('text-[10px] border', priorityColors[entry.priority])}>
                                  {priorityLabels[entry.priority]}
                                </Badge>
                                {isLongWait && (
                                  <Badge variant="destructive" className="text-[10px] gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    انتظار طويل
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{getWaitTime(entry.arrivedAt)}</span>
                                {entry.visitType && <Badge variant="outline" className="text-[10px]">{entry.visitType}</Badge>}
                              </div>
                              {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReorder(entry.id, 'up')}>
                                  <ChevronUp className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleReorder(entry.id, 'down')}>
                                  <ChevronDown className="w-3 h-3" />
                                </Button>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" className="gap-1 bg-blue-500 hover:bg-blue-600 text-white h-7 text-xs" onClick={() => handleStatusChange(entry.id, 'in-progress')}>
                                  <Play className="w-3 h-3" /> فحص
                                </Button>
                              </div>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleRemove(entry.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <UserX className="w-4 h-4" /> مكتمل ({completed.length})
              </h3>
              <div className="space-y-2">
                {completed.slice(0, 5).map((entry, i) => (
                  <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: i * 0.03 }}>
                    <Card className="opacity-70">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-through">{entry.patientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.visitType || 'زيارة'} - المدة: {getWaitTime(entry.arrivedAt, entry.completedAt)}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleRemove(entry.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
