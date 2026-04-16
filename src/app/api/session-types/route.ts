import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sessionTypes = await db.sessionType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { visits: true } },
      },
    })
    return NextResponse.json(sessionTypes)
  } catch (error) {
    console.error('GET /api/session-types error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, price, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'اسم الجلسة مطلوب' }, { status: 400 })
    }

    const sessionType = await db.sessionType.create({
      data: {
        name: name.trim(),
        price: parseFloat(price) || 0,
        description: description?.trim() || null,
      },
    })

    return NextResponse.json(sessionType, { status: 201 })
  } catch (error) {
    console.error('POST /api/session-types error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة نوع الجلسة' }, { status: 500 })
  }
}
