import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppView =
  | 'dashboard'
  | 'patients'
  | 'patient-detail'
  | 'session-types'
  | 'laser'
  | 'visits'
  | 'finance'
  | 'alerts'
  | 'reports'
  | 'settings'
  | 'calendar'
  | 'prescriptions'
  | 'queue'
  | 'communications'

export type ThemeColor = 'teal' | 'blue' | 'purple' | 'orange' | 'red' | 'green' | 'pink' | 'cyan' | 'lime'

interface AppState {
  // Navigation
  currentView: AppView
  selectedPatientId: string | null
  previousView: AppView | null
  setCurrentView: (view: AppView) => void
  setSelectedPatientId: (id: string | null) => void
  navigateBack: () => void

  // Theme
  themeColor: ThemeColor
  setThemeColor: (color: ThemeColor) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Socket connection status
  isConnected: boolean
  setIsConnected: (connected: boolean) => void

  // Refresh triggers
  refreshKey: number
  triggerRefresh: () => void

  // Patient detail sub-tab
  patientDetailTab: string
  setPatientDetailTab: (tab: string) => void

  // Auth
  currentUser: { id: string; name: string; role: string; token: string } | null
  isAuthenticated: boolean
  login: (user: { id: string; name: string; role: string; token: string }) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Navigation
      currentView: 'dashboard',
      selectedPatientId: null,
      previousView: null,
      setCurrentView: (view) => {
        const { currentView } = get()
        set({ currentView: view, previousView: currentView })
      },
      setSelectedPatientId: (id) => set({ selectedPatientId: id }),
      navigateBack: () => {
        const { previousView } = get()
        if (previousView) {
          set({ currentView: previousView, previousView: null })
        }
      },

      // Theme
      themeColor: 'teal',
      setThemeColor: (color) => {
        const themeMap: Record<ThemeColor, string> = {
          teal: '',
          blue: 'blue',
          purple: 'purple',
          orange: 'orange',
          red: 'red',
          green: 'green',
          pink: 'pink',
          cyan: 'cyan',
          lime: 'lime',
        }
        const themeVal = themeMap[color]
        if (themeVal) {
          document.documentElement.setAttribute('data-theme', themeVal)
        } else {
          document.documentElement.removeAttribute('data-theme')
        }
        set({ themeColor: color })
      },

      // Sidebar
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // Socket
      isConnected: false,
      setIsConnected: (connected) => set({ isConnected: connected }),

      // Refresh
      refreshKey: 0,
      triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),

      // Patient detail tab
      patientDetailTab: 'visits',
      setPatientDetailTab: (tab) => set({ patientDetailTab: tab }),

      // Auth
      currentUser: null,
      isAuthenticated: false,
      login: (user) => set({ currentUser: user, isAuthenticated: true }),
      logout: () => set({ currentUser: null, isAuthenticated: false }),
    }),
    {
      name: 'clinic-app-store',
      partialize: (state) => ({
        themeColor: state.themeColor,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
