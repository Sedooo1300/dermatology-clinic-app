import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { category, amount, description, date } = body

    const result = await query(
      `UPDATE "Expense"
       SET category = $1, amount = $2, description = $3, date = $4, "updatedAt" = $5
       WHERE id = $6
       RETURNING *`,
      [
        category?.trim() || undefined,
        amount !== undefined ? parseFloat(amount) : undefined,
        description?.trim() || null,
        date ? new Date(date) : undefined,
        new Date(),
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
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

    const result = await query(
      `DELETE FROM "Expense" WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'المصروف غير موجود' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف المصروف' }, { status: 500 })
  }
}
