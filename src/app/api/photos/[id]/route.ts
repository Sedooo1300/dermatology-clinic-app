import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await query(
      `DELETE FROM "PatientPhoto" WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الصورة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/photos/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الصورة' }, { status: 500 })
  }
}
