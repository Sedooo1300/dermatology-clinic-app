'use client'

import { useEffect, useSyncExternalStore, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { getSocket } from '@/lib/socket'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { PatientList } from '@/components/patients/patient-list'
import { PatientDetail } from '@/components/patients/patient-detail'
import { SessionTypeList } from '@/components/sessions/session-type-list'
import { LaserView } from '@/components/laser/laser-view'
import { VisitList } from '@/components/visits/visit-list'
import { FinanceView } from '@/components/finance/finance-view'
import { ReportsView } from '@/components/reports/reports-view'
import { SettingsView } from '@/components/settings/settings-view'
import { AlertsView } from '@/components/alerts/alerts-view'
import { CalendarView } from '@/components/calendar/calendar-view'
import { PrescriptionsView } from '@/components/prescriptions/prescriptions-view'
import { QueueView } from '@/components/queue/queue-view'
import { ThemeColor } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Database, CheckCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

export default function Home() {
  const {
    currentView, themeColor, setThemeColor, setIsConnected,
    sidebarOpen, setSidebarOpen,
  } = useAppStore()
  const isMounted = useIsMounted()
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'no_db' | 'needs_setup' | 'setting_up' | 'error'>('checking')

  // Check database and auto-setup
  useEffect(() => {
    checkAndSetup()
  }, [])

  async function checkAndSetup() {
    setDbStatus('checking')
    try {
      const res = await fetch('/api/setup')
      const data = await res.json()

      if (data.status === 'ready') {
        setDbStatus('ready')
      } else if (data.status === 'needs_setup') {
        // Auto-setup: create tables
        setDbStatus('setting_up')
        try {
          const setupRes = await fetch('/api/setup', { method: 'POST' })
          const setupData = await setupRes.json()
          if (setupData.status === 'success') {
            setDbStatus('ready')
          } else {
            setDbStatus('error')
          }
        } catch {
          setDbStatus('error')
        }
      } else if (data.status === 'no_database') {
        setDbStatus('no_db')
      } else {
        setDbStatus('error')
      }
    } catch {
      // If API fails, still try to show the app
      setDbStatus('ready')
    }
  }

  useEffect(() => {
    if (dbStatus !== 'ready') return

    // Apply saved theme
    const themeMap: Record<ThemeColor, string> = {
      teal: '',
      blue: 'blue',
      purple: 'purple',
      orange: 'orange',
      red: 'red',
      green: 'green',
    }
    const themeVal = themeMap[themeColor]
    if (themeVal) {
      document.documentElement.setAttribute('data-theme', themeVal)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }

    // Socket connection (mock on Vercel)
    const socket = getSocket()
    socket?.on?.('connect', () => setIsConnected(true))
    socket?.on?.('disconnect', () => setIsConnected(false))

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    return () => {
      socket?.off?.('connect')
      socket?.off?.('disconnect')
    }
  }, [dbStatus, themeColor, setThemeColor, setIsConnected])

  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false)
  }, [currentView, sidebarOpen, setSidebarOpen])

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  // Database setup screen
  if (dbStatus !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-950 dark:to-gray-900 p-4">
        <div className="max-w-sm w-full">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
            {dbStatus === 'checking' || dbStatus === 'setting_up' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/30 mx-auto mb-4 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {dbStatus === 'checking' ? 'جاري الفحص...' : 'جاري إعداد قاعدة البيانات...'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {dbStatus === 'checking'
                    ? 'التحقق من حالة قاعدة البيانات'
                    : 'إنشاء الجداول المطلوبة...'}
                </p>
              </>
            ) : dbStatus === 'no_db' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
                  <Database className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  قاعدة البيانات غير متصلة
                </h2>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 text-right">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">خطوات الإعداد:</p>
                  <ol className="text-xs text-amber-600 dark:text-amber-500 space-y-1.5 list-decimal list-inside">
                    <li>افتح Vercel Dashboard</li>
                    <li>اضغط على المشروع ← Settings ← Environment Variables</li>
                    <li>أضف <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">DATABASE_URL</code></li>
                    <li>أعد النشر (Redeploy)</li>
                  </ol>
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-3 font-bold">
                    أو: اضغط Storage ← Create Database ← Neon (مجاناً)
                  </p>
                </div>
                <Button onClick={checkAndSetup} variant="outline" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  إعادة الفحص
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  حدث خطأ
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  لم يتم إعداد قاعدة البيانات
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={checkAndSetup} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    إعادة المحاولة
                  </Button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
            جلسات عيادة المغازى v2.0
          </p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />
      case 'patients':
        return <PatientList />
      case 'patient-detail':
        return <PatientDetail />
      case 'session-types':
        return <SessionTypeList />
      case 'laser':
        return <LaserView />
      case 'visits':
        return <VisitList />
      case 'finance':
        return <FinanceView />
      case 'alerts':
        return <AlertsView />
      case 'calendar':
        return <CalendarView />
      case 'prescriptions':
        return <PrescriptionsView />
      case 'queue':
        return <QueueView />
      case 'reports':
        return <ReportsView />
      case 'settings':
        return <SettingsView />
      default:
        return <DashboardView />
    }
  }

  return (
    <AppLayout>
      {renderView()}
    </AppLayout>
  )
}
