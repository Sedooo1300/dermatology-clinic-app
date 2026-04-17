import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.backup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/backups/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف النسخة الاحتياطية' }, { status: 500 })
  }
}
