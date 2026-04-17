import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = `
      SELECT a.*,
        COALESCE(sc.cnt, 0)::int AS "_count_sessions",
        COALESCE(pc.cnt, 0)::int AS "_count_packages"
      FROM "LaserArea" a
      LEFT JOIN (
        SELECT "areaId", COUNT(*)::int AS cnt
        FROM "LaserSession"
        GROUP BY "areaId"
      ) sc ON a."id" = sc."areaId"
      LEFT JOIN (
        SELECT "areaId", COUNT(*)::int AS cnt
        FROM "LaserPackage"
        GROUP BY "areaId"
      ) pc ON a."id" = pc."areaId"
      ORDER BY a."createdAt" DESC
    `
    const { rows } = await query(sql)

    const areas = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      malePulses: row.malePulses,
      femalePulses: row.femalePulses,
      pulsePrice: row.pulsePrice,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      _count: {
        sessions: row._count_sessions,
        packages: row._count_packages,
      },
    }))

    return NextResponse.json(areas)
  } catch (error) {
    console.error('GET /api/laser-v2/areas error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, malePulses, femalePulses, pulsePrice, isActive } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'اسم المنطقة مطلوب' }, { status: 400 })
    }

    const id = uuid()
    const sql = `
      INSERT INTO "LaserArea" ("id", "name", "malePulses", "femalePulses", "pulsePrice", "isActive")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `
    const { rows } = await query(sql, [
      id,
      name.trim(),
      malePulses ? parseInt(malePulses) : 200,
      femalePulses ? parseInt(femalePulses) : 150,
      pulsePrice !== undefined ? parseFloat(pulsePrice) : 0,
      isActive !== false ? true : false,
    ])

    return NextResponse.json(rows[0], { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/areas error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة المنطقة' }, { status: 500 })
  }
}
