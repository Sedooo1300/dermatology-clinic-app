import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = `
      SELECT m.*,
        COALESCE(s.cnt, 0)::int AS "_count_sessions"
      FROM "LaserMachine" m
      LEFT JOIN (
        SELECT "machineId", COUNT(*)::int AS cnt
        FROM "LaserSession"
        GROUP BY "machineId"
      ) s ON m."id" = s."machineId"
      ORDER BY m."createdAt" DESC
    `
    const { rows } = await query(sql)

    const machines = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      wavelength: row.wavelength,
      maxFluence: row.maxFluence,
      spotSizes: row.spotSizes,
      isActive: row.isActive,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: { sessions: row._count_sessions },
    }))

    return NextResponse.json(machines)
  } catch (error) {
    console.error('GET /api/laser-v2/machines error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, type, wavelength, maxFluence, spotSizes, isActive, notes } = body

    if (!name?.trim() || !type?.trim()) {
      return NextResponse.json({ error: 'الاسم والنوع مطلوبان' }, { status: 400 })
    }

    const id = uuid()
    const sql = `
      INSERT INTO "LaserMachine" ("id", "name", "type", "wavelength", "maxFluence", "spotSizes", "isActive", "notes")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `
    const { rows } = await query(sql, [
      id,
      name.trim(),
      type.trim(),
      wavelength?.trim() || null,
      maxFluence ? parseFloat(maxFluence) : null,
      spotSizes?.trim() || null,
      isActive !== false ? true : false,
      notes?.trim() || null,
    ])

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/machines error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الجهاز' }, { status: 500 })
  }
}
