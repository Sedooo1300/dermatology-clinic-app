import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const visitId = searchParams.get('visitId') || ''

    let sql = `
      SELECT t.*,
        v."id" AS "visit_id", v."patientId" AS "visit_patientId", v."date" AS "visit_date",
        p."id" AS "patient_id", p."name" AS "patient_name"
      FROM "LaserTreatment" t
      LEFT JOIN "Visit" v ON t."visitId" = v."id"
      LEFT JOIN "Patient" p ON v."patientId" = p."id"
    `
    const params: unknown[] = []
    const conditions: string[] = []

    if (visitId) {
      conditions.push(`t."visitId" = $${params.length + 1}`)
      params.push(visitId)
    }
    if (patientId) {
      conditions.push(`v."patientId" = $${params.length + 1}`)
      params.push(patientId)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    sql += ` ORDER BY t."createdAt" DESC`

    const { rows } = await query(sql, params)

    const treatments = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      visitId: row.visitId,
      area: row.area,
      skinType: row.skinType,
      hairColor: row.hairColor,
      skinSensitivity: row.skinSensitivity,
      fluence: row.fluence,
      pulseWidth: row.pulseWidth,
      spotSize: row.spotSize,
      coolingType: row.coolingType,
      painLevel: row.painLevel,
      progress: row.progress,
      sessionsDone: row.sessionsDone,
      sessionsTotal: row.sessionsTotal,
      nextSessionDate: row.nextSessionDate,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      visit: row.visit_id ? {
        id: row.visit_id,
        patientId: row.visit_patientId,
        date: row.visit_date,
        patient: row.patient_id ? { id: row.patient_id, name: row.patient_name } : null,
      } : null,
    }))

    return NextResponse.json(treatments)
  } catch (error) {
    console.error('GET /api/laser error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      visitId, area, skinType, hairColor, skinSensitivity,
      fluence, pulseWidth, spotSize, coolingType, painLevel,
      progress, sessionsDone, sessionsTotal, nextSessionDate, notes,
    } = body

    if (!visitId || !area) {
      return NextResponse.json({ error: 'يرجى ملء البيانات المطلوبة' }, { status: 400 })
    }

    const id = uuid()
    const sql = `
      INSERT INTO "LaserTreatment" (
        "id", "visitId", "area", "skinType", "hairColor", "skinSensitivity",
        "fluence", "pulseWidth", "spotSize", "coolingType", "painLevel",
        "progress", "sessionsDone", "sessionsTotal", "nextSessionDate", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `
    const { rows } = await query(sql, [
      id, visitId, area,
      skinType || null, hairColor || null, skinSensitivity || null,
      fluence ? String(fluence) : null, pulseWidth ? String(pulseWidth) : null,
      spotSize ? String(spotSize) : null, coolingType || null,
      painLevel ? parseInt(painLevel) : null,
      progress || null, sessionsDone ? parseInt(sessionsDone) : 0,
      sessionsTotal ? parseInt(sessionsTotal) : 0,
      nextSessionDate ? new Date(nextSessionDate) : null,
      notes?.trim() || null,
    ])

    const treatment = rows[0]
    if (!treatment) {
      return NextResponse.json({ error: 'خطأ في إنشاء جلسة الليزر' }, { status: 500 })
    }

    // Fetch with visit + patient
    const detailSql = `
      SELECT t.*,
        v."id" AS "visit_id", v."patientId" AS "visit_patientId",
        p."id" AS "patient_id", p."name" AS "patient_name"
      FROM "LaserTreatment" t
      LEFT JOIN "Visit" v ON t."visitId" = v."id"
      LEFT JOIN "Patient" p ON v."patientId" = p."id"
      WHERE t."id" = $1
    `
    const { rows: detailRows } = await query(detailSql, [id])
    const detail = detailRows[0]

    const result = {
      id: detail.id,
      visitId: detail.visitId,
      area: detail.area,
      skinType: detail.skinType,
      hairColor: detail.hairColor,
      skinSensitivity: detail.skinSensitivity,
      fluence: detail.fluence,
      pulseWidth: detail.pulseWidth,
      spotSize: detail.spotSize,
      coolingType: detail.coolingType,
      painLevel: detail.painLevel,
      progress: detail.progress,
      sessionsDone: detail.sessionsDone,
      sessionsTotal: detail.sessionsTotal,
      nextSessionDate: detail.nextSessionDate,
      notes: detail.notes,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      visit: detail.visit_id ? {
        id: detail.visit_id,
        patientId: detail.visit_patientId,
        patient: detail.patient_id ? { id: detail.patient_id, name: detail.patient_name } : null,
      } : null,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة جلسة الليزر' }, { status: 500 })
  }
}
