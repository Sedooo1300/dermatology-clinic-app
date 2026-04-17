import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, totalSessions, totalPulses, paid, status, expiryDate, notes } = body

    // Fetch existing package
    const pkg = await queryOne(
      `SELECT * FROM "LaserPackage" WHERE "id" = $1`,
      [id]
    )
    if (!pkg) {
      return NextResponse.json({ error: 'الباقة غير موجودة' }, { status: 404 })
    }

    const setClauses: string[] = [`"updatedAt" = CURRENT_TIMESTAMP`]
    const params: unknown[] = []

    if (name !== undefined) {
      setClauses.push(`"name" = $${params.length + 1}`)
      params.push(name.trim())
    }
    if (totalSessions !== undefined) {
      const calcTotalSessions = parseInt(totalSessions)
      setClauses.push(`"totalSessions" = $${params.length + 1}`)
      params.push(calcTotalSessions)
      setClauses.push(`"remainingSessions" = $${params.length + 1}`)
      params.push(Math.max(0, calcTotalSessions - pkg.usedSessions))
    }
    if (totalPulses !== undefined) {
      const calcTotalPulses = parseInt(totalPulses)
      setClauses.push(`"totalPulses" = $${params.length + 1}`)
      params.push(calcTotalPulses)
      setClauses.push(`"remainingPulses" = $${params.length + 1}`)
      params.push(Math.max(0, calcTotalPulses - pkg.usedPulses))
    }
    if (paid !== undefined) {
      const calcPaid = parseFloat(paid)
      setClauses.push(`"paid" = $${params.length + 1}`)
      params.push(calcPaid)
      setClauses.push(`"remaining" = $${params.length + 1}`)
      params.push(pkg.totalPrice - calcPaid)
    }
    if (status !== undefined) {
      setClauses.push(`"status" = $${params.length + 1}`)
      params.push(status)
    }
    if (expiryDate !== undefined) {
      setClauses.push(`"expiryDate" = $${params.length + 1}`)
      params.push(expiryDate ? new Date(expiryDate) : null)
    }
    if (notes !== undefined) {
      setClauses.push(`"notes" = $${params.length + 1}`)
      params.push(notes?.trim() || null)
    }

    params.push(id)
    const sql = `UPDATE "LaserPackage" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING *`
    const { rows } = await query(sql, params)

    // Fetch with includes
    const pkgRow = rows[0] as Record<string, unknown>

    const sessionsSql = `SELECT "id", "date", "status" FROM "LaserSession" WHERE "packageId" = $1 ORDER BY "date" DESC`
    const { rows: sessionRows } = await query(sessionsSql, [id])

    const respSql = `
      SELECT lpa."patientId",
        p."id" AS "patient_id", p."name" AS "patient_name",
        a."id" AS "area_id", a."name" AS "area_name"
      FROM "LaserPackage" lpa
      LEFT JOIN "Patient" p ON lpa."patientId" = p."id"
      LEFT JOIN "LaserArea" a ON lpa."areaId" = a."id"
      WHERE lpa."id" = $1
    `
    const { rows: relRows } = await query(respSql, [id])
    const rel = relRows[0]

    const result = {
      id: pkgRow.id,
      profileId: pkgRow.profileId,
      patientId: pkgRow.patientId,
      areaId: pkgRow.areaId,
      name: pkgRow.name,
      totalSessions: pkgRow.totalSessions,
      totalPulses: pkgRow.totalPulses,
      usedSessions: pkgRow.usedSessions,
      usedPulses: pkgRow.usedPulses,
      remainingSessions: pkgRow.remainingSessions,
      remainingPulses: pkgRow.remainingPulses,
      totalPrice: pkgRow.totalPrice,
      paid: pkgRow.paid,
      remaining: pkgRow.remaining,
      status: pkgRow.status,
      purchaseDate: pkgRow.purchaseDate,
      expiryDate: pkgRow.expiryDate,
      notes: pkgRow.notes,
      createdAt: pkgRow.createdAt,
      updatedAt: pkgRow.updatedAt,
      patient: rel?.patient_id ? { id: rel.patient_id, name: rel.patient_name } : null,
      area: rel?.area_id ? { id: rel.area_id, name: rel.area_name } : null,
      sessions: sessionRows,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('PUT /api/laser-v2/packages/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الباقة' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "LaserPackage" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/packages/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الباقة' }, { status: 500 })
  }
}
