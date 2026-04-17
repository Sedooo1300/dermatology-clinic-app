'use client'

import { useEffect, useSyncExternalStore } from 'react'
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

  useEffect(() => {
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

    // Socket connection
    const socket = getSocket()
    socket.on('connect', () => setIsConnected(true))
    socket.on('disconnect', () => setIsConnected(false))
    socket.on('sync:update', () => {
      // Could trigger a refresh of relevant data
    })

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed, not critical
      })
    }

    // Close sidebar on route change (mobile)
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('sync:update')
    }
  }, [themeColor, setThemeColor, setIsConnected])

  // Close sidebar when view changes
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
