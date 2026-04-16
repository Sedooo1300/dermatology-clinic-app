'use client'

import { useAppStore } from '@/lib/store'
import { Sidebar } from './sidebar'
import { Header } from './header'
import {
  LayoutDashboard,
  Users,
  Scissors,
  Zap,
  CalendarDays,
  Wallet,
  FileBarChart,
  Settings,
} from 'lucide-react'

const bottomNavItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'patients', label: 'الحالات', icon: Users },
  { id: 'visits', label: 'الزيارات', icon: CalendarDays },
  { id: 'finance', label: 'المالية', icon: Wallet },
  { id: 'more', label: 'المزيد', icon: Settings },
] as const

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, setSelectedPatientId } = useAppStore()

  const handleNav = (id: string) => {
    if (id === 'more') {
      setCurrentView('settings')
    } else {
      setCurrentView(id as typeof bottomNavItems[number]['id'])
    }
    setSelectedPatientId(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Navigation (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            const isActive = currentView === item.id || (item.id === 'more' && ['session-types', 'laser', 'reports', 'settings'].includes(currentView))
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
