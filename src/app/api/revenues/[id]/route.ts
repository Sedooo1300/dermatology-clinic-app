import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { category, amount, description, date } = body

    const revenue = await db.revenue.update({
      where: { id },
      data: {
        category: category?.trim() || undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        description: description?.trim() || null,
        date: date ? new Date(date) : undefined,
      },
    })

    return NextResponse.json(revenue)
  } catch (error) {
    console.error('PUT /api/revenues/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الإيراد' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.revenue.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/revenues/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الإيراد' }, { status: 500 })
  }
}
