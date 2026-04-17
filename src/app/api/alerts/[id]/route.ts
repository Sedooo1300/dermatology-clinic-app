import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { title, message, type, priority, isRead, snoozedUntil } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title.trim()
    if (message !== undefined) updateData.message = message.trim()
    if (type !== undefined) updateData.type = type
    if (priority !== undefined) updateData.priority = priority
    if (isRead !== undefined) updateData.isRead = Boolean(isRead)
    if (snoozedUntil !== undefined) updateData.snoozedUntil = snoozedUntil ? new Date(snoozedUntil) : null

    const alert = await db.alert.update({
      where: { id },
      data: updateData,
      include: {
        patient: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(alert)
  } catch (error) {
    console.error('PUT /api/alerts/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل التنبيه' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.alert.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/alerts/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف التنبيه' }, { status: 500 })
  }
}
