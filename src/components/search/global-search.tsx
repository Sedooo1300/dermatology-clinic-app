'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Search, X, User, CalendarDays, Pill, Zap, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  result_type: 'patient' | 'visit' | 'prescription' | 'laser'
  title: string
  subtitle: string | null
  patientName?: string
  patientPhone?: string
  patient_id?: string
  patientId?: string
  date?: string
  createdAt?: string
}

const typeConfig = {
  patient: { icon: User, label: 'مريض', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', view: 'patient-detail' as const },
  visit: { icon: CalendarDays, label: 'زيارة', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', view: 'visits' as const },
  prescription: { icon: Pill, label: 'وصفة', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', view: 'prescriptions' as const },
  laser: { icon: Zap, label: 'ليزر', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400', view: 'laser' as const },
}

export function GlobalSearch() {
  const { setCurrentView, setSelectedPatientId } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=10`)
      const data = await res.json()
      setResults(data.results || [])
      setIsOpen(true)
      setSelectedIndex(-1)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  function handleSelect(result: SearchResult) {
    const config = typeConfig[result.result_type]
    if (result.result_type === 'patient') {
      setSelectedPatientId(result.id)
      setCurrentView('patient-detail')
    } else {
      setCurrentView(config.view)
    }
    setIsOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="بحث سريع... ⌘K"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'pr-9 pl-9 h-9 text-sm transition-all',
            isOpen && 'ring-2 ring-primary/30'
          )}
        />
        {isLoading && (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {query && !isLoading && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false) }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[320px]"
          >
            <div className="p-2 border-b border-border">
              <p className="text-xs text-muted-foreground px-2">
                {results.length} نتيجة لـ &quot;{query}&quot;
              </p>
            </div>
            <div className="max-h-[340px] overflow-y-auto custom-scrollbar p-1">
              {results.map((result, index) => {
                const config = typeConfig[result.result_type]
                const Icon = config.icon
                return (
                  <motion.button
                    key={`${result.result_type}-${result.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors',
                      index === selectedIndex ? 'bg-accent' : 'hover:bg-accent/50'
                    )}
                  >
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md', config.color)}>
                      {config.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
            <div className="p-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                اضغط Enter للتحديد · Escape للإغلاق
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
