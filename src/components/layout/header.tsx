'use client'

import { useAppStore } from '@/lib/store'
import { getSocket } from '@/lib/socket'
import { useEffect, useState } from 'react'
import { Menu, Wifi, WifiOff, Bell, Sun, Moon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { motion, AnimatePresence } from 'framer-motion'

const viewTitles: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  patients: 'الحالات',
  'patient-detail': 'تفاصيل الحالة',
  'session-types': 'أنواع الجلسات',
  laser: 'ليزر إزالة الشعر',
  visits: 'الزيارات',
  finance: 'المالية',
  alerts: 'التنبيهات',
  reports: 'التقارير',
  settings: 'الإعدادات',
  calendar: 'التقويم',
  prescriptions: 'الوصفات الطبية',
  queue: 'قائمة الانتظار',
}

export function Header() {
  const { currentView, toggleSidebar, setIsConnected, isConnected } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [alerts, setAlerts] = useState<Array<{ id: string; title: string; message: string; type: string }>>([])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const socket = getSocket()
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))

    // Fetch alerts count
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alerts')
        const data = await res.json()
        const unread = data.filter((a: { isRead: boolean }) => !a.isRead)
        setUnreadCount(unread.length)
        setAlerts(unread.slice(0, 5))
      } catch {
        // ignore
      }
    }
    fetchAlerts()

    return () => {
      socket.off('connect')
      socket.off('disconnect')
    }
  }, [setIsConnected])

  const handleAlertRead = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
      setAlerts((prev) => prev.filter((a) => a.id !== id))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/alerts')
      const data = await res.json()
      await Promise.all(
        data.filter((a: { isRead: boolean }) => !a.isRead).map((a: { id: string }) =>
          fetch(`/api/alerts/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) })
        )
      )
      setAlerts([])
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="font-bold text-lg text-foreground">
            {viewTitles[currentView] || 'لوحة التحكم'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="relative"
            >
              <Sun className="w-5 h-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-5 h-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          )}

          {/* Connection status */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${isConnected ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'}`}>
            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isConnected ? 'متصل' : 'غير متصل'}</span>
          </div>

          {/* Alerts */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="font-bold text-sm">التنبيهات</span>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                    تحديد الكل كمقروء
                  </button>
                )}
              </div>
              <AnimatePresence>
                {alerts.length > 0 ? (
                  alerts.map((alert) => (
                    <DropdownMenuItem key={alert.id} onClick={() => handleAlertRead(alert.id)} className="flex-col items-start gap-1 p-3">
                      <div className="flex items-center gap-2 w-full">
                        <Badge variant="outline" className="text-[10px]">{alert.type === 'reminder' ? 'تذكير' : alert.type === 'followup' ? 'متابعة' : 'تنبيه'}</Badge>
                        <span className="text-xs text-muted-foreground mr-auto">{alert.title}</span>
                      </div>
                      <p className="text-xs text-foreground">{alert.message}</p>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    لا توجد تنبيهات جديدة
                  </div>
                )}
              </AnimatePresence>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
