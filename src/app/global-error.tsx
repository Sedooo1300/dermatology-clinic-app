'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  const isDbError = error?.message?.includes('database') ||
    error?.message?.includes('Prisma') ||
    error?.message?.includes('DATABASE_URL') ||
    error?.message?.includes('connect') ||
    error?.message?.includes('ENOTFOUND')

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${isDbError ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
            {isDbError ? (
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            ) : (
              <RefreshCw className="w-8 h-8 text-red-600 dark:text-red-400" />
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {isDbError ? 'قاعدة البيانات غير متصلة' : 'حدث خطأ غير متوقع'}
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
            {isDbError ? (
              <>
                التطبيق يحتاج قاعدة بيانات للعمل.
                <br />
                اذهب إلى <strong>Vercel Dashboard → Settings → Environment Variables</strong>
                <br />
                وأضف <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">DATABASE_URL</code> و <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">DIRECT_URL</code>
              </>
            ) : (
              'حدث خطأ أثناء تحميل التطبيق. حاول مرة أخرى.'
            )}
          </p>

          {isDbError && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-right">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">خطوات الإعداد:</p>
              <ol className="text-xs text-amber-600 dark:text-amber-500 space-y-1 list-decimal list-inside">
                <li>افتح Vercel Dashboard</li>
                <li>اضغط على المشروع → Settings → Environment Variables</li>
                <li>أضف DATABASE_URL و DIRECT_URL من Neon</li>
                <li>أعد نشر التطبيق (Redeploy)</li>
              </ol>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                أو اضغط Storage → Create Database → Neon (مجاناً)
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button onClick={reset} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </Button>
            {showDetails && (
              <Button variant="outline" onClick={() => setShowDetails(false)} className="text-xs">
                إخفاء التفاصيل
              </Button>
            )}
            {!showDetails && (
              <Button variant="outline" onClick={() => setShowDetails(true)} className="text-xs">
                تفاصيل الخطأ
              </Button>
            )}
          </div>

          {showDetails && (
            <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-left max-h-40 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                {error?.message || 'Unknown error'}
              </p>
            </div>
          )}
        </div>
      </body>
    </html>
  )
}
