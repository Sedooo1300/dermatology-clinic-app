import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const result = await query(
      `SELECT st.*,
        (SELECT COUNT(*)::int FROM "Visit" v WHERE v."sessionTypeId" = st.id) as "_count_visits"
      FROM "SessionType" st
      ORDER BY st.name ASC`
    )

    const sessionTypes = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        visits: row._count_visits,
      },
    }))

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

    const id = uuid()
    const now = new Date()

    const result = await query(
      `INSERT INTO "SessionType" ("id", "name", "price", "description", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, $5, $6)
       RETURNING *`,
      [id, name.trim(), parseFloat(price) || 0, description?.trim() || null, now, now]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/session-types error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة نوع الجلسة' }, { status: 500 })
  }
}
