import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const prescription = await queryOne(
      `SELECT p.*,
        json_build_object(
          'id', "patient"."id",
          'name', "patient"."name",
          'phone', "patient"."phone",
          'age', "patient"."age",
          'gender', "patient"."gender"
        ) AS "patient"
       FROM "Prescription" p
       LEFT JOIN "Patient" "patient" ON "patient"."id" = p."patientId"
       WHERE p."id" = $1`,
      [id]
    )

    if (!prescription) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const itemsResult = await query(
      `SELECT * FROM "PrescriptionItem" WHERE "prescriptionId" = $1 ORDER BY "id" ASC`,
      [id]
    )

    return NextResponse.json({ ...prescription, items: itemsResult.rows })
  } catch (error) {
    console.error('Failed to fetch prescription:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { diagnosis, notes, items } = body

    await query(
      `UPDATE "Prescription" SET
        "diagnosis" = COALESCE($1, "diagnosis"),
        "notes" = COALESCE($2, "notes"),
        "updatedAt" = NOW()
       WHERE "id" = $3`,
      [diagnosis ?? null, notes ?? null, id]
    )

    if (items && Array.isArray(items)) {
      await query(`DELETE FROM "PrescriptionItem" WHERE "prescriptionId" = $1`, [id])

      for (const item of items) {
        await query(
          `INSERT INTO "PrescriptionItem" ("id", "prescriptionId", "medicineName", "dosage", "frequency", "duration", "instructions", "quantity", "createdAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
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
    }

    const itemsResult = await query(
      `SELECT * FROM "PrescriptionItem" WHERE "prescriptionId" = $1 ORDER BY "id" ASC`,
      [id]
    )

    const updated = await queryOne(
      `SELECT p.*, json_build_object('name', "patient"."name") AS "patient"
       FROM "Prescription" p
       LEFT JOIN "Patient" "patient" ON "patient"."id" = p."patientId"
       WHERE p."id" = $1`,
      [id]
    )

    return NextResponse.json({ ...updated, items: itemsResult.rows })
  } catch (error) {
    console.error('Failed to update prescription:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "PrescriptionItem" WHERE "prescriptionId" = $1`, [id])
    await query(`DELETE FROM "Prescription" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete prescription:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
