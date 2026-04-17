import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const status = searchParams.get('status') || ''

    const conditions: string[] = []
    const params: unknown[] = []

    if (patientId) {
      conditions.push(`lpa."patientId" = $${params.length + 1}`)
      params.push(patientId)
    }
    if (status) {
      conditions.push(`lpa."status" = $${params.length + 1}`)
      params.push(status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT lpa.*,
        lp."id" AS "profile_id", lp."skinType" AS "profile_skinType",
        p."id" AS "patient_id", p."name" AS "patient_name", p."phone" AS "patient_phone", p."gender" AS "patient_gender",
        a."id" AS "area_id", a."name" AS "area_name"
      FROM "LaserPackage" lpa
      LEFT JOIN "LaserProfile" lp ON lpa."profileId" = lp."id"
      LEFT JOIN "Patient" p ON lpa."patientId" = p."id"
      LEFT JOIN "LaserArea" a ON lpa."areaId" = a."id"
      ${where}
      ORDER BY lpa."createdAt" DESC
    `

    const { rows } = await query(sql, params)

    // For each package, fetch sessions (id, date, status)
    const packages = []
    for (const row of rows) {
      const sessionsSql = `SELECT "id", "date", "status" FROM "LaserSession" WHERE "packageId" = $1 ORDER BY "date" DESC`
      const { rows: sessionRows } = await query(sessionsSql, [row.id])

      packages.push({
        id: row.id,
        profileId: row.profileId,
        patientId: row.patientId,
        areaId: row.areaId,
        name: row.name,
        totalSessions: row.totalSessions,
        totalPulses: row.totalPulses,
        usedSessions: row.usedSessions,
        usedPulses: row.usedPulses,
        remainingSessions: row.remainingSessions,
        remainingPulses: row.remainingPulses,
        totalPrice: row.totalPrice,
        paid: row.paid,
        remaining: row.remaining,
        status: row.status,
        purchaseDate: row.purchaseDate,
        expiryDate: row.expiryDate,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        profile: row.profile_id ? { id: row.profile_id, skinType: row.profile_skinType } : null,
        patient: row.patient_id ? { id: row.patient_id, name: row.patient_name, phone: row.patient_phone, gender: row.patient_gender } : null,
        area: row.area_id ? { id: row.area_id, name: row.area_name } : null,
        sessions: sessionRows,
      })
    }

    return NextResponse.json(packages)
  } catch (error) {
    console.error('GET /api/laser-v2/packages error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileId, patientId, areaId, name, totalSessions, totalPulses, totalPrice, paid, expiryDate, notes } = body

    if (!profileId || !patientId || !areaId || !name) {
      return NextResponse.json({ error: 'البروفايل والمريض والمنطقة والاسم مطلوبون' }, { status: 400 })
    }

    const calcTotalSessions = totalSessions ? parseInt(totalSessions) : 0
    const calcTotalPulses = totalPulses ? parseInt(totalPulses) : 0
    const calcTotalPrice = totalPrice ? parseFloat(totalPrice) : 0
    const calcPaid = paid ? parseFloat(paid) : 0

    const id = uuid()

    const sql = `
      INSERT INTO "LaserPackage" (
        "id", "profileId", "patientId", "areaId", "name",
        "totalSessions", "totalPulses", "usedSessions", "usedPulses",
        "remainingSessions", "remainingPulses", "totalPrice", "paid", "remaining",
        "status", "expiryDate", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `
    const { rows } = await query(sql, [
      id, profileId, patientId, areaId, name.trim(),
      calcTotalSessions, calcTotalPulses, 0, 0,
      calcTotalSessions, calcTotalPulses, calcTotalPrice, calcPaid,
      calcTotalPrice - calcPaid,
      'active',
      expiryDate ? new Date(expiryDate) : null,
      notes?.trim() || null,
    ])

    const pkg = rows[0]

    // Create revenue record if paid > 0
    if (calcPaid > 0) {
      await query(
        `INSERT INTO "LaserRevenue" ("id", "patientId", "packageId", "type", "amount", "description", "date")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuid(), patientId, id, 'package', calcPaid, `باقة ليزر: ${name}`, pkg.purchaseDate]
      )
    }

    // Fetch with includes for response
    const respSql = `
      SELECT lpa.*,
        lp."id" AS "profile_id", lp."skinType" AS "profile_skinType",
        p."id" AS "patient_id", p."name" AS "patient_name",
        a."id" AS "area_id", a."name" AS "area_name"
      FROM "LaserPackage" lpa
      LEFT JOIN "LaserProfile" lp ON lpa."profileId" = lp."id"
      LEFT JOIN "Patient" p ON lpa."patientId" = p."id"
      LEFT JOIN "LaserArea" a ON lpa."areaId" = a."id"
      WHERE lpa."id" = $1
    `
    const { rows: respRows } = await query(respSql, [id])
    const r = respRows[0]

    const result = {
      id: r.id,
      profileId: r.profileId,
      patientId: r.patientId,
      areaId: r.areaId,
      name: r.name,
      totalSessions: r.totalSessions,
      totalPulses: r.totalPulses,
      usedSessions: r.usedSessions,
      usedPulses: r.usedPulses,
      remainingSessions: r.remainingSessions,
      remainingPulses: r.remainingPulses,
      totalPrice: r.totalPrice,
      paid: r.paid,
      remaining: r.remaining,
      status: r.status,
      purchaseDate: r.purchaseDate,
      expiryDate: r.expiryDate,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      profile: r.profile_id ? { id: r.profile_id, skinType: r.profile_skinType } : null,
      patient: r.patient_id ? { id: r.patient_id, name: r.patient_name } : null,
      area: r.area_id ? { id: r.area_id, name: r.area_name } : null,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/packages error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء الباقة' }, { status: 500 })
  }
}
