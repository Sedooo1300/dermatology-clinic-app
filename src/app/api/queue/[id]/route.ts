import { query, queryOne } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, priority, notes } = body

    const sets: string[] = []
    const paramsList: unknown[] = []
    let paramIndex = 1

    if (status !== undefined) {
      sets.push(`"status" = $${paramIndex++}`)
      paramsList.push(status)
    }
    if (priority !== undefined) {
      sets.push(`"priority" = $${paramIndex++}`)
      paramsList.push(priority)
    }
    if (notes !== undefined) {
      sets.push(`"notes" = $${paramIndex++}`)
      paramsList.push(notes)
    }
    if (status === 'in-progress') {
      sets.push(`"startedAt" = $${paramIndex++}`)
      paramsList.push(new Date().toISOString())
    }
    if (status === 'completed') {
      sets.push(`"completedAt" = $${paramIndex++}`)
      paramsList.push(new Date().toISOString())
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    paramsList.push(id)

    const result = await query(
      `UPDATE "QueueEntry" SET ${sets.join(', ')} WHERE "id" = $${paramIndex} RETURNING *`,
      paramsList
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "QueueEntry" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
