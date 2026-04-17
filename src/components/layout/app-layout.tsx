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
  ChevronUp,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const bottomNavItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'patients', label: 'الحالات', icon: Users },
  { id: 'visits', label: 'الزيارات', icon: CalendarDays },
  { id: 'more', label: 'المزيد', icon: ChevronUp },
] as const

const moreMenuItems = [
  { id: 'session-types', label: 'أنواع الجلسات', icon: Scissors, color: 'text-pink-500 bg-pink-50 dark:bg-pink-950/30' },
  { id: 'laser', label: 'ليزر إزالة الشعر', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  { id: 'finance', label: 'المالية', icon: Wallet, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  { id: 'reports', label: 'التقارير', icon: FileBarChart, color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30' },
  { id: 'settings', label: 'الإعدادات', icon: Settings, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/30' },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentView, setCurrentView, setSelectedPatientId } = useAppStore()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleNav = (id: string) => {
    setCurrentView(id as 'dashboard' | 'patients' | 'visits' | 'finance' | 'session-types' | 'laser' | 'reports' | 'settings')
    setSelectedPatientId(null)
    setShowMoreMenu(false)
  }

  const handleMoreToggle = () => {
    setShowMoreMenu((prev) => !prev)
  }

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [showMoreMenu])

  const isMoreSection = ['session-types', 'laser', 'finance', 'reports', 'settings'].includes(currentView)

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

      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/30 z-50 lg:hidden"
            onClick={() => setShowMoreMenu(false)}
          />
        )}
      </AnimatePresence>

      {/* More Menu Panel */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            ref={menuRef}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-16 left-2 right-2 z-50 bg-card rounded-2xl shadow-2xl border border-border p-3 lg:hidden"
          >
            <div className="grid grid-cols-2 gap-2">
              {moreMenuItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNav(item.id)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl transition-all hover:shadow-md active:scale-[0.97]',
                    currentView === item.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/80'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-start">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {bottomNavItems.map((item) => {
            if (item.id === 'more') {
              const isActive = isMoreSection
              return (
                <button
                  key={item.id}
                  onClick={handleMoreToggle}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center transition-transform',
                    showMoreMenu && 'rotate-180'
                  )}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )
            }
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
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
