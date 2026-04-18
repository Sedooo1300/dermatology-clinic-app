import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const gender = searchParams.get('gender') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    if (search) {
      conditions.push(`("name" ILIKE '%' || $${paramIndex} || '%' OR "phone" ILIKE '%' || $${paramIndex} || '%' OR "address" ILIKE '%' || $${paramIndex} || '%')`)
      params.push(search)
      paramIndex++
    }
    if (gender) {
      conditions.push(`"gender" = $${paramIndex}`)
      params.push(gender)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [patientsResult, totalResult] = await Promise.all([
      query(
        `SELECT p.*,
          (SELECT COUNT(*)::int FROM "Visit" v WHERE v."patientId" = p.id) as "_count_visits",
          (SELECT COUNT(*)::int FROM "PatientPhoto" pp WHERE pp."patientId" = p.id) as "_count_photos",
          (SELECT COUNT(*)::int FROM "Alert" a WHERE a."patientId" = p.id) as "_count_alerts"
        FROM "Patient" p
        ${whereClause}
        ORDER BY p."createdAt" DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int as count FROM "Patient" p ${whereClause}`,
        params
      ),
    ])

    const patients = patientsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      age: row.age,
      gender: row.gender,
      address: row.address,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        visits: row._count_visits,
        photos: row._count_photos,
        alerts: row._count_alerts,
      },
    }))

    return NextResponse.json({ patients, total: totalResult.rows[0].count, page, limit })
  } catch (error) {
    console.error('GET /api/patients error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, phone, age, gender, address, notes } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })
    }

    const id = uuid()
    const now = new Date()

    const result = await query(
      `INSERT INTO "Patient" ("id", "name", "phone", "age", "gender", "address", "notes", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        name.trim(),
        phone?.trim() || null,
        age ? parseInt(age) : null,
        gender || 'male',
        address?.trim() || null,
        notes?.trim() || null,
        now,
        now,
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/patients error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الحالة' }, { status: 500 })
  }
}
