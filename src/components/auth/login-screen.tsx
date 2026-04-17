'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import { Loader2, Delete, ArrowRightCircle, ShieldCheck, UserPlus, RefreshCw } from 'lucide-react'

const PIN_LENGTH = 4

const roleLabels: Record<string, string> = {
  admin: 'مدير النظام',
  receptionist: 'موظف الاستقبال',
  doctor: 'طبيب',
  nurse: 'ممرض/ة',
}

export function LoginScreen() {
  const { login, triggerRefresh } = useAppStore()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; role: string } | null>(null)

  // Check if setup is needed and auto-seed if no users
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/auth/seed')
        const data = await res.json()
        if (!data.hasUsers) {
          // Auto-seed: create default users
          const seedRes = await fetch('/api/auth/seed', { method: 'POST' })
          const seedData = await seedRes.json()
          if (seedData.seeded) {
            setNeedsSetup(false)
            toast.success('تم إنشاء المستخدمين الافتراضيين', {
              description: 'مدير: 1234 | استقبال: 0000',
            })
          } else {
            setNeedsSetup(true)
          }
        }
      } catch {
        setNeedsSetup(true)
      } finally {
        setCheckingSetup(false)
      }
    }
    checkSetup()
  }, [])

  const handleSeed = useCallback(async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/auth/seed', { method: 'POST' })
      const data = await res.json()
      if (data.seeded) {
        setNeedsSetup(false)
        toast.success('تم إنشاء المستخدمين الافتراضيين', {
          description: 'مدير: 1234 | استقبال: 0000',
        })
      } else {
        // Users already exist, just show login
        setNeedsSetup(false)
      }
    } catch {
      toast.error('فشل في تهيئة المستخدمين - حاول مرة أخرى')
    } finally {
      setSeeding(false)
    }
  }, [])

  const handleNumber = useCallback((num: string) => {
    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + num)
      setError(false)
    }
  }, [pin.length])

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1))
    setError(false)
  }, [])

  const handleClear = useCallback(() => {
    setPin('')
    setError(false)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (pin.length < 3) {
      setError(true)
      toast.error('أدخل PIN صحيح')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(true)
        toast.error(data.error || 'PIN غير صحيح')
        setLoading(false)
        // Shake and reset
        setTimeout(() => {
          setPin('')
          setError(false)
        }, 600)
        return
      }

      setLoggedInUser({ name: data.user.name, role: data.user.role })
      toast.success(`مرحباً، ${data.user.name}`)

      // Wait a moment to show the welcome, then login
      setTimeout(() => {
        login(data.user)
        triggerRefresh()
      }, 1200)
    } catch {
      setError(true)
      toast.error('خطأ في الاتصال بالخادم')
      setLoading(false)
      setTimeout(() => {
        setPin('')
        setError(false)
      }, 600)
    }
  }, [pin, login, triggerRefresh])

  // Auto-submit when PIN is full
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !loading) {
      handleSubmit()
    }
  }, [pin.length, loading, handleSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      handleNumber(e.key)
    } else if (e.key === 'Backspace') {
      e.preventDefault()
      handleDelete()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleNumber, handleDelete, handleSubmit])

  // Checking setup state
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent mx-auto mb-4"
          />
          <p className="text-muted-foreground text-sm">جاري التحقق...</p>
        </div>
      </div>
    )
  }

  // First-time setup
  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 mx-auto mb-5 flex items-center justify-center shadow-lg shadow-teal-500/25"
            >
              <span className="text-3xl">🏥</span>
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">عيادة المغازى</h1>
            <p className="text-muted-foreground text-sm">إعداد لأول مرة</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border shadow-xl p-6 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 mx-auto mb-4 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="font-bold text-lg mb-2">مرحباً بك</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              لم يتم العثور على مستخدمين في النظام.
              <br />
              هل تريد إنشاء المستخدمين الافتراضيين؟
            </p>

            <div className="space-y-3 text-sm bg-muted/50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">مدير النظام</span>
                <code className="bg-background px-2 py-1 rounded-md font-mono text-primary font-bold">1234</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">موظف الاستقبال</span>
                <code className="bg-background px-2 py-1 rounded-md font-mono text-primary font-bold">0000</code>
              </div>
            </div>

            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-l from-teal-500 to-emerald-600 text-white font-medium text-sm hover:from-teal-600 hover:to-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {seeding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  إنشاء المستخدمين
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/30 p-6"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      autoFocus
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Clinic Branding */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 mx-auto mb-5 flex items-center justify-center shadow-lg shadow-teal-500/25"
          >
            <span className="text-3xl">🏥</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-1">عيادة المغازى</h1>
          <p className="text-muted-foreground text-sm">عيادة الجلدية والتجميل</p>
        </div>

        {/* Logged In Success */}
        <AnimatePresence mode="wait">
          {loggedInUser ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="bg-card rounded-2xl border border-border shadow-xl p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 mx-auto mb-4 flex items-center justify-center"
              >
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <h2 className="font-bold text-lg mb-1">مرحباً، {loggedInUser.name}</h2>
              <p className="text-muted-foreground text-sm">{roleLabels[loggedInUser.role] || loggedInUser.role}</p>
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-6 flex items-center justify-center gap-2 text-muted-foreground text-xs"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التحويل...
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-card rounded-2xl border border-border shadow-xl p-6"
            >
              <div className="text-center mb-6">
                <p className="text-muted-foreground text-sm">أدخل رقم PIN لتسجيل الدخول</p>
              </div>

              {/* PIN Display */}
              <div className="flex justify-center gap-4 mb-8">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={error ? {
                      x: [0, -8, 8, -8, 8, 0],
                    } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${
                        i < pin.length
                          ? 'border-primary bg-primary/5 scale-105'
                          : error
                            ? 'border-red-400 bg-red-50 dark:bg-red-950/20'
                            : 'border-border bg-muted/30'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        {i < pin.length && (
                          <motion.div
                            key={`dot-${pin[i]}-${i}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className={`w-4 h-4 rounded-full ${
                              error ? 'bg-red-400' : 'bg-primary'
                            }`}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <motion.button
                    key={num}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleNumber(num)}
                    disabled={loading}
                    className="h-16 rounded-2xl bg-muted/50 hover:bg-muted text-foreground font-bold text-xl transition-colors active:bg-muted disabled:opacity-50 flex items-center justify-center"
                  >
                    {num}
                  </motion.button>
                ))}
              </div>

              {/* Bottom Row: Clear, 0, Delete */}
              <div className="grid grid-cols-3 gap-3">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleClear}
                  disabled={loading || pin.length === 0}
                  className="h-16 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground font-medium text-sm transition-colors disabled:opacity-30 flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleNumber('0')}
                  disabled={loading}
                  className="h-16 rounded-2xl bg-muted/50 hover:bg-muted text-foreground font-bold text-xl transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  0
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={handleDelete}
                  disabled={loading || pin.length === 0}
                  className="h-16 rounded-2xl bg-muted/50 hover:bg-muted text-muted-foreground transition-colors disabled:opacity-30 flex items-center justify-center"
                >
                  <Delete className="w-6 h-6" />
                </motion.button>
              </div>

              {/* Submit Button */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                onClick={handleSubmit}
                disabled={loading || pin.length < 3}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-l from-teal-500 to-emerald-600 text-white font-medium text-sm hover:from-teal-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ArrowRightCircle className="w-5 h-5" />
                    دخول
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          نظام إدارة عيادة الجلدية والتجميل v2.0
        </motion.p>
      </motion.div>
    </div>
  )
}
