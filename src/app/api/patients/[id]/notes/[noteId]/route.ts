import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { noteId } = await params
    const result = await query(
      `DELETE FROM "PatientNote" WHERE "id" = $1 RETURNING id`,
      [noteId]
    )
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/patients/[id]/notes/[noteId] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف الملاحظة' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const { noteId } = await params
    const body = await req.json()
    const { content, category } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'محتوى الملاحظة مطلوب' }, { status: 400 })
    }

    const note = await query(
      `UPDATE "PatientNote" SET "content" = $1, "category" = $2 WHERE "id" = $3 RETURNING *`,
      [content.trim(), category || 'general', noteId]
    )

    if (note.rows.length === 0) {
      return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json(note.rows[0])
  } catch (error) {
    console.error('PUT /api/patients/[id]/notes/[noteId] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل الملاحظة' }, { status: 500 })
  }
}
