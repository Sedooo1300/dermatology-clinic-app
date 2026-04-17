import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { title, message, type, priority, isRead, snoozedUntil } = body

    const setClauses: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`)
      params.push(title.trim())
    }
    if (message !== undefined) {
      setClauses.push(`message = $${paramIndex++}`)
      params.push(message.trim())
    }
    if (type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`)
      params.push(type)
    }
    if (priority !== undefined) {
      setClauses.push(`priority = $${paramIndex++}`)
      params.push(priority)
    }
    if (isRead !== undefined) {
      setClauses.push(`"isRead" = $${paramIndex++}`)
      params.push(Boolean(isRead))
    }
    if (snoozedUntil !== undefined) {
      setClauses.push(`"snoozedUntil" = $${paramIndex++}`)
      params.push(snoozedUntil ? new Date(snoozedUntil) : null)
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للتعديل' }, { status: 400 })
    }

    setClauses.push(`"updatedAt" = $${paramIndex++}`)
    params.push(new Date())

    params.push(id)

    const result = await query<{
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
      `UPDATE "Alert"
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'التنبيه غير موجود' }, { status: 404 })
    }

    // Fetch with patient
    const alertWithPatient = await query<typeof result.rows[number] & { patient: { id: string; name: string } | null }>(
      `SELECT a.*, row_to_json(p.*) as "patient"
      FROM "Alert" a
      LEFT JOIN "Patient" p ON a."patientId" = p.id
      WHERE a.id = $1`,
      [id]
    )

    return NextResponse.json(alertWithPatient.rows[0])
  } catch (error) {
    console.error('PUT /api/alerts/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل التنبيه' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await query(`DELETE FROM "Alert" WHERE id = $1 RETURNING id`, [id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'التنبيه غير موجود' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/alerts/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف التنبيه' }, { status: 500 })
  }
}
