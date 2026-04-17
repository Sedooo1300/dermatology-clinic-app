import { query, uuid, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const sql = `
      SELECT
        q.*,
        json_build_object(
          'id', "patient"."id",
          'name', "patient"."name",
          'phone', "patient"."phone"
        ) AS "patient"
      FROM "QueueEntry" q
      LEFT JOIN "Patient" "patient" ON "patient"."id" = q."patientId"
      ${status ? 'WHERE q."status" = $1' : ''}
      ORDER BY
        CASE q."priority" WHEN 'urgent' THEN 3 WHEN 'high' THEN 2 WHEN 'normal' THEN 1 ELSE 0 END DESC,
        q."order" ASC,
        q."arrivedAt" ASC
    `

    const result = await query(sql, status ? [status] : [])

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch queue:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { patientId, patientName, visitType, notes, priority } = body

    if (!patientId || !patientName) {
      return NextResponse.json({ error: 'patientId and patientName required' }, { status: 400 })
    }

    const maxOrder = await queryOne<{ max_order: number | null }>(
      `SELECT MAX("order") as max_order FROM "QueueEntry" WHERE "status" = 'waiting'`,
      []
    )

    const id = uuid()
    await query(
      `INSERT INTO "QueueEntry" ("id", "patientId", "patientName", "visitType", "notes", "status", "priority", "arrivedAt", "order")
       VALUES ($1, $2, $3, $4, $5, 'waiting', $6, NOW(), $7)`,
      [
        id,
        patientId,
        patientName,
        visitType || null,
        notes || null,
        priority || 'normal',
        (maxOrder?.max_order || 0) + 1,
      ]
    )

    const result = await queryOne(
      `SELECT q.*, json_build_object('name', "patient"."name", 'phone', "patient"."phone") AS "patient"
       FROM "QueueEntry" q
       LEFT JOIN "Patient" "patient" ON "patient"."id" = q."patientId"
       WHERE q."id" = $1`,
      [id]
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to add to queue:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
