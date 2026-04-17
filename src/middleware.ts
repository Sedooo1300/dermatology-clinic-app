import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only check for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: 'قاعدة البيانات غير متصلة',
          message: 'يرجى ضبط DATABASE_URL و DIRECT_URL في Vercel Dashboard → Settings → Environment Variables',
          setup: [
            '1. افتح Vercel Dashboard',
            '2. اذهب إلى Settings → Environment Variables',
            '3. أضف DATABASE_URL و DIRECT_URL',
            '4. أو اضغط Storage → Create Database → Neon (مجاناً)',
          ],
        },
        { status: 503 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
