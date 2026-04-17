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

    const expense = await db.expense.update({
      where: { id },
      data: {
        category: category?.trim() || undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        description: description?.trim() || null,
        date: date ? new Date(date) : undefined,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل المصروف' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف المصروف' }, { status: 500 })
  }
}
