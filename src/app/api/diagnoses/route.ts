import { query, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')

    const sql = `
      SELECT
        d.*,
        json_build_object(
          'id', "patient"."id",
          'name', "patient"."name"
        ) AS "patient"
      FROM "Diagnosis" d
      LEFT JOIN "Patient" "patient" ON "patient"."id" = d."patientId"
      ${patientId ? 'WHERE d."patientId" = $1' : ''}
      ORDER BY d."createdAt" DESC
    `

    const result = await query(sql, patientId ? [patientId] : [])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch diagnoses:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, visitId, condition, severity, bodyArea, icdCode, notes } = body

    if (!patientId || !condition) {
      return NextResponse.json({ error: 'patientId and condition are required' }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO "Diagnosis" ("id", "patientId", "visitId", "condition", "severity", "bodyArea", "icdCode", "notes", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [
        uuid(),
        patientId,
        visitId || null,
        condition,
        severity || 'mild',
        bodyArea || null,
        icdCode || null,
        notes || null,
      ]
    )

    const patient = await queryOne(
      `SELECT "name" FROM "Patient" WHERE "id" = $1`,
      [patientId]
    )

    return NextResponse.json({ ...result.rows[0], patient: { name: patient?.name } }, { status: 201 })
  } catch (error) {
    console.error('Failed to create diagnosis:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
