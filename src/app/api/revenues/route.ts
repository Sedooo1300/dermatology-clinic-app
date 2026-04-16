import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo)
    }

    const [revenues, total] = await Promise.all([
      db.revenue.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.revenue.count({ where }),
    ])

    const sumResult = await db.revenue.aggregate({
      where,
      _sum: { amount: true },
    })

    return NextResponse.json({
      revenues,
      total,
      page,
      limit,
      totalAmount: sumResult._sum.amount || 0,
    })
  } catch (error) {
    console.error('GET /api/revenues error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, amount, description, date, visitId } = body

    if (!amount) {
      return NextResponse.json({ error: 'المبلغ مطلوب' }, { status: 400 })
    }

    const revenue = await db.revenue.create({
      data: {
        category: category?.trim() || 'sessions',
        amount: parseFloat(amount),
        description: description?.trim() || null,
        date: date ? new Date(date) : new Date(),
        visitId: visitId || null,
      },
    })

    return NextResponse.json(revenue, { status: 201 })
  } catch (error) {
    console.error('POST /api/revenues error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الإيراد' }, { status: 500 })
  }
}
