import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const {
      machineId, areaId, packageId, fluence, pulseWidth, spotSize, cooling,
      pulsesUsed, pulsesPerSecond, paymentMode, pulsePrice, totalAmount, paid,
      painLevel, hairReduction, sideEffects, skinReaction, notes, status, nextSessionDate, date,
    } = body

    const setClauses: string[] = [`"updatedAt" = CURRENT_TIMESTAMP`]
    const params: unknown[] = []

    if (machineId !== undefined) {
      setClauses.push(`"machineId" = $${params.length + 1}`)
      params.push(machineId)
    }
    if (areaId !== undefined) {
      setClauses.push(`"areaId" = $${params.length + 1}`)
      params.push(areaId)
    }
    if (packageId !== undefined) {
      setClauses.push(`"packageId" = $${params.length + 1}`)
      params.push(packageId || null)
    }
    if (fluence !== undefined) {
      setClauses.push(`"fluence" = $${params.length + 1}`)
      params.push(parseFloat(fluence))
    }
    if (pulseWidth !== undefined) {
      setClauses.push(`"pulseWidth" = $${params.length + 1}`)
      params.push(parseFloat(pulseWidth))
    }
    if (spotSize !== undefined) {
      setClauses.push(`"spotSize" = $${params.length + 1}`)
      params.push(parseFloat(spotSize))
    }
    if (cooling !== undefined) {
      setClauses.push(`"cooling" = $${params.length + 1}`)
      params.push(cooling?.trim() || null)
    }
    if (pulsesUsed !== undefined) {
      setClauses.push(`"pulsesUsed" = $${params.length + 1}`)
      params.push(parseInt(pulsesUsed))
    }
    if (pulsesPerSecond !== undefined) {
      setClauses.push(`"pulsesPerSecond" = $${params.length + 1}`)
      params.push(pulsesPerSecond ? parseInt(pulsesPerSecond) : null)
    }
    if (paymentMode !== undefined) {
      setClauses.push(`"paymentMode" = $${params.length + 1}`)
      params.push(paymentMode)
    }
    if (pulsePrice !== undefined) {
      setClauses.push(`"pulsePrice" = $${params.length + 1}`)
      params.push(parseFloat(pulsePrice))
    }
    if (totalAmount !== undefined) {
      setClauses.push(`"totalAmount" = $${params.length + 1}`)
      params.push(parseFloat(totalAmount))
    }
    if (paid !== undefined) {
      setClauses.push(`"paid" = $${params.length + 1}`)
      params.push(parseFloat(paid))
      setClauses.push(`"remaining" = $${params.length + 1}`)
      params.push((totalAmount ? parseFloat(totalAmount) : 0) - parseFloat(paid))
    }
    if (painLevel !== undefined) {
      setClauses.push(`"painLevel" = $${params.length + 1}`)
      params.push(painLevel ? parseInt(painLevel) : null)
    }
    if (hairReduction !== undefined) {
      setClauses.push(`"hairReduction" = $${params.length + 1}`)
      params.push(hairReduction !== null ? parseFloat(hairReduction) : null)
    }
    if (sideEffects !== undefined) {
      setClauses.push(`"sideEffects" = $${params.length + 1}`)
      params.push(sideEffects?.trim() || null)
    }
    if (skinReaction !== undefined) {
      setClauses.push(`"skinReaction" = $${params.length + 1}`)
      params.push(skinReaction?.trim() || null)
    }
    if (notes !== undefined) {
      setClauses.push(`"notes" = $${params.length + 1}`)
      params.push(notes?.trim() || null)
    }
    if (status !== undefined) {
      setClauses.push(`"status" = $${params.length + 1}`)
      params.push(status)
    }
    if (nextSessionDate !== undefined) {
      setClauses.push(`"nextSessionDate" = $${params.length + 1}`)
      params.push(nextSessionDate ? new Date(nextSessionDate) : null)
    }
    if (date !== undefined) {
      setClauses.push(`"date" = $${params.length + 1}`)
      params.push(date ? new Date(date) : new Date())
    }

    params.push(id)
    const sql = `UPDATE "LaserSession" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING *`
    const { rows } = await query(sql, params)

    if (!rows[0]) {
      return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404 })
    }

    const s = rows[0]

    // Fetch with includes
    const respSql = `
      SELECT ls.*,
        lp."id" AS "profile_id", lp."skinType" AS "profile_skinType",
        p."id" AS "patient_id", p."name" AS "patient_name",
        m."id" AS "machine_id", m."name" AS "machine_name", m."type" AS "machine_type",
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
    const r = respRows[0]

    const result = {
      id: r.id,
      profileId: r.profileId,
      patientId: r.patientId,
      machineId: r.machineId,
      areaId: r.areaId,
      packageId: r.packageId,
      sessionNumber: r.sessionNumber,
      date: r.date,
      fluence: r.fluence,
      pulseWidth: r.pulseWidth,
      spotSize: r.spotSize,
      cooling: r.cooling,
      pulsesUsed: r.pulsesUsed,
      pulsesPerSecond: r.pulsesPerSecond,
      paymentMode: r.paymentMode,
      pulsePrice: r.pulsePrice,
      totalAmount: r.totalAmount,
      paid: r.paid,
      remaining: r.remaining,
      painLevel: r.painLevel,
      hairReduction: r.hairReduction,
      sideEffects: r.sideEffects,
      skinReaction: r.skinReaction,
      notes: r.notes,
      status: r.status,
      nextSessionDate: r.nextSessionDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      profile: r.profile_id ? { id: r.profile_id, skinType: r.profile_skinType } : null,
      patient: r.patient_id ? { id: r.patient_id, name: r.patient_name } : null,
      machine: r.machine_id ? { id: r.machine_id, name: r.machine_name, type: r.machine_type } : null,
      area: r.area_id ? { id: r.area_id, name: r.area_name } : null,
      package: r.package_id ? { id: r.package_id, name: r.package_name } : null,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('PUT /api/laser-v2/sessions/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الجلسة' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Delete associated revenues first
    await query(`DELETE FROM "LaserRevenue" WHERE "sessionId" = $1`, [id])

    // Delete session
    await query(`DELETE FROM "LaserSession" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/sessions/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الجلسة' }, { status: 500 })
  }
}
