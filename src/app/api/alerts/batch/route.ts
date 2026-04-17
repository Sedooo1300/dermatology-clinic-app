import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'markAllRead') {
      await query(
        `UPDATE "Alert" SET "isRead" = true, "updatedAt" = $1 WHERE "isRead" = false`,
        [new Date()]
      )
      return NextResponse.json({ success: true, message: 'تم تحديد الكل كمقروء' })
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 })
  } catch (error) {
    console.error('PUT /api/alerts/batch error:', error)
    return NextResponse.json({ error: 'خطأ' }, { status: 500 })
  }
}
