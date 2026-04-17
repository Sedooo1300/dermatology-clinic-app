'use client'

import { useEffect, useSyncExternalStore, useState } from 'react'
import { useAppStore } from '@/lib/store'
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
import { CommunicationsView } from '@/components/communications/communications-view'
import { ThemeColor } from '@/lib/store'
import { LoginScreen } from '@/components/auth/login-screen'

const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

export default function Home() {
  const { currentView, themeColor, setThemeColor, sidebarOpen, setSidebarOpen, isAuthenticated, currentUser } = useAppStore()
  const isMounted = useIsMounted()

  useEffect(() => {
    const themeMap: Record<ThemeColor, string> = {
      teal: '', blue: 'blue', purple: 'purple',
      orange: 'orange', red: 'red', green: 'green',
    }
    const themeVal = themeMap[themeColor]
    if (themeVal) document.documentElement.setAttribute('data-theme', themeVal)
    else document.documentElement.removeAttribute('data-theme')

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [themeColor])

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
      case 'communications': return <CommunicationsView />
      case 'reports': return <ReportsView />
      case 'settings': return <SettingsView />
      default: return <DashboardView />
    }
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />
  }

  return <AppLayout>{renderView()}</AppLayout>
}
