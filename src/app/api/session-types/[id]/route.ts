import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, price, description, isActive } = body

    const sessionType = await db.sessionType.update({
      where: { id },
      data: {
        name: name?.trim() || undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        description: description?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    })

    return NextResponse.json(sessionType)
  } catch (error) {
    console.error('PUT /api/session-types/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل نوع الجلسة' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.sessionType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/session-types/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف نوع الجلسة' }, { status: 500 })
  }
}
