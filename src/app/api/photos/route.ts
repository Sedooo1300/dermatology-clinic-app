import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const type = searchParams.get('type') || ''

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (patientId) {
      conditions.push(`"patientId" = $${paramIndex}`)
      params.push(patientId)
      paramIndex++
    }
    if (type) {
      conditions.push(`type = $${paramIndex}`)
      params.push(type)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM "PatientPhoto" ${whereClause} ORDER BY "createdAt" DESC`,
      params
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('GET /api/photos error:', error)
    return NextResponse.json({ error: 'خطأ في جلب الصور' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, visitId, type, photoUrl, notes } = body

    if (!patientId || !photoUrl) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 })
    }

    const id = uuid()
    const now = new Date()

    const result = await query(
      `INSERT INTO "PatientPhoto" ("id", "patientId", "visitId", "type", "photoUrl", "notes", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        patientId,
        visitId || null,
        type || 'before',
        photoUrl,
        notes?.trim() || null,
        now,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/photos error:', error)
    return NextResponse.json({ error: 'خطأ في رفع الصورة' }, { status: 500 })
  }
}
