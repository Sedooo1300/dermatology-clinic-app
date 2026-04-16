'use client'

import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Scissors,
  Zap,
  CalendarDays,
  Wallet,
  FileBarChart,
  Settings,
  X,
  Stethoscope,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'patients', label: 'الحالات', icon: Users },
  { id: 'session-types', label: 'أنواع الجلسات', icon: Scissors },
  { id: 'laser', label: 'الليزر', icon: Zap },
  { id: 'visits', label: 'الزيارات', icon: CalendarDays },
  { id: 'finance', label: 'المالية', icon: Wallet },
  { id: 'reports', label: 'التقارير', icon: FileBarChart },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
] as const

export function Sidebar() {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen, setSelectedPatientId } = useAppStore()

  const handleNav = (id: string) => {
    setCurrentView(id as typeof navItems[number]['id'])
    setSelectedPatientId(null)
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-72 bg-card border-l border-border shadow-xl',
          'transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:shadow-none lg:z-auto',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-sm text-foreground">عيادة المغازى</h1>
                <p className="text-xs text-muted-foreground">إدارة الجلسات</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = currentView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              جلسات عيادة المغازى © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
