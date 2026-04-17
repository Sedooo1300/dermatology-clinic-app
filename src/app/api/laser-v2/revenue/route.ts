import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const patientId = searchParams.get('patientId') || ''

    const where: Record<string, unknown> = {}
    if (patientId) where.patientId = patientId

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59')
    }

    const revenues = await db.laserRevenue.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    const totalAmount = revenues.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0)

    return NextResponse.json({ revenues, totalAmount })
  } catch (error) {
    console.error('GET /api/laser-v2/revenue error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, sessionId, packageId, type, amount, description, date } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'المبلغ مطلوب ويجب أن يكون أكبر من صفر' }, { status: 400 })
    }

    const revenue = await db.laserRevenue.create({
      data: {
        patientId: patientId || null,
        sessionId: sessionId || null,
        packageId: packageId || null,
        type: type || 'extra',
        amount: parseFloat(amount),
        description: description?.trim() || null,
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json(revenue, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/revenue error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الإيراد' }, { status: 500 })
  }
}
