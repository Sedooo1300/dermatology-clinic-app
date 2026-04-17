'use client'

import { useRouteError } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const isDbError = error?.message?.includes('database') ||
    error?.message?.includes('Prisma') ||
    error?.message?.includes('DATABASE_URL') ||
    error?.message?.includes('ENOTFOUND') ||
    error?.message?.includes('fetch failed')

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 text-center">
        <div className={`w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${isDbError ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          <span className="text-2xl">{isDbError ? '⚠️' : '❌'}</span>
        </div>

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {isDbError ? 'قاعدة البيانات غير متصلة' : 'حدث خطأ'}
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isDbError
            ? 'يُرجى ضبط قاعدة البيانات من إعدادات Vercel'
            : 'حاول مرة أخرى'}
        </p>

        <button
          onClick={reset}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
