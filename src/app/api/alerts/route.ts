import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const alerts = await db.alert.findMany({
      orderBy: [
        { isRead: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        patient: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('GET /api/alerts error:', error)
    return NextResponse.json({ error: 'خطأ في جلب التنبيهات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, title, message, type, priority, date, isRead } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'العنوان والرسالة مطلوبان' }, { status: 400 })
    }

    const alert = await db.alert.create({
      data: {
        patientId: patientId || null,
        title: title.trim(),
        message: message.trim(),
        type: type || 'reminder',
        priority: priority || 'normal',
        date: date ? new Date(date) : new Date(),
        isRead: isRead || false,
      },
      include: {
        patient: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('POST /api/alerts error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة التنبيه' }, { status: 500 })
  }
}
