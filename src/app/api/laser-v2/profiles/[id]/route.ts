import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Fetch profile with patient
    const profileSql = `
      SELECT lp.*,
        p."id" AS "patient_id", p."name" AS "patient_name",
        p."phone" AS "patient_phone", p."gender" AS "patient_gender", p."age" AS "patient_age"
      FROM "LaserProfile" lp
      LEFT JOIN "Patient" p ON lp."patientId" = p."id"
      WHERE lp."id" = $1
    `
    const { rows: profileRows } = await query(profileSql, [id])
    const profile = profileRows[0]

    if (!profile) {
      return NextResponse.json({ error: 'البروفايل غير موجود' }, { status: 404 })
    }

    // Fetch sessions with machine, area, package
    const sessionsSql = `
      SELECT ls.*,
        m."id" AS "machine_id", m."name" AS "machine_name", m."type" AS "machine_type",
        a."id" AS "area_id", a."name" AS "area_name",
        pk."id" AS "package_id", pk."name" AS "package_name"
      FROM "LaserSession" ls
      LEFT JOIN "LaserMachine" m ON ls."machineId" = m."id"
      LEFT JOIN "LaserArea" a ON ls."areaId" = a."id"
      LEFT JOIN "LaserPackage" pk ON ls."packageId" = pk."id"
      WHERE ls."profileId" = $1
      ORDER BY ls."date" DESC
    `
    const { rows: sessionRows } = await query(sessionsSql, [id])

    // Fetch packages with area and sessions subquery
    const packagesSql = `
      SELECT lpa.*,
        a."id" AS "area_id", a."name" AS "area_name"
      FROM "LaserPackage" lpa
      LEFT JOIN "LaserArea" a ON lpa."areaId" = a."id"
      WHERE lpa."profileId" = $1
      ORDER BY lpa."createdAt" DESC
    `
    const { rows: packageRows } = await query(packagesSql, [id])

    // For each package, fetch its sessions (id, date, status)
    const packages = []
    for (const pkg of packageRows) {
      const pkgSessionsSql = `SELECT "id", "date", "status" FROM "LaserSession" WHERE "packageId" = $1`
      const { rows: pkgSessions } = await query(pkgSessionsSql, [pkg.id])

      packages.push({
        id: pkg.id,
        profileId: pkg.profileId,
        patientId: pkg.patientId,
        areaId: pkg.areaId,
        name: pkg.name,
        totalSessions: pkg.totalSessions,
        totalPulses: pkg.totalPulses,
        usedSessions: pkg.usedSessions,
        usedPulses: pkg.usedPulses,
        remainingSessions: pkg.remainingSessions,
        remainingPulses: pkg.remainingPulses,
        totalPrice: pkg.totalPrice,
        paid: pkg.paid,
        remaining: pkg.remaining,
        status: pkg.status,
        purchaseDate: pkg.purchaseDate,
        expiryDate: pkg.expiryDate,
        notes: pkg.notes,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
        area: pkg.area_id ? { id: pkg.area_id, name: pkg.area_name } : null,
        sessions: pkgSessions,
      })
    }

    const sessions = sessionRows.map((s: Record<string, unknown>) => ({
      id: s.id,
      profileId: s.profileId,
      patientId: s.patientId,
      machineId: s.machineId,
      areaId: s.areaId,
      packageId: s.packageId,
      sessionNumber: s.sessionNumber,
      date: s.date,
      fluence: s.fluence,
      pulseWidth: s.pulseWidth,
      spotSize: s.spotSize,
      cooling: s.cooling,
      pulsesUsed: s.pulsesUsed,
      pulsesPerSecond: s.pulsesPerSecond,
      paymentMode: s.paymentMode,
      pulsePrice: s.pulsePrice,
      totalAmount: s.totalAmount,
      paid: s.paid,
      remaining: s.remaining,
      painLevel: s.painLevel,
      hairReduction: s.hairReduction,
      sideEffects: s.sideEffects,
      skinReaction: s.skinReaction,
      notes: s.notes,
      status: s.status,
      nextSessionDate: s.nextSessionDate,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      machine: s.machine_id ? { id: s.machine_id, name: s.machine_name, type: s.machine_type } : null,
      area: s.area_id ? { id: s.area_id, name: s.area_name } : null,
      package: s.package_id ? { id: s.package_id, name: s.package_name } : null,
    }))

    const result = {
      id: profile.id,
      patientId: profile.patientId,
      skinType: profile.skinType,
      hairColor: profile.hairColor,
      hairThickness: profile.hairThickness,
      skinSensitivity: profile.skinSensitivity,
      hormonalConditions: profile.hormonalConditions,
      contraindications: profile.contraindications,
      previousTreatments: profile.previousTreatments,
      notes: profile.notes,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      patient: profile.patient_id ? {
        id: profile.patient_id,
        name: profile.patient_name,
        phone: profile.patient_phone,
        gender: profile.patient_gender,
        age: profile.patient_age,
      } : null,
      sessions,
      packages,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/laser-v2/profiles/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { skinType, hairColor, hairThickness, skinSensitivity, hormonalConditions, contraindications, previousTreatments, notes } = body

    const setClauses: string[] = [`"updatedAt" = CURRENT_TIMESTAMP`]
    const params: unknown[] = []

    if (skinType !== undefined) {
      setClauses.push(`"skinType" = $${params.length + 1}`)
      params.push(skinType.toString())
    }
    if (hairColor !== undefined) {
      setClauses.push(`"hairColor" = $${params.length + 1}`)
      params.push(hairColor?.trim() || null)
    }
    if (hairThickness !== undefined) {
      setClauses.push(`"hairThickness" = $${params.length + 1}`)
      params.push(hairThickness?.trim() || null)
    }
    if (skinSensitivity !== undefined) {
      setClauses.push(`"skinSensitivity" = $${params.length + 1}`)
      params.push(skinSensitivity?.trim() || null)
    }
    if (hormonalConditions !== undefined) {
      setClauses.push(`"hormonalConditions" = $${params.length + 1}`)
      params.push(hormonalConditions?.trim() || null)
    }
    if (contraindications !== undefined) {
      setClauses.push(`"contraindications" = $${params.length + 1}`)
      params.push(contraindications?.trim() || null)
    }
    if (previousTreatments !== undefined) {
      setClauses.push(`"previousTreatments" = $${params.length + 1}`)
      params.push(previousTreatments?.trim() || null)
    }
    if (notes !== undefined) {
      setClauses.push(`"notes" = $${params.length + 1}`)
      params.push(notes?.trim() || null)
    }

    params.push(id)
    const sql = `UPDATE "LaserProfile" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING *`
    const { rows } = await query(sql, params)

    if (!rows[0]) {
      return NextResponse.json({ error: 'البروفايل غير موجود' }, { status: 404 })
    }

    // Fetch patient info
    const profile = rows[0] as Record<string, unknown>
    const { rows: patientRows } = await query(
      `SELECT "id", "name", "phone", "gender", "age" FROM "Patient" WHERE "id" = $1`,
      [profile.patientId]
    )

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

    return NextResponse.json(result)
  } catch (error) {
    console.error('PUT /api/laser-v2/profiles/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل البروفايل' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "LaserProfile" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/profiles/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف البروفايل' }, { status: 500 })
  }
}
