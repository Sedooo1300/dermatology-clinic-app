'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronRight, ChevronLeft, CalendarDays, Zap, Clock, X,
  LayoutGrid, List, GripVertical, Eye, Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn, formatDate, formatCurrency, getStatusLabel } from '@/lib/utils'

// Status colors for calendar events
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  new: { label: 'جديد', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-900' },
  completed: { label: 'مكتمل', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-900' },
  scheduled: { label: 'مجدول', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-900' },
  cancelled: { label: 'ملغي', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-900' },
  followup: { label: 'متابعة', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500', border: 'border-purple-200 dark:border-purple-900' },
  procedure: { label: 'إجراء', bg: 'bg-indigo-50 dark:bg-indigo-950/20', text: 'text-indigo-700 dark:text-indigo-400', dot: 'bg-indigo-500', border: 'border-indigo-200 dark:border-indigo-900' },
}

interface VisitEvent {
  id: string
  date: string
  status: string
  paid: number
  patient: { name: string }
  sessionType?: { name: string } | null
  notes?: string | null
  price?: number
  remaining?: number
  _type: 'visit'
}

interface LaserEvent {
  id: string
  date: string
  status: string
  paid: number
  totalAmount: number
  patient: { name: string }
  area: { name: string }
  notes?: string | null
  _type: 'laser'
}

type CalendarEvent = VisitEvent | LaserEvent

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

const SHORT_DAYS = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function isSameDay(dateStr: string, year: number, month: number, day: number) {
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
}

function isToday(year: number, month: number, day: number) {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

function getEventStatus(event: CalendarEvent): string {
  // Determine display status for color coding
  const s = event.status || 'completed'
  if (s === 'completed' && event._type === 'visit') {
    const v = event as VisitEvent
    // Check if it's a follow-up (patient has been before)
    if (v.notes?.includes('متابعة') || v.sessionType?.name?.includes('متابعة')) return 'followup'
    // Check if it's a procedure
    if (v.sessionType?.name?.includes('إجراء') || v.sessionType?.name?.includes('عملية') || v.sessionType?.name?.includes('حرق')) return 'procedure'
  }
  return s
}

function getEventColor(event: CalendarEvent) {
  const status = getEventStatus(event)
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.completed
  if (event._type === 'laser') {
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      text: 'text-orange-700 dark:text-orange-400',
      dot: 'bg-orange-500',
      border: 'border-orange-200 dark:border-orange-900',
      label: 'ليزر',
    }
  }
  return { ...config }
}

type ViewMode = 'month' | 'week' | 'agenda'

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveEvent, setMoveEvent] = useState<CalendarEvent | null>(null)
  const [newDate, setNewDate] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  useEffect(() => {
    fetchEvents()
  }, [year, month])

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const startOfMonth = new Date(year, month, 1).toISOString()
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

      const [visitsRes, laserRes] = await Promise.all([
        fetch(`/api/visits?dateFrom=${startOfMonth}&dateTo=${endOfMonth}&limit=500`),
        fetch(`/api/laser-v2/sessions?dateFrom=${startOfMonth}&dateTo=${endOfMonth}&limit=500`),
      ])

      const visitsData = await visitsRes.json()
      const laserData = await laserRes.json()

      const visitsRaw = visitsData.visits || visitsData || []
      const visits: VisitEvent[] = visitsRaw.map((v: Record<string, unknown>) => ({ ...v, _type: 'visit' as const }))
      const laserRaw = laserData.sessions || laserData || []
      const laserSessions: LaserEvent[] = laserRaw.map((l: Record<string, unknown>) => ({ ...l, _type: 'laser' as const }))

      setEvents([...visits, ...laserSessions])
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate({ year: now.getFullYear(), month: now.getMonth(), day: now.getDate() })
  }

  const getEventsForDay = useCallback((day: number) => {
    return events.filter((e) => isSameDay(e.date, year, month, day))
  }, [events, year, month])

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate.day) : []

  const stats = useMemo(() => {
    const now = new Date()
    const todayEvents = events.filter((e) => isSameDay(e.date, now.getFullYear(), now.getMonth(), now.getDate()))
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    const thisWeekEvents = events.filter((e) => {
      const d = new Date(e.date)
      return d >= thisWeekStart && d <= now
    })
    const completedCount = events.filter((e) => e.status === 'completed').length
    const scheduledCount = events.filter((e) => e.status === 'scheduled').length
    return {
      today: todayEvents.length,
      thisWeek: thisWeekEvents.length,
      thisMonth: events.length,
      completed: completedCount,
      scheduled: scheduledCount,
    }
  }, [events])

  // Week view helper
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const dayOfWeek = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
  }, [currentDate])

  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [daysInMonth, firstDay])

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
  }

  const handleDragOver = (e: React.DragEvent, day: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(day)
  }

  const handleDragLeave = () => setDropTarget(null)

  const handleDrop = (e: React.DragEvent, day: number) => {
    e.preventDefault()
    setDropTarget(null)
    if (draggedEvent) {
      const newDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const currentDateStr = new Date(draggedEvent.date).toISOString().split('T')[0]
      if (newDateStr !== currentDateStr) {
        setMoveEvent(draggedEvent)
        setNewDate(newDateStr)
        setShowMoveDialog(true)
      }
    }
    setDraggedEvent(null)
  }

  const confirmMove = async () => {
    if (!moveEvent || !newDate) return
    try {
      if (moveEvent._type === 'visit') {
        const oldDate = new Date(moveEvent.date)
        const time = oldDate.toTimeString().split(' ')[0]
        const newDateTime = `${newDate}T${time}`
        await fetch(`/api/visits/${moveEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: newDateTime }),
        })
      } else {
        const oldDate = new Date(moveEvent.date)
        const time = oldDate.toTimeString().split(' ')[0]
        const newDateTime = `${newDate}T${time}`
        await fetch(`/api/laser-v2/sessions/${moveEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: newDateTime }),
        })
      }
      toast.success('تم نقل الموعد بنجاح')
      fetchEvents()
    } catch {
      toast.error('خطأ في نقل الموعد')
    }
    setShowMoveDialog(false)
    setMoveEvent(null)
  }

  // Time slots for agenda view
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let h = 8; h <= 21; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
      slots.push(`${String(h).padStart(2, '0')}:30`)
    }
    return slots
  }, [])

  // Agenda events grouped by time
  const agendaEvents = useMemo(() => {
    if (!selectedDate) return {}
    const dayEvents = getEventsForDay(selectedDate.day)
    const grouped: Record<string, CalendarEvent[]> = {}
    dayEvents.forEach((ev) => {
      const time = new Date(ev.date).toTimeString().slice(0, 5)
      if (!grouped[time]) grouped[time] = []
      grouped[time].push(ev)
    })
    return grouped
  }, [selectedDate, getEventsForDay])

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'اليوم', value: stats.today, color: 'text-primary', icon: CalendarDays },
          { label: 'هذا الأسبوع', value: stats.thisWeek, color: 'text-amber-500', icon: Calendar },
          { label: 'هذا الشهر', value: stats.thisMonth, color: 'text-emerald-500', icon: List },
          { label: 'مجدول', value: stats.scheduled, color: 'text-blue-500', icon: Clock },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <stat.icon className={cn('w-4 h-4', stat.color)} />
                <div>
                  <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-bold text-lg">
                {ARABIC_MONTHS[month]} {year}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-0.5">
                {[
                  { mode: 'month' as ViewMode, icon: LayoutGrid, label: 'شهر' },
                  { mode: 'week' as ViewMode, icon: Calendar, label: 'أسبوع' },
                  { mode: 'agenda' as ViewMode, icon: List, label: 'جدول' },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                      viewMode === mode
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={goToToday}>
                اليوم
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {SHORT_DAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              {isLoading ? (
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="h-20" />
                    }

                    const dayEvents = getEventsForDay(day)
                    const isTodayDate = isToday(year, month, day)
                    const isSelected = selectedDate?.year === year && selectedDate?.month === month && selectedDate?.day === day
                    const isDropTarget = dropTarget === day

                    return (
                      <div
                        key={day}
                        className={cn(
                          'h-20 rounded-lg text-center transition-all relative overflow-hidden cursor-pointer p-1',
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : isDropTarget
                              ? 'bg-primary/10 border-2 border-dashed border-primary ring-2 ring-primary/20'
                              : isTodayDate
                                ? 'bg-primary/5 border border-primary/30 hover:bg-primary/10'
                                : 'hover:bg-muted/80 border border-transparent',
                          dayEvents.length > 0 && !isSelected && !isDropTarget && 'bg-muted/30'
                        )}
                        onClick={() => setSelectedDate({ year, month, day })}
                        onDragOver={(e) => handleDragOver(e, day)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, day)}
                      >
                        <span className={cn('text-sm font-medium block', isSelected && 'font-bold')}>
                          {day}
                        </span>
                        {/* Event indicators with colors */}
                        <div className="flex flex-col items-center gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev, i) => {
                            const color = getEventColor(ev)
                            return (
                              <div
                                key={`${ev.id}-${i}`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, ev)}
                                className={cn(
                                  'w-full text-[9px] leading-tight px-0.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing',
                                  isSelected ? 'bg-white/20 text-white' : color.bg
                                )}
                                onClick={(e) => e.stopPropagation()}
                                title={`${ev.patient.name} - ${ev._type === 'laser' ? (ev as LaserEvent).area.name : (ev as VisitEvent).sessionType?.name || 'جلسة'}`}
                              >
                                {ev._type === 'laser' ? (
                                  <span className="flex items-center gap-0.5">
                                    <Zap className="w-2.5 h-2.5 inline shrink-0" style={{ color: isSelected ? 'white' : undefined }} />
                                    <span className="truncate">{ev.patient.name.substring(0, 8)}</span>
                                  </span>
                                ) : (
                                  <span className="truncate block">{ev.patient.name.substring(0, 8)}</span>
                                )}
                              </div>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <span className={cn('text-[8px]', isSelected ? 'text-white/70' : 'text-muted-foreground')}>
                              +{dayEvents.length - 3}
                            </span>
                          )}
                        </div>
                        {/* Color dots for event types */}
                        <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5">
                          {dayEvents.filter(e => e._type === 'visit').length > 0 && (
                            <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : STATUS_CONFIG[getEventStatus(dayEvents.find(e => e._type === 'visit')!)].dot)} />
                          )}
                          {dayEvents.filter(e => e._type === 'laser').length > 0 && (
                            <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-orange-200' : 'bg-orange-500')} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Status Legend */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t flex-wrap">
                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'new').map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className={cn('w-2.5 h-2.5 rounded-full', val.dot)} />
                    <span className="text-[10px] text-muted-foreground">{val.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-[10px] text-muted-foreground">ليزر</span>
                </div>
              </div>
            </>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((d, i) => {
                  const isT = d.toDateString() === new Date().toDateString()
                  const dEvents = events.filter((e) => {
                    const ed = new Date(e.date)
                    return ed.toDateString() === d.toDateString()
                  })
                  return (
                    <div key={i} className={cn(
                      'text-center p-2 rounded-xl transition-all cursor-pointer',
                      isT ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/80'
                    )}>
                      <p className="text-[10px] font-medium opacity-70">{SHORT_DAYS[i]}</p>
                      <p className="text-lg font-bold">{d.getDate()}</p>
                      {dEvents.length > 0 && (
                        <div className="flex items-center justify-center gap-0.5 mt-1">
                          <div className={cn('w-1.5 h-1.5 rounded-full', isT ? 'bg-white' : 'bg-primary')} />
                          <span className="text-[10px]">{dEvents.length}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {weekDays.map((d, i) => {
                  const dEvents = events.filter((e) => {
                    const ed = new Date(e.date)
                    return ed.toDateString() === d.toDateString()
                  })
                  if (dEvents.length === 0) return null
                  return (
                    <div key={i} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {SHORT_DAYS[i]} {d.getDate()} {ARABIC_MONTHS[d.getMonth()]}
                      </p>
                      {dEvents.map((ev) => {
                        const color = getEventColor(ev)
                        return (
                          <motion.div
                            key={ev.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, ev)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing',
                              color.bg, color.border
                            )}
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color.bg)}>
                              {ev._type === 'laser' ? (
                                <Zap className="w-4 h-4 text-orange-500" />
                              ) : (
                                <CalendarDays className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{ev.patient.name}</p>
                                <Badge className={cn('text-[9px] px-1.5 py-0', color.bg, color.text)}>
                                  {getEventStatus(ev) === 'completed' ? 'جلسة' : (STATUS_CONFIG[getEventStatus(ev)]?.label || ev.status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 inline ml-1" />
                                {new Date(ev.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                <span className="mr-2">
                                  {ev._type === 'laser' ? (ev as LaserEvent).area.name : (ev as VisitEvent).sessionType?.name || 'جلسة'}
                                </span>
                              </p>
                            </div>
                            <p className="text-sm font-medium text-emerald-600">
                              {ev.paid.toLocaleString('ar-EG')} ج.م
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>
                  )
                })}
                {weekDays.every((d) => events.filter(e => new Date(e.date).toDateString() === d.toDateString()).length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-8">لا توجد أحداث هذا الأسبوع</p>
                )}
              </div>
            </>
          )}

          {/* AGENDA VIEW */}
          {viewMode === 'agenda' && (
            <>
              {!selectedDate && (
                <div className="text-center py-8">
                  <List className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">اختر يوم من التقويم لعرض جدول الأحداث</p>
                </div>
              )}
              {selectedDate && (
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold">
                      جدول {selectedDate.day} {ARABIC_MONTHS[selectedDate.month]}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {Object.keys(agendaEvents).length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      لا توجد أحداث في هذا اليوم
                    </p>
                  ) : (
                    timeSlots.map((slot) => {
                      const slotEvents = agendaEvents[slot]
                      if (!slotEvents) return null
                      return (
                        <div key={slot} className="flex gap-3 mb-2">
                          <div className="text-xs text-muted-foreground w-12 pt-3 text-center shrink-0 font-mono">
                            {slot}
                          </div>
                          <div className="flex-1 space-y-1">
                            {slotEvents.map((ev) => {
                              const color = getEventColor(ev)
                              return (
                                <motion.div
                                  key={ev.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, ev)}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={cn(
                                    'flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing',
                                    color.bg, color.border
                                  )}
                                >
                                  <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', ev._type === 'laser' ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-primary/10')}>
                                    {ev._type === 'laser' ? (
                                      <Zap className="w-4 h-4 text-orange-500" />
                                    ) : (
                                      <CalendarDays className="w-4 h-4 text-primary" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium">{ev.patient.name}</p>
                                      <Badge className={cn('text-[9px] px-1.5 py-0', color.bg, color.text)}>
                                        {ev._type === 'laser' ? 'ليزر' : (STATUS_CONFIG[getEventStatus(ev)]?.label || ev.status)}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {ev._type === 'laser' ? (ev as LaserEvent).area.name : (ev as VisitEvent).sessionType?.name || 'جلسة'}
                                      {ev.notes && <span className="mr-2">• {ev.notes}</span>}
                                    </p>
                                  </div>
                                  <div className="text-left shrink-0">
                                    <p className="text-sm font-medium text-emerald-600">
                                      {ev.paid.toLocaleString('ar-EG')} ج.م
                                    </p>
                                    {ev._type === 'visit' && (ev as VisitEvent).remaining > 0 && (
                                      <p className="text-[10px] text-red-500">
                                        متبقي: {(ev as VisitEvent).remaining.toLocaleString('ar-EG')}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Events Panel (Month View) */}
      {viewMode === 'month' && (
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      أحداث {selectedDate.day} {ARABIC_MONTHS[selectedDate.month]}
                      <Badge variant="secondary" className="text-[10px]">{selectedDateEvents.length} حدث</Badge>
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      لا توجد أحداث في هذا اليوم
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateEvents.map((event, index) => {
                        const color = getEventColor(event)
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, event)}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-xl border cursor-grab active:cursor-grabbing',
                              color.bg, color.border
                            )}
                          >
                            <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                              event._type === 'laser' ? 'bg-orange-100 dark:bg-orange-900/50' : 'bg-primary/10'
                            )}>
                              {event._type === 'laser' ? (
                                <Zap className="w-5 h-5 text-orange-500" />
                              ) : (
                                <CalendarDays className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium">{event.patient.name}</p>
                                <Badge className={cn('text-[9px] px-1.5 py-0', color.bg, color.text)}>
                                  {event._type === 'laser' ? 'ليزر' : (STATUS_CONFIG[getEventStatus(event)]?.label || event.status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(event.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                <span className="mx-1">•</span>
                                {event._type === 'laser' ? event.area.name : (event as VisitEvent).sessionType?.name || 'جلسة'}
                              </p>
                              {event.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {event.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-left shrink-0">
                              <p className="text-sm font-medium text-emerald-600">
                                {event.paid.toLocaleString('ar-EG')} ج.م
                              </p>
                              {event._type === 'visit' && (event as VisitEvent).remaining > 0 && (
                                <p className="text-[10px] text-red-500">
                                  متبقي: {(event as VisitEvent).remaining.toLocaleString('ar-EG')}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Move Event Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>نقل الموعد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm font-medium">{moveEvent?.patient.name}</p>
              <p className="text-xs text-muted-foreground">
                {moveEvent?._type === 'laser' ? 'جلسة ليزر' : (moveEvent as VisitEvent)?.sessionType?.name || 'زيارة'}
              </p>
            </div>
            <div>
              <Label>التاريخ الجديد</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              يمكنك أيضاً سحب وإفلات الأحداث مباشرة على التقويم لنقلها
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>إلغاء</Button>
            <Button onClick={confirmMove} className="bg-primary text-primary-foreground">
              تأكيد النقل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
