import { query } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, malePulses, femalePulses, pulsePrice, isActive } = body

    const setClauses: string[] = [`"updatedAt" = CURRENT_TIMESTAMP`]
    const params: unknown[] = []

    if (name !== undefined) {
      setClauses.push(`"name" = $${params.length + 1}`)
      params.push(name.trim())
    }
    if (malePulses !== undefined) {
      setClauses.push(`"malePulses" = $${params.length + 1}`)
      params.push(parseInt(malePulses))
    }
    if (femalePulses !== undefined) {
      setClauses.push(`"femalePulses" = $${params.length + 1}`)
      params.push(parseInt(femalePulses))
    }
    if (pulsePrice !== undefined) {
      setClauses.push(`"pulsePrice" = $${params.length + 1}`)
      params.push(parseFloat(pulsePrice))
    }
    if (isActive !== undefined) {
      setClauses.push(`"isActive" = $${params.length + 1}`)
      params.push(isActive ? true : false)
    }

    params.push(id)
    const sql = `UPDATE "LaserArea" SET ${setClauses.join(', ')} WHERE "id" = $${params.length} RETURNING *`
    const { rows } = await query(sql, params)

    if (!rows[0]) {
      return NextResponse.json({ error: 'المنطقة غير موجودة' }, { status: 404 })
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error('PUT /api/laser-v2/areas/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في تعديل المنطقة' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await query(`DELETE FROM "LaserArea" WHERE "id" = $1`, [id])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/laser-v2/areas/[id] error:', error)
    return NextResponse.json({ error: 'خطأ في حذف المنطقة' }, { status: 500 })
  }
}
