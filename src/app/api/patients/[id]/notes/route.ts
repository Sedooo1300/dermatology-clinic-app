import { query, queryOne, uuid } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const notes = await query(
      `SELECT * FROM "PatientNote" WHERE "patientId" = $1 ORDER BY "createdAt" DESC`,
      [id]
    )
    return NextResponse.json(notes.rows)
  } catch (error) {
    console.error('GET /api/patients/[id]/notes error:', error)
    return NextResponse.json({ error: 'خطأ في جلب الملاحظات' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { content, category } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'محتوى الملاحظة مطلوب' }, { status: 400 })
    }

    const note = await queryOne(
      `INSERT INTO "PatientNote" ("id", "patientId", "content", "category")
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [uuid(), id, content.trim(), category || 'general']
    )

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('POST /api/patients/[id]/notes error:', error)
    return NextResponse.json({ error: 'خطأ في إضافة الملاحظة' }, { status: 500 })
  }
}
