import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, price, description, isActive } = body

    const result = await query(
      `UPDATE "SessionType"
       SET name = $1, price = $2, description = $3, "isActive" = $4, "updatedAt" = $5
       WHERE id = $6
       RETURNING *`,
      [
        name?.trim() || undefined,
        price !== undefined ? parseFloat(price) : undefined,
        description?.trim() || null,
        isActive !== undefined ? Boolean(isActive) : undefined,
        new Date(),
        id,
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'نوع الجلسة غير موجود' }, { status: 404 })
    }

    return NextResponse.json(result.rows[0])
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

    const result = await query(
      `DELETE FROM "SessionType" WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'نوع الجلسة غير موجود' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/session-types/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف نوع الجلسة' }, { status: 500 })
  }
}
