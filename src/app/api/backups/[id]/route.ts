import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await query(`DELETE FROM "Backup" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/backups/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 })
  }
}
