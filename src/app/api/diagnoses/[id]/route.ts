import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const diagnosis = await queryOne(
      `SELECT d.*, json_build_object('name', "patient"."name") AS "patient"
       FROM "Diagnosis" d
       LEFT JOIN "Patient" "patient" ON "patient"."id" = d."patientId"
       WHERE d."id" = $1`,
      [id]
    )

    if (!diagnosis) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(diagnosis)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const existing = await queryOne(`SELECT * FROM "Diagnosis" WHERE "id" = $1`, [id])
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const result = await query(
      `UPDATE "Diagnosis" SET
        "patientId" = $1,
        "visitId" = $2,
        "condition" = $3,
        "severity" = $4,
        "bodyArea" = $5,
        "icdCode" = $6,
        "notes" = $7,
        "updatedAt" = NOW()
       WHERE "id" = $8
       RETURNING *`,
      [
        body.patientId ?? existing.patientId,
        body.visitId ?? existing.visitId,
        body.condition ?? existing.condition,
        body.severity ?? existing.severity,
        body.bodyArea ?? existing.bodyArea,
        body.icdCode ?? existing.icdCode,
        body.notes ?? existing.notes,
        id,
      ]
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "Diagnosis" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
