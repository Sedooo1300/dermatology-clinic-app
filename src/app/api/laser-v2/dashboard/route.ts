import { query } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // Sessions today count
    const { rows: stRows } = await query(
      `SELECT COUNT(*)::int AS cnt FROM "LaserSession" WHERE "date" >= $1`,
      [today]
    )
    const sessionsToday = stRows[0]?.cnt || 0

    // Sessions this month count
    const { rows: smRows } = await query(
      `SELECT COUNT(*)::int AS cnt FROM "LaserSession" WHERE "date" >= $1`,
      [monthStart]
    )
    const sessionsMonth = smRows[0]?.cnt || 0

    // Revenue this month
    const { rows: rmRows } = await query(
      `SELECT COALESCE(SUM("amount"), 0) AS total FROM "LaserRevenue" WHERE "date" >= $1`,
      [monthStart]
    )
    const revenueMonth = Number(rmRows[0]?.total) || 0

    // Revenue today
    const { rows: rtRows } = await query(
      `SELECT COALESCE(SUM("amount"), 0) AS total FROM "LaserRevenue" WHERE "date" >= $1`,
      [today]
    )
    const revenueToday = Number(rtRows[0]?.total) || 0

    // Active profiles count
    const { rows: apRows } = await query(`SELECT COUNT(*)::int AS cnt FROM "LaserProfile"`)
    const activeProfiles = apRows[0]?.cnt || 0

    // Active packages count
    const { rows: acpRows } = await query(
      `SELECT COUNT(*)::int AS cnt FROM "LaserPackage" WHERE "status" = 'active'`
    )
    const activePackages = acpRows[0]?.cnt || 0

    // Total active machines count
    const { rows: tmRows } = await query(
      `SELECT COUNT(*)::int AS cnt FROM "LaserMachine" WHERE "isActive" = true`
    )
    const totalMachines = tmRows[0]?.cnt || 0

    // Most popular areas (GROUP BY areaId ORDER BY count DESC LIMIT 5)
    const { rows: popularRaw } = await query(`
      SELECT ls."areaId", COUNT(*)::int AS cnt
      FROM "LaserSession" ls
      GROUP BY ls."areaId"
      ORDER BY cnt DESC
      LIMIT 5
    `)

    const popularAreasFormatted = []
    for (const p of popularRaw) {
      const { rows: areaRows } = await query(
        `SELECT "name" FROM "LaserArea" WHERE "id" = $1`,
        [p.areaId]
      )
      popularAreasFormatted.push({
        areaId: p.areaId,
        name: areaRows[0]?.name || 'غير معروف',
        count: p.cnt,
      })
    }

    // Today sessions list with patient/area/machine JOINs
    const { rows: todaySessionsRaw } = await query(`
      SELECT ls.*,
        p."id" AS "patient_id", p."name" AS "patient_name",
        a."id" AS "area_id", a."name" AS "area_name",
        m."id" AS "machine_id", m."name" AS "machine_name"
      FROM "LaserSession" ls
      LEFT JOIN "Patient" p ON ls."patientId" = p."id"
      LEFT JOIN "LaserArea" a ON ls."areaId" = a."id"
      LEFT JOIN "LaserMachine" m ON ls."machineId" = m."id"
      WHERE ls."date" >= $1
      ORDER BY ls."date" DESC
    `, [today])

    const todaySessions = todaySessionsRaw.map((s: Record<string, unknown>) => ({
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
      patient: s.patient_id ? { id: s.patient_id, name: s.patient_name } : null,
      area: s.area_id ? { id: s.area_id, name: s.area_name } : null,
      machine: s.machine_id ? { id: s.machine_id, name: s.machine_name } : null,
    }))

    // Packages near completion (1-2 sessions remaining)
    const { rows: nearCompletionRaw } = await query(`
      SELECT lpa.*,
        p."id" AS "patient_id", p."name" AS "patient_name",
        a."id" AS "area_id", a."name" AS "area_name"
      FROM "LaserPackage" lpa
      LEFT JOIN "Patient" p ON lpa."patientId" = p."id"
      LEFT JOIN "LaserArea" a ON lpa."areaId" = a."id"
      WHERE lpa."status" = 'active' AND lpa."remainingSessions" <= 2 AND lpa."remainingSessions" > 0
    `)

    const nearCompletionPackages = nearCompletionRaw.map((pkg: Record<string, unknown>) => ({
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
      patient: pkg.patient_id ? { id: pkg.patient_id, name: pkg.patient_name } : null,
      area: pkg.area_id ? { id: pkg.area_id, name: pkg.area_name } : null,
    }))

    return NextResponse.json({
      sessionsToday,
      sessionsMonth,
      revenueMonth,
      revenueToday,
      activeProfiles,
      activePackages,
      totalMachines,
      popularAreas: popularAreasFormatted,
      todaySessions,
      nearCompletionPackages,
    })
  } catch (error) {
    console.error('GET /api/laser-v2/dashboard error:', error)
    return NextResponse.json({ error: 'خطأ في جلب الإحصائيات' }, { status: 500 })
  }
}
