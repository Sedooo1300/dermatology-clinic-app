import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sql = `
      SELECT lp.*,
        p."id" AS "patient_id", p."name" AS "patient_name",
        p."phone" AS "patient_phone", p."gender" AS "patient_gender", p."age" AS "patient_age",
        COALESCE(sc.cnt, 0)::int AS "_count_sessions",
        COALESCE(pc.cnt, 0)::int AS "_count_packages"
      FROM "LaserProfile" lp
      LEFT JOIN "Patient" p ON lp."patientId" = p."id"
      LEFT JOIN (
        SELECT "profileId", COUNT(*)::int AS cnt
        FROM "LaserSession"
        GROUP BY "profileId"
      ) sc ON lp."id" = sc."profileId"
      LEFT JOIN (
        SELECT "profileId", COUNT(*)::int AS cnt
        FROM "LaserPackage"
        GROUP BY "profileId"
      ) pc ON lp."id" = pc."profileId"
      ORDER BY lp."createdAt" DESC
    `
    const { rows } = await query(sql)

    const profiles = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      patientId: row.patientId,
      skinType: row.skinType,
      hairColor: row.hairColor,
      hairThickness: row.hairThickness,
      skinSensitivity: row.skinSensitivity,
      hormonalConditions: row.hormonalConditions,
      contraindications: row.contraindications,
      previousTreatments: row.previousTreatments,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: row.patient_id ? {
        id: row.patient_id,
        name: row.patient_name,
        phone: row.patient_phone,
        gender: row.patient_gender,
        age: row.patient_age,
      } : null,
      _count: {
        sessions: row._count_sessions,
        packages: row._count_packages,
      },
    }))

    return NextResponse.json(profiles)
  } catch (error) {
    console.error('GET /api/laser-v2/profiles error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, skinType, hairColor, hairThickness, skinSensitivity, hormonalConditions, contraindications, previousTreatments, notes } = body

    if (!patientId || !skinType) {
      return NextResponse.json({ error: 'المريض ونوع البشرة مطلوبان' }, { status: 400 })
    }

    // Check if profile already exists
    const existing = await query(
      `SELECT "id" FROM "LaserProfile" WHERE "patientId" = $1 LIMIT 1`,
      [patientId]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'يوجد بروفايل ليزر لهذا المريض بالفعل' }, { status: 400 })
    }

    const id = uuid()
    const sql = `
      INSERT INTO "LaserProfile" (
        "id", "patientId", "skinType", "hairColor", "hairThickness", "skinSensitivity",
        "hormonalConditions", "contraindications", "previousTreatments", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `
    const { rows } = await query(sql, [
      id, patientId, skinType.toString(),
      hairColor?.trim() || null, hairThickness?.trim() || null,
      skinSensitivity?.trim() || null, hormonalConditions?.trim() || null,
      contraindications?.trim() || null, previousTreatments?.trim() || null,
      notes?.trim() || null,
    ])

    const profile = rows[0]

    // Fetch patient info
    const patientSql = `SELECT "id", "name", "phone", "gender", "age" FROM "Patient" WHERE "id" = $1`
    const { rows: patientRows } = await query(patientSql, [patientId])

    const result = {
      ...profile,
      patient: patientRows[0] ? {
        id: patientRows[0].id,
        name: patientRows[0].name,
        phone: patientRows[0].phone,
        gender: patientRows[0].gender,
        age: patientRows[0].age,
      } : null,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/profiles error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء البروفايل' }, { status: 500 })
  }
}
