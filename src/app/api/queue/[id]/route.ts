import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, priority, notes } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (notes !== undefined) updateData.notes = notes

    if (status === 'in-progress') updateData.startedAt = new Date()
    if (status === 'completed') updateData.completedAt = new Date()

    const entry = await db.queueEntry.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(entry)
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.queueEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
