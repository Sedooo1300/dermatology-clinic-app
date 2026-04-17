import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')

    const sql = `
      SELECT
        p.*,
        "patient"."id" AS "patientId",
        "patient"."name" AS "patientName",
        "patient"."phone" AS "patientPhone",
        COALESCE(
          json_agg(
            json_build_object(
              'id', pi."id",
              'prescriptionId', pi."prescriptionId",
              'medicineName', pi."medicineName",
              'dosage', pi."dosage",
              'frequency', pi."frequency",
              'duration', pi."duration",
              'instructions', pi."instructions",
              'quantity', pi."quantity",
              'createdAt', pi."createdAt"
            ) ORDER BY pi."id" ASC
          ) FILTER (WHERE pi."id" IS NOT NULL),
          '[]'::json
        ) AS "items",
        json_build_object(
          'id', "patient"."id",
          'name', "patient"."name",
          'phone', "patient"."phone"
        ) AS "patient"
      FROM "Prescription" p
      LEFT JOIN "Patient" "patient" ON "patient"."id" = p."patientId"
      LEFT JOIN "PrescriptionItem" pi ON pi."prescriptionId" = p."id"
      ${patientId ? 'WHERE p."patientId" = $1' : ''}
      GROUP BY p."id", "patient"."id", "patient"."name", "patient"."phone"
      ORDER BY p."createdAt" DESC
    `

    const result = await query(sql, patientId ? [patientId] : [])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch prescriptions:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, visitId, diagnosis, notes, items } = body

    if (!patientId || !items || items.length === 0) {
      return NextResponse.json({ error: 'patientId and items are required' }, { status: 400 })
    }

    const id = uuid()

    await query(
      `INSERT INTO "Prescription" ("id", "patientId", "visitId", "diagnosis", "notes", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [id, patientId, visitId || null, diagnosis || null, notes || null]
    )

    for (const item of items) {
      const itemId = uuid()
      await query(
        `INSERT INTO "PrescriptionItem" ("id", "prescriptionId", "medicineName", "dosage", "frequency", "duration", "instructions", "quantity", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          itemId,
          id,
          item.medicineName,
          item.dosage || null,
          item.frequency || null,
          item.duration || null,
          item.instructions || null,
          item.quantity || null,
        ]
      )
    }

    const result = await query(
      `SELECT p.*, json_build_object('name', "patient"."name") AS "patient"
       FROM "Prescription" p
       LEFT JOIN "Patient" "patient" ON "patient"."id" = p."patientId"
       WHERE p."id" = $1`,
      [id]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Failed to create prescription:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
