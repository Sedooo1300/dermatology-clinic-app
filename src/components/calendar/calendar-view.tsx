'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, ChevronLeft, CalendarDays, Zap, Clock, Eye, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface VisitEvent {
  id: string
  date: string
  status: string
  paid: number
  patient: { name: string }
  sessionType?: { name: string } | null
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
  _type: 'laser'
}

type CalendarEvent = VisitEvent | LaserEvent

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

const ARABIC_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const SHORT_DAYS = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // Saturday = 0, Sunday = 1, ..., Friday = 6
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Convert to Saturday-first
}

function isSameDay(dateStr: string, year: number, month: number, day: number) {
  const d = new Date(dateStr)
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
}

function isToday(year: number, month: number, day: number) {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedDate, setSelectedDate] = useState<{ year: number; month: number; day: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  useEffect(() => {
    fetchEvents()
  }, [year, month])

  async function fetchEvents() {
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

  const getEventsForDay = (day: number) => {
    return events.filter((e) => isSameDay(e.date, year, month, day))
  }

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
    return {
      today: todayEvents.length,
      thisWeek: thisWeekEvents.length,
      thisMonth: events.length,
    }
  }, [events])

  const calendarDays = useMemo(() => {
    const days = []
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }
    return days
  }, [daysInMonth, firstDay])

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'اليوم', value: stats.today, color: 'text-primary' },
          { label: 'هذا الأسبوع', value: stats.thisWeek, color: 'text-amber-500' },
          { label: 'هذا الشهر', value: stats.thisMonth, color: 'text-emerald-500' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 text-center">
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
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
            <Button variant="outline" size="sm" onClick={goToToday}>
              اليوم
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-14" />
                }

                const dayEvents = getEventsForDay(day)
                const isTodayDate = isToday(year, month, day)
                const isSelected = selectedDate?.year === year && selectedDate?.month === month && selectedDate?.day === day
                const visits = dayEvents.filter((e) => e._type === 'visit').length
                const laser = dayEvents.filter((e) => e._type === 'laser').length

                return (
                  <motion.button
                    key={day}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate({ year, month, day })}
                    className={cn(
                      'h-14 rounded-lg text-center transition-all relative overflow-hidden',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : isTodayDate
                          ? 'bg-primary/10 border-2 border-primary/30 hover:bg-primary/20'
                          : 'hover:bg-muted/80',
                      dayEvents.length > 0 && !isSelected && 'bg-muted/50'
                    )}
                  >
                    <span className={cn('text-sm font-medium', isSelected && 'font-bold')}>
                      {day}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 mt-0.5">
                      {visits > 0 && (
                        <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-white' : 'bg-primary')} />
                      )}
                      {laser > 0 && (
                        <div className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-orange-200' : 'bg-orange-500')} />
                      )}
                    </div>
                    {(visits > 0 || laser > 0) && (
                      <span className={cn('absolute bottom-0.5 text-[8px]', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {visits + laser}
                      </span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">زيارة</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-xs text-muted-foreground">ليزر</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Events */}
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
                  <CardTitle className="text-base">
                    أحداث {selectedDate.day} {ARABIC_MONTHS[selectedDate.month]}
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
                    {selectedDateEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border',
                          event._type === 'laser'
                            ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
                            : 'bg-primary/5 border-primary/20'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          event._type === 'laser'
                            ? 'bg-orange-100 dark:bg-orange-900/50'
                            : 'bg-primary/10'
                        )}>
                          {event._type === 'laser' ? (
                            <Zap className="w-5 h-5 text-orange-500" />
                          ) : (
                            <CalendarDays className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{event.patient.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            <Badge variant="outline" className="text-[10px] mr-1">
                              {event._type === 'laser' ? event.area.name : (event as VisitEvent).sessionType?.name || 'جلسة'}
                            </Badge>
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-emerald-600">
                            {event.paid.toLocaleString('ar-EG')} ج.م
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
