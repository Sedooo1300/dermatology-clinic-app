'use client'

import { useEffect, useSyncExternalStore, useState, useCallback } from 'react'
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
import { Database, CheckCircle, Loader2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

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
  const [errorMsg, setErrorMsg] = useState('')
  const [skipDb, setSkipDb] = useState(false)

  // Check database and auto-setup
  useEffect(() => {
    if (skipDb) return
    checkAndSetup()
  }, [skipDb])

  const checkAndSetup = useCallback(async () => {
    setDbStatus('checking')
    setErrorMsg('')
    try {
      const res = await fetch('/api/setup')
      const data = await res.json()

      if (data.status === 'ready') {
        setDbStatus('ready')
      } else if (data.status === 'needs_setup') {
        setDbStatus('setting_up')
        try {
          const setupRes = await fetch('/api/setup', { method: 'POST' })
          const setupData = await setupRes.json()
          if (setupData.status === 'success') {
            setDbStatus('ready')
          } else {
            setDbStatus('error')
            setErrorMsg(setupData.message || 'Failed to create tables')
          }
        } catch (e: any) {
          setErrorMsg(e.message || 'Setup failed')
          setDbStatus('error')
        }
      } else if (data.status === 'no_database') {
        setDbStatus('no_db')
      } else if (data.status === 'error') {
        setDbStatus('error')
        setErrorMsg(data.message || 'Database error')
      } else {
        setDbStatus('ready')
      }
    } catch {
      setDbStatus('ready')
    }
  }, [])

  useEffect(() => {
    if (dbStatus !== 'ready') return

    const themeMap: Record<ThemeColor, string> = {
      teal: '', blue: 'blue', purple: 'purple',
      orange: 'orange', red: 'red', green: 'green',
    }
    const themeVal = themeMap[themeColor]
    if (themeVal) {
      document.documentElement.setAttribute('data-theme', themeVal)
    } else {
      document.documentElement.removeAttribute('data-theme')
    }

    const socket = getSocket()
    socket?.on?.('connect', () => setIsConnected(true))
    socket?.on?.('disconnect', () => setIsConnected(false))

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500 text-sm">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!skipDb && dbStatus !== 'ready') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {dbStatus === 'checking' || dbStatus === 'setting_up' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-teal-100 mx-auto mb-4 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  {dbStatus === 'checking' ? 'جاري الفحص...' : 'جاري إعداد قاعدة البيانات...'}
                </h2>
              </>
            ) : dbStatus === 'no_db' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-100 mx-auto mb-4 flex items-center justify-center">
                  <Database className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">قاعدة البيانات غير متصلة</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-right">
                  <p className="text-xs font-bold text-amber-700 mb-2">خطوات الإعداد:</p>
                  <ol className="text-xs text-amber-600 space-y-1.5 list-decimal list-inside">
                    <li>افتح Vercel Dashboard</li>
                    <li>المشروع ← Settings ← Environment Variables</li>
                    <li>احذف <strong>DATABASE_URL</strong> و <strong>DIRECT_URL</strong> القديمة</li>
                    <li>ارجع لتبويب <strong>Storage</strong></li>
                    <li>اضغط على القاعدة ← <strong>.env setup</strong></li>
                    <li>أعد النشر (Redeploy)</li>
                  </ol>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={checkAndSetup} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition gap-2 flex items-center">
                    <RefreshCw className="w-4 h-4" />
                    إعادة الفحص
                  </button>
                  <button onClick={() => setSkipDb(true)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition gap-2 flex items-center">
                    <ArrowLeft className="w-4 h-4" />
                    تخطي
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-orange-100 mx-auto mb-4 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">خطأ في قاعدة البيانات</h2>
                <p className="text-sm text-gray-500 mb-1">الرابط غير صحيح أو القاعدة غير متاحة</p>
                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-red-600 font-mono break-all text-right" dir="ltr">{errorMsg}</p>
                  </div>
                )}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-right">
                  <p className="text-xs font-bold text-amber-700 mb-2">الحل:</p>
                  <ol className="text-xs text-amber-600 space-y-1.5 list-decimal list-inside">
                    <li>افتح <strong>console.neon.tech</strong></li>
                    <li>اختار المشروع ← <strong>Connection string</strong></li>
                    <li>انسخ الرابط (بدون pgbouncer)</li>
                    <li>في Vercel: Settings ← Environment Variables</li>
                    <li>عدّل <strong>DATABASE_URL</strong> بالرابط الصح</li>
                    <li>أعد النشر (Redeploy)</li>
                  </ol>
                </div>
                <div className="flex gap-2 justify-center flex-wrap">
                  <button onClick={checkAndSetup} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition gap-2 flex items-center">
                    <RefreshCw className="w-4 h-4" />
                    إعادة المحاولة
                  </button>
                  <button onClick={() => setSkipDb(true)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition gap-2 flex items-center">
                    <ArrowLeft className="w-4 h-4" />
                    تخطي
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">جلسات عيادة المغازى v2.0</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />
      case 'patients': return <PatientList />
      case 'patient-detail': return <PatientDetail />
      case 'session-types': return <SessionTypeList />
      case 'laser': return <LaserView />
      case 'visits': return <VisitList />
      case 'finance': return <FinanceView />
      case 'alerts': return <AlertsView />
      case 'calendar': return <CalendarView />
      case 'prescriptions': return <PrescriptionsView />
      case 'queue': return <QueueView />
      case 'reports': return <ReportsView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  return <AppLayout>{renderView()}</AppLayout>
}
