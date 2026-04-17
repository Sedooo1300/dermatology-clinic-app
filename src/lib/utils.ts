import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ar } from 'date-fns/locale'

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('ar-EG')} ج.م`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy', { locale: ar })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'dd/MM/yyyy hh:mm a', { locale: ar })
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return 'اليوم'
  if (isYesterday(d)) return 'أمس'
  if (isTomorrow(d)) return 'غداً'
  return formatDistanceToNow(d, { addSuffix: true, locale: ar })
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    scheduled: 'مجدولة',
  }
  return map[status] || status
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    scheduled: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

export function getGenderLabel(gender: string): string {
  return gender === 'male' ? 'ذكر' : gender === 'female' ? 'أنثى' : gender
}

export function getAlertTypeLabel(type: string): string {
  const map: Record<string, string> = {
    reminder: 'تذكير',
    followup: 'متابعة',
    warning: 'تنبيه',
  }
  return map[type] || type
}

export function getAlertTypeColor(type: string): string {
  const map: Record<string, string> = {
    reminder: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    followup: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    warning: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return map[type] || 'bg-gray-100 text-gray-700'
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function compressBase64(base64: string, maxWidth = 800): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(base64)
    img.src = base64
  })
}
