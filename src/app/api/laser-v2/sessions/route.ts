import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId') || ''
    const areaId = searchParams.get('areaId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const status = searchParams.get('status') || ''

    const conditions: string[] = []
    const params: unknown[] = []

    if (patientId) {
      conditions.push(`ls."patientId" = $${params.length + 1}`)
      params.push(patientId)
    }
    if (areaId) {
      conditions.push(`ls."areaId" = $${params.length + 1}`)
      params.push(areaId)
    }
    if (status) {
      conditions.push(`ls."status" = $${params.length + 1}`)
      params.push(status)
    }
    if (dateFrom) {
      conditions.push(`ls."date" >= $${params.length + 1}`)
      params.push(new Date(dateFrom))
    }
    if (dateTo) {
      conditions.push(`ls."date" <= $${params.length + 1}`)
      params.push(new Date(dateTo + 'T23:59:59'))
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const sql = `
      SELECT ls.*,
        lp."id" AS "profile_id", lp."skinType" AS "profile_skinType", lp."hairColor" AS "profile_hairColor",
        p."id" AS "patient_id", p."name" AS "patient_name", p."phone" AS "patient_phone", p."gender" AS "patient_gender",
        m."id" AS "machine_id", m."name" AS "machine_name", m."type" AS "machine_type",
        a."id" AS "area_id", a."name" AS "area_name",
        pk."id" AS "package_id", pk."name" AS "package_name"
      FROM "LaserSession" ls
      LEFT JOIN "LaserProfile" lp ON ls."profileId" = lp."id"
      LEFT JOIN "Patient" p ON ls."patientId" = p."id"
      LEFT JOIN "LaserMachine" m ON ls."machineId" = m."id"
      LEFT JOIN "LaserArea" a ON ls."areaId" = a."id"
      LEFT JOIN "LaserPackage" pk ON ls."packageId" = pk."id"
      ${where}
      ORDER BY ls."date" DESC
    `

    const { rows } = await query(sql, params)

    const sessions = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      profileId: row.profileId,
      patientId: row.patientId,
      machineId: row.machineId,
      areaId: row.areaId,
      packageId: row.packageId,
      sessionNumber: row.sessionNumber,
      date: row.date,
      fluence: row.fluence,
      pulseWidth: row.pulseWidth,
      spotSize: row.spotSize,
      cooling: row.cooling,
      pulsesUsed: row.pulsesUsed,
      pulsesPerSecond: row.pulsesPerSecond,
      paymentMode: row.paymentMode,
      pulsePrice: row.pulsePrice,
      totalAmount: row.totalAmount,
      paid: row.paid,
      remaining: row.remaining,
      painLevel: row.painLevel,
      hairReduction: row.hairReduction,
      sideEffects: row.sideEffects,
      skinReaction: row.skinReaction,
      notes: row.notes,
      status: row.status,
      nextSessionDate: row.nextSessionDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      profile: row.profile_id ? { id: row.profile_id, skinType: row.profile_skinType, hairColor: row.profile_hairColor } : null,
      patient: row.patient_id ? { id: row.patient_id, name: row.patient_name, phone: row.patient_phone, gender: row.patient_gender } : null,
      machine: row.machine_id ? { id: row.machine_id, name: row.machine_name, type: row.machine_type } : null,
      area: row.area_id ? { id: row.area_id, name: row.area_name } : null,
      package: row.package_id ? { id: row.package_id, name: row.package_name } : null,
    }))

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('GET /api/laser-v2/sessions error:', error)
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      profileId, patientId, machineId, areaId, packageId,
      fluence, pulseWidth, spotSize, cooling,
      pulsesUsed, pulsesPerSecond,
      paymentMode, pulsePrice, totalAmount, paid,
      painLevel, hairReduction, sideEffects, skinReaction,
      notes, status, nextSessionDate, date,
    } = body

    if (!profileId || !patientId || !machineId || !areaId) {
      return NextResponse.json({ error: 'البروفايل والمريض والجهاز والمنطقة مطلوبون' }, { status: 400 })
    }

    if (!fluence) {
      return NextResponse.json({ error: 'الطاقة (fluence) مطلوبة' }, { status: 400 })
    }

    // Calculate total amount for pulse payment mode
    let calcTotal = totalAmount ? parseFloat(totalAmount) : 0
    let calcPaid = paid ? parseFloat(paid) : 0
    let calcRemaining = calcTotal - calcPaid

    if (paymentMode === 'pulse') {
      calcTotal = (pulsesUsed ? parseInt(pulsesUsed) : 0) * (pulsePrice ? parseFloat(pulsePrice) : 0)
      calcRemaining = calcTotal - calcPaid
    }

    // Get session number (count existing sessions for profileId + areaId)
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS cnt FROM "LaserSession" WHERE "profileId" = $1 AND "areaId" = $2`,
      [profileId, areaId]
    )
    const sessionNumber = (countRows[0]?.cnt || 0) + 1

    const id = uuid()
    const sessionDate = date ? new Date(date) : new Date()

    const insertSql = `
      INSERT INTO "LaserSession" (
        "id", "profileId", "patientId", "machineId", "areaId", "packageId",
        "sessionNumber", "date", "fluence", "pulseWidth", "spotSize", "cooling",
        "pulsesUsed", "pulsesPerSecond", "paymentMode", "pulsePrice",
        "totalAmount", "paid", "remaining", "painLevel", "hairReduction",
        "sideEffects", "skinReaction", "notes", "status", "nextSessionDate"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING *
    `
    const { rows: sessionRows } = await query(insertSql, [
      id, profileId, patientId, machineId, areaId, packageId || null,
      sessionNumber, sessionDate, parseFloat(fluence),
      pulseWidth ? parseFloat(pulseWidth) : 0,
      spotSize ? parseFloat(spotSize) : 0,
      cooling?.trim() || null,
      pulsesUsed ? parseInt(pulsesUsed) : 0,
      pulsesPerSecond ? parseInt(pulsesPerSecond) : null,
      paymentMode || 'pulse',
      pulsePrice ? parseFloat(pulsePrice) : 0,
      calcTotal, calcPaid, calcRemaining,
      painLevel ? parseInt(painLevel) : null,
      hairReduction !== undefined ? (hairReduction !== null ? parseFloat(hairReduction) : null) : null,
      sideEffects?.trim() || null,
      skinReaction?.trim() || null,
      notes?.trim() || null,
      status || 'completed',
      nextSessionDate ? new Date(nextSessionDate) : null,
    ])

    const session = sessionRows[0]

    // If package mode, update package usage
    if (paymentMode === 'package' && packageId) {
      const { rows: pkgRows } = await query(
        `SELECT * FROM "LaserPackage" WHERE "id" = $1`,
        [packageId]
      )
      const pkg = pkgRows[0]
      if (pkg) {
        const newUsedSessions = pkg.usedSessions + 1
        const newUsedPulses = pkg.usedPulses + (pulsesUsed ? parseInt(pulsesUsed) : 0)
        const newRemainingSessions = pkg.totalSessions - newUsedSessions
        const newRemainingPulses = pkg.totalPulses - newUsedPulses
        const newStatus = newRemainingSessions <= 0 ? 'completed' : pkg.status

        await query(
          `UPDATE "LaserPackage" SET
            "usedSessions" = $1, "usedPulses" = $2,
            "remainingSessions" = $3, "remainingPulses" = $4,
            "status" = $5, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $6`,
          [
            newUsedSessions, newUsedPulses,
            Math.max(0, newRemainingSessions), Math.max(0, newRemainingPulses),
            newStatus, packageId,
          ]
        )
      }
    }

    // Create revenue record if paid > 0
    if (calcPaid > 0) {
      // Get area and machine names for description
      const { rows: descRows } = await query(
        `SELECT a."name" AS area_name, m."name" AS machine_name
         FROM "LaserArea" a, "LaserMachine" m
         WHERE a."id" = $1 AND m."id" = $2`,
        [areaId, machineId]
      )
      const desc = descRows[0]
      const description = desc
        ? `جلسة ليزر - ${desc.area_name} (${desc.machine_name})`
        : 'جلسة ليزر'

      await query(
        `INSERT INTO "LaserRevenue" ("id", "patientId", "sessionId", "packageId", "type", "amount", "description", "date")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuid(), patientId, id,
          packageId || null,
          paymentMode === 'package' ? 'package' : 'session',
          calcPaid, description, sessionDate,
        ]
      )
    }

    // Fetch session with includes for response
    const respSql = `
      SELECT ls.*,
        lp."id" AS "profile_id", lp."skinType" AS "profile_skinType",
        p."id" AS "patient_id", p."name" AS "patient_name",
        m."id" AS "machine_id", m."name" AS "machine_name",
        a."id" AS "area_id", a."name" AS "area_name",
        pk."id" AS "package_id", pk."name" AS "package_name"
      FROM "LaserSession" ls
      LEFT JOIN "LaserProfile" lp ON ls."profileId" = lp."id"
      LEFT JOIN "Patient" p ON ls."patientId" = p."id"
      LEFT JOIN "LaserMachine" m ON ls."machineId" = m."id"
      LEFT JOIN "LaserArea" a ON ls."areaId" = a."id"
      LEFT JOIN "LaserPackage" pk ON ls."packageId" = pk."id"
      WHERE ls."id" = $1
    `
    const { rows: respRows } = await query(respSql, [id])
    const s = respRows[0]

    const result = {
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
      profile: s.profile_id ? { id: s.profile_id, skinType: s.profile_skinType } : null,
      patient: s.patient_id ? { id: s.patient_id, name: s.patient_name } : null,
      machine: s.machine_id ? { id: s.machine_id, name: s.machine_name } : null,
      area: s.area_id ? { id: s.area_id, name: s.area_name } : null,
      package: s.package_id ? { id: s.package_id, name: s.package_name } : null,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('POST /api/laser-v2/sessions error:', error)
    return NextResponse.json({ error: 'خطأ في إنشاء الجلسة' }, { status: 500 })
  }
}
