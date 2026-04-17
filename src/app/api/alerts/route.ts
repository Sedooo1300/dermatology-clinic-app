import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const alerts = await query<{
      id: string
      patientId: string | null
      title: string
      message: string
      type: string
      priority: string
      date: string
      isRead: boolean
      snoozedUntil: string | null
      actionUrl: string | null
      createdAt: string
      updatedAt: string
      patient: { id: string; name: string } | null
    }>(
      `SELECT a.*, row_to_json(p.*) as "patient"
      FROM "Alert" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      ORDER BY a."isRead" ASC, a."createdAt" DESC`
    )

    return NextResponse.json(alerts.rows)
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

    const id = uuid()
    const now = new Date()

    const alert = await query<{
      id: string
      patientId: string | null
      title: string
      message: string
      type: string
      priority: string
      date: string
      isRead: boolean
      snoozedUntil: string | null
      actionUrl: string | null
      createdAt: string
      updatedAt: string
      patient: { id: string; name: string } | null
    }>(
      `INSERT INTO "Alert" (id, "patientId", title, message, type, priority, date, "isRead", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *`,
      [
        id,
        patientId || null,
        title.trim(),
        message.trim(),
        type || 'reminder',
        priority || 'normal',
        date ? new Date(date) : now,
        isRead ? true : false,
        now,
      ]
    )

    // Fetch with patient
    const alertWithPatient = await query<
      typeof alert.rows[number] & { patient: { id: string; name: string } | null }
    >(
      `SELECT a.*, row_to_json(p.*) as "patient"
      FROM "Alert" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      WHERE a.id = $1`,
      [id]
    )

    return NextResponse.json(alertWithPatient.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/alerts error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة التنبيه' }, { status: 500 })
  }
}
